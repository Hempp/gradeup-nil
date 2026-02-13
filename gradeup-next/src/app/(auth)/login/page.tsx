'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToastActions } from '@/components/ui/toast';
import { useFormValidation, validators } from '@/lib/utils/validation';
import { getSupabaseClient } from '@/lib/supabase/client';
import { signIn, type UserRole } from '@/lib/services/auth';

/**
 * Get the appropriate dashboard path based on user role
 */
function getDashboardPath(role: UserRole): string {
  switch (role) {
    case 'athlete':
      return '/athlete/dashboard';
    case 'brand':
      return '/brand/dashboard';
    case 'athletic_director':
      return '/director/dashboard';
    case 'admin':
      return '/admin/dashboard';
    default:
      return '/athlete/dashboard';
  }
}

interface LoginFormValues {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const toast = useToastActions();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  // Focus and scroll to error message when it appears for accessibility
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.focus();
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

  const {
    values,
    errors: fieldErrors,
    touched,
    handleChange,
    handleBlur,
    validate,
  } = useFormValidation<LoginFormValues>(
    { email: '', password: '' },
    {
      email: [validators.required, validators.email],
      password: [validators.required],
    }
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setRememberMe(checked);
    } else {
      handleChange(name as keyof LoginFormValues, value);
    }
    if (error) setError(null);
  };

  const handleFieldBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    handleBlur(e.target.name as keyof LoginFormValues);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields before submission
    if (!validate()) {
      toast.error('Validation Error', 'Please fill in all required fields correctly.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await signIn(values.email, values.password);

      if (authError || !data) {
        const message = authError?.message || 'Failed to sign in';
        setError(message);
        toast.error('Login Failed', message);
        return;
      }

      toast.success('Welcome Back', 'You have successfully signed in.');
      // Redirect based on user role
      const dashboardPath = getDashboardPath(data.user.role);
      router.push(dashboardPath);
    } catch {
      setError('An unexpected error occurred. Please try again.');
      toast.error('Login Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        setError(authError.message);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="animate-fade-in bg-[var(--marketing-gray-900)]/80 backdrop-blur-xl border border-white/10 shadow-2xl">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl font-bold text-white">
          Welcome Back
        </CardTitle>
        <CardDescription className="text-white/60">
          Sign in to your GradeUp account
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error Message */}
          {error && (
            <div
              ref={errorRef}
              role="alert"
              tabIndex={-1}
              className="p-3 rounded-lg bg-red-500/20 text-red-400 text-sm border border-red-500/30 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-black"
            >
              {error}
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-white/80"
            >
              Email Address
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={values.email}
              onChange={handleInputChange}
              onBlur={handleFieldBlur}
              disabled={isLoading}
              error={!!(touched.email && fieldErrors.email)}
              aria-invalid={!!(touched.email && fieldErrors.email)}
              aria-describedby={touched.email && fieldErrors.email ? 'email-error' : undefined}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-[var(--marketing-cyan)] focus:ring-[var(--marketing-cyan)]/20"
              icon={
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white/40"
                >
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              }
            />
            {touched.email && fieldErrors.email && (
              <p id="email-error" className="text-xs text-red-400">{fieldErrors.email}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-white/80"
            >
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={values.password}
              onChange={handleInputChange}
              onBlur={handleFieldBlur}
              disabled={isLoading}
              error={!!(touched.password && fieldErrors.password)}
              aria-invalid={!!(touched.password && fieldErrors.password)}
              aria-describedby={touched.password && fieldErrors.password ? 'password-error' : undefined}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-[var(--marketing-cyan)] focus:ring-[var(--marketing-cyan)]/20"
              icon={
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white/40"
                >
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              }
            />
            {touched.password && fieldErrors.password && (
              <p id="password-error" className="text-xs text-red-400">{fieldErrors.password}</p>
            )}
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="rememberMe"
                checked={rememberMe}
                onChange={handleInputChange}
                disabled={isLoading}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-[var(--marketing-cyan)] focus:ring-[var(--marketing-cyan)] focus:ring-offset-0 focus:ring-offset-black"
              />
              <span className="text-sm text-white/60">
                Remember me
              </span>
            </label>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-[var(--marketing-cyan)] hover:text-[var(--marketing-lime)] transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          {/* Sign In Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            disabled={isLoading}
            className="w-full bg-[var(--marketing-cyan)] hover:bg-[var(--marketing-cyan)]/90 text-black font-semibold"
          >
            Sign In
          </Button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[var(--marketing-gray-900)] text-white/40">
                Or continue with
              </span>
            </div>
          </div>

          {/* Social Login Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => handleSocialLogin('google')}
              disabled={isLoading}
              className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                className="mr-2"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => handleSocialLogin('apple')}
              disabled={isLoading}
              className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="mr-2"
              >
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Apple
            </Button>
          </div>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-white/60 mt-6">
            Don&apos;t have an account?{' '}
            <Link
              href="/signup"
              className="font-semibold text-[var(--marketing-cyan)] hover:text-[var(--marketing-lime)] transition-colors"
            >
              Sign up
            </Link>
          </p>

          {/* Demo Mode Section */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-center text-xs text-white/40 mb-4 uppercase tracking-wider font-medium">
              Demo Mode - Quick Access
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => router.push('/athlete/dashboard')}
                disabled={isLoading}
                className="px-3 py-2 text-xs font-medium rounded-lg bg-[var(--marketing-cyan)]/10 text-[var(--marketing-cyan)] border border-[var(--marketing-cyan)]/20 hover:bg-[var(--marketing-cyan)]/20 hover:border-[var(--marketing-cyan)]/40 transition-all disabled:opacity-50"
              >
                Athlete
              </button>
              <button
                type="button"
                onClick={() => router.push('/brand/dashboard')}
                disabled={isLoading}
                className="px-3 py-2 text-xs font-medium rounded-lg bg-[var(--marketing-lime)]/10 text-[var(--marketing-lime)] border border-[var(--marketing-lime)]/20 hover:bg-[var(--marketing-lime)]/20 hover:border-[var(--marketing-lime)]/40 transition-all disabled:opacity-50"
              >
                Brand
              </button>
              <button
                type="button"
                onClick={() => router.push('/director/dashboard')}
                disabled={isLoading}
                className="px-3 py-2 text-xs font-medium rounded-lg bg-[var(--marketing-magenta)]/10 text-[var(--marketing-magenta)] border border-[var(--marketing-magenta)]/20 hover:bg-[var(--marketing-magenta)]/20 hover:border-[var(--marketing-magenta)]/40 transition-all disabled:opacity-50"
              >
                Director
              </button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
