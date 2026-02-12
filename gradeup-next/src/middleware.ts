import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
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
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // Protected dashboard routes
  if (path.startsWith('/athlete') || path.startsWith('/brand') || path.startsWith('/director')) {
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', path);
      return NextResponse.redirect(loginUrl);
    }

    // Get user role and redirect if accessing wrong dashboard
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const rolePathMap: Record<string, string> = {
      athlete: '/athlete',
      brand: '/brand',
      athletic_director: '/director',
    };

    const expectedPath = rolePathMap[profile?.role || ''];

    // Redirect user to their correct dashboard if they're accessing wrong one
    if (expectedPath && !path.startsWith(expectedPath)) {
      return NextResponse.redirect(new URL(`${expectedPath}/dashboard`, request.url));
    }
  }

  // Redirect authenticated users away from auth pages
  if ((path === '/login' || path.startsWith('/signup')) && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const redirectMap: Record<string, string> = {
      athlete: '/athlete/dashboard',
      brand: '/brand/dashboard',
      athletic_director: '/director/dashboard',
    };

    const redirectPath = redirectMap[profile?.role || ''] || '/';
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
