import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Demo login endpoint - sets demo_role cookie for dashboard access
 *
 * WARNING: This endpoint is for development/demo purposes only.
 * It bypasses real authentication by setting a demo_role cookie.
 *
 * @param request - The incoming request with role query parameter
 * @returns Redirect to the appropriate dashboard
 */
export async function GET(request: NextRequest) {
  // Only allow in demo mode (non-production)
  const isDemoEnabled =
    process.env.ENABLE_DEMO_MODE === 'true' && process.env.NODE_ENV !== 'production';

  if (!isDemoEnabled) {
    return NextResponse.json(
      { error: 'Demo mode is not enabled' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');

  const validRoles = ['athlete', 'brand', 'director', 'admin'];
  if (!role || !validRoles.includes(role)) {
    return NextResponse.json(
      { error: 'Invalid role. Must be one of: athlete, brand, director, admin' },
      { status: 400 }
    );
  }

  const dashboardMap: Record<string, string> = {
    athlete: '/athlete/dashboard',
    brand: '/brand/dashboard',
    director: '/director/dashboard',
    admin: '/admin',
  };

  const redirectPath = dashboardMap[role];
  const response = NextResponse.redirect(new URL(redirectPath, request.url));

  // Set the demo_role cookie (expires in 24 hours)
  response.cookies.set('demo_role', role, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });

  return response;
}
