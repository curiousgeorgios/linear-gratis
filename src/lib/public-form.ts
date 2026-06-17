import { supabaseAdmin } from '@/lib/supabase';
import { decryptAndRotateTokenIfNeeded } from '@/lib/encryption-rotation';
import { getActiveConnectionIdForOrg, getTokenForConnection } from '@/lib/linear-connection';

export type PublicFormLinearTokenLookup = {
  id: string;
  user_id?: string | null;
  organisation_id?: string | null;
  linear_connection_id?: string | null;
};

export async function resolveLinearTokenForForm(
  form: PublicFormLinearTokenLookup,
): Promise<string | null> {
  if (form.linear_connection_id) {
    return getTokenForConnection(form.linear_connection_id);
  }

  const connectionId = form.organisation_id
    ? await getActiveConnectionIdForOrg(supabaseAdmin, form.organisation_id)
    : null;
  if (connectionId) {
    await supabaseAdmin
      .from('customer_request_forms')
      .update({ linear_connection_id: connectionId })
      .eq('id', form.id)
      .is('linear_connection_id', null);

    return getTokenForConnection(connectionId);
  }

  if (!form.user_id) return null;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('linear_api_token')
    .eq('id', form.user_id)
    .single();

  if (!profile?.linear_api_token) return null;

  try {
    return await decryptAndRotateTokenIfNeeded(profile.linear_api_token, {
      userId: form.user_id,
      admin: supabaseAdmin,
    });
  } catch {
    return null;
  }
}
