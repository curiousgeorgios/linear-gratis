import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { lookupCustomDomain } from '@/lib/edge-db';

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl;

  // Skip middleware for API routes, static files, and Next.js internals
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/static/') ||
    url.pathname.includes('.') // Skip files with extensions
  ) {
    return NextResponse.next();
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
      return NextResponse.next();
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
  return NextResponse.next();
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
