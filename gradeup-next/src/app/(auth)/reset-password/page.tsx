'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToastActions } from '@/components/ui/toast';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const toast = useToastActions();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isValidSession, setIsValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Check for valid recovery session on mount
  useEffect(() => {
    const checkSession = async () => {
      const supabase = getSupabaseClient();

      // Get the current session - Supabase automatically handles the recovery token from URL
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Session error:', sessionError);
        setError('Invalid or expired reset link. Please request a new one.');
        setIsCheckingSession(false);
        return;
      }

      if (session) {
        setIsValidSession(true);
      } else {
        // Listen for auth state change (recovery token processing)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === 'PASSWORD_RECOVERY' && session) {
              setIsValidSession(true);
              setIsCheckingSession(false);
            }
          }
        );

        // Wait a bit for the auth state to change
        setTimeout(() => {
          if (!isValidSession) {
            setError('Invalid or expired reset link. Please request a new one.');
          }
          setIsCheckingSession(false);
        }, 2000);

        return () => subscription.unsubscribe();
      }

      setIsCheckingSession(false);
    };

    checkSession();
  }, [isValidSession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = getSupabaseClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message);
        toast.error('Reset Failed', updateError.message);
        return;
      }

      setIsSuccess(true);
      toast.success('Password Updated', 'Your password has been successfully reset.');

      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch {
      setError('An unexpected error occurred. Please try again.');
      toast.error('Reset Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state - checking session
  if (isCheckingSession) {
    return (
      <div className="animate-fade-in">
        <Card className="shadow-lg">
          <CardContent className="py-12 text-center">
            <div className="w-12 h-12 border-4 border-[var(--primary-200)] border-t-[var(--primary-500)] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[var(--neutral-600)]">Verifying reset link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state - invalid link
  if (!isValidSession && error) {
    return (
      <div className="animate-fade-in">
        <Card className="shadow-lg">
          <CardContent className="py-8 text-center">
            {/* Error Icon */}
            <div className="w-16 h-16 rounded-full bg-[var(--error-100)] flex items-center justify-center mx-auto mb-4">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[var(--error-600)]"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="m15 9-6 6" />
                <path d="m9 9 6 6" />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-[var(--primary-900)] mb-2">
              Invalid Reset Link
            </h2>
            <p className="text-[var(--neutral-600)] mb-6 max-w-sm mx-auto">
              {error}
            </p>

            <Link href="/forgot-password">
              <Button variant="primary">
                Request New Reset Link
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state - password reset
  if (isSuccess) {
    return (
      <div className="animate-fade-in">
        <Card className="shadow-lg">
          <CardContent className="py-8 text-center">
            {/* Success Icon */}
            <div className="w-16 h-16 rounded-full bg-[var(--success-100)] flex items-center justify-center mx-auto mb-4">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[var(--success-600)]"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <path d="m9 11 3 3L22 4" />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-[var(--primary-900)] mb-2">
              Password Reset Successfully
            </h2>
            <p className="text-[var(--neutral-600)] mb-6 max-w-sm mx-auto">
              Your password has been updated. You will be redirected to the login page shortly.
            </p>

            <Link href="/login">
              <Button variant="primary">
                Go to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default state - form
  return (
    <div className="animate-fade-in">
      <Card className="shadow-lg">
        <CardHeader className="text-center pb-2">
          {/* Key Icon */}
          <div className="w-12 h-12 rounded-full bg-[var(--primary-100)] flex items-center justify-center mx-auto mb-3">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[var(--primary-700)]"
            >
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold text-[var(--primary-900)]">
            Set New Password
          </CardTitle>
          <CardDescription className="text-[var(--neutral-600)]">
            Enter your new password below
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message */}
            {error && (
              <div
                role="alert"
                className="p-3 rounded-[var(--radius-md)] bg-[var(--error-100)] text-[var(--error-600)] text-sm"
              >
                {error}
              </div>
            )}

            {/* New Password Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[var(--neutral-900)]"
              >
                New Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="Enter your new password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                disabled={isLoading}
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
                  >
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                }
              />
              <p className="text-xs text-[var(--neutral-400)]">
                Must be at least 8 characters long
              </p>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-[var(--neutral-900)]"
              >
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError(null);
                }}
                disabled={isLoading}
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
                  >
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                }
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              disabled={isLoading}
              className="w-full"
            >
              Reset Password
            </Button>

            {/* Back to Login Link */}
            <div className="text-center pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-[var(--primary-500)] hover:text-[var(--primary-700)] transition-colors"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m12 19-7-7 7-7" />
                  <path d="M19 12H5" />
                </svg>
                Back to login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
