import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { lookupCustomDomain } from '@/lib/edge-db';

async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session - this extends the session if it's about to expire
  await supabase.auth.getUser();

  return supabaseResponse;
}

export async function middleware(request: NextRequest) {
  // Refresh Supabase auth session first
  const response = await updateSession(request);

  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl;

  // Skip custom domain logic for API routes, static files, and Next.js internals
  // (but still return the response with refreshed session cookies)
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/static/') ||
    url.pathname.includes('.') // Skip files with extensions
  ) {
    return response;
  }

  // Check if this is a custom domain (not the main domain)
  const mainDomains = [
    'linear.gratis',
    'localhost:3000',
    'localhost',
    'workers.dev', // Cloudflare Workers dev domains
    process.env.NEXT_PUBLIC_APP_DOMAIN || '',
  ].filter(Boolean);

  const isMainDomain = mainDomains.some((domain) => hostname.includes(domain));

  // If it's not the main domain, check if it's a verified custom domain
  if (!isMainDomain) {
    try {
      // Look up the domain directly from the database (no internal fetch)
      const result = await lookupCustomDomain(hostname);

      if (result.success) {
        const { domain } = result;

        // Rewrite to the target route based on type
        if (domain.target_type === 'form' && domain.target_slug) {
          const rewriteUrl = new URL(`/form/${domain.target_slug}`, request.url);
          // Preserve query parameters
          url.searchParams.forEach((value, key) => {
            rewriteUrl.searchParams.set(key, value);
          });
          return NextResponse.rewrite(rewriteUrl);
        } else if (domain.target_type === 'view' && domain.target_slug) {
          const rewriteUrl = new URL(`/view/${domain.target_slug}`, request.url);
          // Preserve query parameters
          url.searchParams.forEach((value, key) => {
            rewriteUrl.searchParams.set(key, value);
          });
          return NextResponse.rewrite(rewriteUrl);
        } else if (domain.target_type === 'roadmap' && domain.target_slug) {
          const rewriteUrl = new URL(`/roadmap/${domain.target_slug}`, request.url);
          // Preserve query parameters
          url.searchParams.forEach((value, key) => {
            rewriteUrl.searchParams.set(key, value);
          });
          return NextResponse.rewrite(rewriteUrl);
        }
      } else if ('notFound' in result && result.notFound) {
        // Domain not found - show error page
        return new NextResponse(
          'This domain is not registered with our service.',
          { status: 404 }
        );
      } else {
        // Lookup error
        console.error('Domain lookup error:', result.error);
        return new NextResponse(
          'An error occurred while processing this domain.',
          { status: 500 }
        );
      }

      // If domain found but no target configured, let the request through
      return response;
    } catch (error) {
      console.error('Custom domain middleware error:', error);
      // On error, show a generic error page rather than exposing the app
      return new NextResponse(
        'An error occurred while processing this domain.',
        { status: 500 }
      );
    }
  }

  // Main domain - process normally
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
