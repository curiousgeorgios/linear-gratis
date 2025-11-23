import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyCustomDomain } from '@/lib/cloudflare';

export const runtime = 'edge';

// POST - Verify a custom domain using Cloudflare DNS API
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ domainId: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from auth header
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { domainId } = await params;

    // Fetch domain
    const { data: domain, error: fetchError } = await supabase
      .from('custom_domains')
      .select('*')
      .eq('id', domainId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    try {
      // Verify DNS records using Cloudflare API
      const targetDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'linear.gratis';

      const verificationResult = await verifyCustomDomain(
        domain.domain,
        domain.verification_token,
        targetDomain
      );

      if (verificationResult.success) {
        // Update domain status to verified
        const updateData: {
          verification_status: 'verified';
          verified_at: string;
          last_checked_at: string;
          error_message: null;
          ssl_status?: 'active' | 'pending';
          ssl_issued_at?: string;
        } = {
          verification_status: 'verified',
          verified_at: new Date().toISOString(),
          last_checked_at: new Date().toISOString(),
          error_message: null,
        };

        // Update SSL status if available
        if (verificationResult.sslActive) {
          updateData.ssl_status = 'active';
          updateData.ssl_issued_at = new Date().toISOString();
        }

        const { data: updated, error: updateError } = await supabase
          .from('custom_domains')
          .update(updateData)
          .eq('id', domainId)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        return NextResponse.json({
          domain: updated,
          success: true,
          message: 'Domain verified successfully! SSL certificate is ' +
                   (verificationResult.sslActive ? 'active' : 'being provisioned'),
          details: {
            cnameVerified: verificationResult.cnameVerified,
            txtVerified: verificationResult.txtVerified,
            sslActive: verificationResult.sslActive,
          },
        });
      } else {
        // Verification failed - update with error details
        const errorMessage = verificationResult.errors.length > 0
          ? verificationResult.errors.join('; ')
          : 'DNS records not found or incorrect. Please check your DNS settings.';

        await supabase
          .from('custom_domains')
          .update({
            verification_status: 'failed',
            last_checked_at: new Date().toISOString(),
            error_message: errorMessage,
          })
          .eq('id', domainId);

        return NextResponse.json({
          success: false,
          message: 'DNS verification failed',
          details: {
            cnameVerified: verificationResult.cnameVerified,
            txtVerified: verificationResult.txtVerified,
            sslActive: verificationResult.sslActive,
            errors: verificationResult.errors,
          },
        }, { status: 400 });
      }
    } catch (verificationError) {
      console.error('Verification error:', verificationError);

      const errorMessage = verificationError instanceof Error
        ? verificationError.message
        : 'Verification failed. Please try again later.';

      await supabase
        .from('custom_domains')
        .update({
          verification_status: 'failed',
          last_checked_at: new Date().toISOString(),
          error_message: errorMessage,
        })
        .eq('id', domainId);

      return NextResponse.json({
        success: false,
        message: 'Verification error occurred',
        error: errorMessage,
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in POST /api/domains/[domainId]/verify:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
