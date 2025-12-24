import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import {
  getCustomHostname,
  addCustomHostname,
  type CloudflareCustomHostnameResult,
} from '@/lib/dns';

// POST - Verify a custom domain using DNS over HTTPS
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

    // Fetch domain using admin client to bypass RLS
    const { data: initialDomain, error: fetchError } = await supabaseAdmin
      .from('custom_domains')
      .select('*')
      .eq('id', domainId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !initialDomain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    // Use let so we can update if needed after Cloudflare registration
    let domain = initialDomain;

    try {
      const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'linear.gratis';

      // If no Cloudflare hostname ID, something went wrong during creation - try to create now
      if (!domain.cloudflare_hostname_id) {
        const cloudflareResult = await addCustomHostname(domain.domain);

        if (!cloudflareResult.success) {
          return NextResponse.json({
            success: false,
            message: 'Failed to register domain with Cloudflare. Please try again.',
            error: cloudflareResult.error,
          }, { status: 500 });
        }

        // Build DNS records from the new response
        const dns_records: Array<{ type: string; name: string; value: string; purpose: string }> = [
          { type: 'CNAME', name: domain.domain, value: appDomain, purpose: 'routing' },
        ];

        if (cloudflareResult.ownershipVerification) {
          dns_records.push({
            type: 'TXT',
            name: cloudflareResult.ownershipVerification.name,
            value: cloudflareResult.ownershipVerification.value,
            purpose: 'ownership',
          });
        }

        // Update with the new Cloudflare data
        await supabaseAdmin
          .from('custom_domains')
          .update({
            cloudflare_hostname_id: cloudflareResult.hostnameId,
            cloudflare_hostname_status: cloudflareResult.hostnameStatus,
            dns_records,
            last_checked_at: new Date().toISOString(),
          })
          .eq('id', domainId);

        // Refresh domain data
        const { data: refreshed } = await supabaseAdmin
          .from('custom_domains')
          .select('*')
          .eq('id', domainId)
          .single();

        if (refreshed) {
          domain = refreshed;
        }
      }

      // Poll Cloudflare for current hostname status
      const cloudflareStatus = await getCustomHostname(domain.cloudflare_hostname_id!);

      if (!cloudflareStatus.success || !cloudflareStatus.hostname) {
        return NextResponse.json({
          success: false,
          message: 'Failed to check domain status with Cloudflare',
          error: cloudflareStatus.error,
        }, { status: 500 });
      }

      const cfHostname = cloudflareStatus.hostname;

      // Map Cloudflare status to our status
      let verificationStatus: 'pending' | 'verified' | 'failed' = 'pending';
      let sslStatus: 'pending' | 'active' | 'failed' = 'pending';

      // Hostname status: pending → user needs to add DNS records, active → verified
      if (cfHostname.status === 'active') {
        verificationStatus = 'verified';
      } else if (cfHostname.status === 'pending') {
        verificationStatus = 'pending';
      } else {
        verificationStatus = 'failed';
      }

      // SSL status mapping
      if (cfHostname.ssl.status === 'active') {
        sslStatus = 'active';
      } else if (['pending_validation', 'pending_issuance', 'pending_deployment', 'initializing'].includes(cfHostname.ssl.status)) {
        sslStatus = 'pending';
      } else if (['expired', 'deleted'].includes(cfHostname.ssl.status)) {
        sslStatus = 'failed';
      }

      // Update DNS records if Cloudflare has new/updated validation records
      const updatedDnsRecords: Array<{ type: string; name: string; value: string; purpose: string }> = [
        { type: 'CNAME', name: domain.domain, value: appDomain, purpose: 'routing' },
      ];

      if (cfHostname.ownership_verification) {
        updatedDnsRecords.push({
          type: 'TXT',
          name: cfHostname.ownership_verification.name,
          value: cfHostname.ownership_verification.value,
          purpose: 'ownership',
        });
      }

      if (cfHostname.ssl.validation_records) {
        for (const record of cfHostname.ssl.validation_records) {
          if (record.txt_name && record.txt_value) {
            updatedDnsRecords.push({
              type: 'TXT',
              name: record.txt_name,
              value: record.txt_value,
              purpose: 'ssl',
            });
          }
        }
      }

      // Build update data
      const updateData: {
        verification_status: 'pending' | 'verified' | 'failed';
        ssl_status: 'pending' | 'active' | 'failed';
        cloudflare_hostname_status: CloudflareCustomHostnameResult['status'];
        dns_records: typeof updatedDnsRecords;
        last_checked_at: string;
        error_message: string | null;
        verified_at?: string;
        ssl_issued_at?: string;
      } = {
        verification_status: verificationStatus,
        ssl_status: sslStatus,
        cloudflare_hostname_status: cfHostname.status,
        dns_records: updatedDnsRecords,
        last_checked_at: new Date().toISOString(),
        error_message: null,
      };

      // Set timestamps on status changes
      if (verificationStatus === 'verified' && domain.verification_status !== 'verified') {
        updateData.verified_at = new Date().toISOString();
      }
      if (sslStatus === 'active' && domain.ssl_status !== 'active') {
        updateData.ssl_issued_at = new Date().toISOString();
      }

      // Add error message if still pending
      if (verificationStatus === 'pending') {
        const pendingReasons: string[] = [];
        if (cfHostname.status === 'pending') {
          pendingReasons.push('Waiting for DNS records to propagate');
        }
        if (cfHostname.ssl.status !== 'active') {
          pendingReasons.push(`SSL status: ${cfHostname.ssl.status}`);
        }
        if (cfHostname.ssl.validation_errors?.length) {
          pendingReasons.push(...cfHostname.ssl.validation_errors.map(e => e.message));
        }
        updateData.error_message = pendingReasons.join('. ') || null;
      }

      // Update database
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('custom_domains')
        .update(updateData)
        .eq('id', domainId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Return appropriate response
      const isVerified = verificationStatus === 'verified';
      const sslMessage = sslStatus === 'active'
        ? 'SSL certificate is active.'
        : sslStatus === 'pending'
          ? 'SSL certificate is being provisioned.'
          : 'SSL certificate provisioning failed.';

      return NextResponse.json({
        domain: updated,
        success: isVerified,
        message: isVerified
          ? `Domain verified! ${sslMessage}`
          : `Domain verification in progress. Please ensure DNS records are configured correctly. ${updateData.error_message || ''}`,
        details: {
          cloudflareHostnameStatus: cfHostname.status,
          cloudflareSSLStatus: cfHostname.ssl.status,
          verificationStatus,
          sslStatus,
        },
      }, { status: isVerified ? 200 : 202 });
    } catch (verificationError) {
      console.error('Verification error:', verificationError);

      const errorMessage = verificationError instanceof Error
        ? verificationError.message
        : 'Verification failed. Please try again later.';

      await supabaseAdmin
        .from('custom_domains')
        .update({
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
