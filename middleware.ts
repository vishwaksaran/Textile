import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const PUBLIC_ADMIN_PATHS = ['/admin/login', '/admin/auth'];

/**
 * Refreshes the Supabase session cookie on every request and keeps signed-out
 * visitors out of /admin. Membership of the `admins` table is checked again on
 * the server for each admin page and API route — this is only the first gate.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
  const isPublicAdminPath = PUBLIC_ADMIN_PATHS.some((p) =>
    request.nextUrl.pathname.startsWith(p),
  );

  // Without Supabase there is no auth to enforce; the admin pages render an
  // explanatory setup screen instead of pretending to be secure.
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isAdminRoute && !isPublicAdminPath && !user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = '/admin/login';
    redirect.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(redirect);
  }

  if (request.nextUrl.pathname === '/admin/login' && user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = '/admin';
    redirect.search = '';
    return NextResponse.redirect(redirect);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files — the session cookie
     * needs refreshing on page requests, not on /_next/static.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)',
  ],
};
