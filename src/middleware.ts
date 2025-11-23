import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
    process.env.NEXT_PUBLIC_APP_DOMAIN || '',
  ].filter(Boolean);

  const isMainDomain = mainDomains.some((domain) => hostname.includes(domain));

  // If it's not the main domain, check if it's a verified custom domain
  if (!isMainDomain) {
    try {
      // Look up the domain in the database via API
      const lookupUrl = new URL('/api/domains/lookup', request.url);
      lookupUrl.searchParams.set('domain', hostname);

      const response = await fetch(lookupUrl.toString(), {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json() as {
          domain: {
            verification_status: string;
            is_active: boolean;
            target_type: 'form' | 'view';
            target_slug: string;
          };
        };

        const { domain } = data;

        // Only rewrite if domain is verified and active
        if (domain.verification_status === 'verified' && domain.is_active) {
          // Rewrite to the target route based on type
          if (domain.target_type === 'form') {
            const rewriteUrl = new URL(`/form/${domain.target_slug}`, request.url);
            // Preserve query parameters
            url.searchParams.forEach((value, key) => {
              rewriteUrl.searchParams.set(key, value);
            });
            return NextResponse.rewrite(rewriteUrl);
          } else if (domain.target_type === 'view') {
            const rewriteUrl = new URL(`/view/${domain.target_slug}`, request.url);
            // Preserve query parameters
            url.searchParams.forEach((value, key) => {
              rewriteUrl.searchParams.set(key, value);
            });
            return NextResponse.rewrite(rewriteUrl);
          }
        } else {
          // Domain not verified or not active
          return new NextResponse(
            'Domain not verified or inactive. Please contact the domain owner.',
            { status: 403 }
          );
        }
      } else if (response.status === 404) {
        // Domain not found - show error page
        return new NextResponse(
          'This domain is not registered with our service.',
          { status: 404 }
        );
      }

      // If lookup fails for other reasons, let the request through
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
