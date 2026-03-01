import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * OAuth callback handler for Supabase authentication
 *
 * This route handles the OAuth redirect from providers like Google and Apple.
 * It exchanges the authorization code for a session and redirects the user
 * to their appropriate dashboard based on their role.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Fetch the user's profile to determine their role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      // If profile doesn't exist (new OAuth user), create one
      if (!profile) {
        const userMetadata = data.user.user_metadata;
        const role = userMetadata?.role || 'athlete';

        // Create profile for new OAuth user
        await supabase.from('profiles').insert({
          id: data.user.id,
          email: data.user.email,
          role: role,
          first_name: userMetadata?.full_name?.split(' ')[0] || userMetadata?.name?.split(' ')[0] || null,
          last_name: userMetadata?.full_name?.split(' ').slice(1).join(' ') || null,
          avatar_url: userMetadata?.avatar_url || userMetadata?.picture || null,
        });

        // Redirect to role selection or onboarding
        return NextResponse.redirect(`${origin}/signup?oauth=true`);
      }

      // Redirect based on role
      const roleRedirectMap: Record<string, string> = {
        athlete: '/athlete/dashboard',
        brand: '/brand/dashboard',
        athletic_director: '/director/dashboard',
        admin: '/admin',
      };

      const redirectPath = roleRedirectMap[profile.role] || next;
      return NextResponse.redirect(`${origin}${redirectPath}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
