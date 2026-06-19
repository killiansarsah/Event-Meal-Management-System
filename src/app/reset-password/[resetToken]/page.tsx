'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { AuthLayout } from '@/components/AuthLayout';
import { FormInput } from '@/components/FormInput';
import { FormError } from '@/components/FormError';
import { SuccessMessage } from '@/components/SuccessMessage';
import { useApiRequest } from '@/hooks/useApiRequest';

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams();
  const resetToken = params.resetToken as string;
  const { request, isLoading, error, fieldErrors, setError } = useApiRequest();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  // Validate token
  useEffect(() => {
    const validateToken = async () => {
      try {
        const response = await fetch(`/api/auth/reset-password-validate?token=${resetToken}`);
        if (!response.ok) {
          setError('Invalid or expired password reset link');
          setTokenValid(false);
          return;
        }
        setTokenValid(true);
      } catch (err) {
        setError('Failed to validate reset link');
        setTokenValid(false);
      }
    };

    validateToken();
  }, [resetToken, setError]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Client-side validation
    if (!formData.password || !formData.confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    const response = await request('/api/auth/reset-password', 'POST', {
      token: resetToken,
      password: formData.password,
    });

    if (response.success) {
      setSuccessMessage('Password reset successful! Redirecting to login...');
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    }
  };

  if (tokenValid === null) {
    return (
      <AuthLayout title="Loading..." subtitle="Please wait while we verify your reset link">
        <div className="text-center text-foreground-secondary">Verifying reset link...</div>
      </AuthLayout>
    );
  }

  if (!tokenValid) {
    return (
      <AuthLayout title="Invalid Reset Link" subtitle="This link has expired or is invalid">
        <div className="space-y-4">
          {error && <FormError message={error} />}
          <Link href="/forgot-password" className="block w-full rounded-lg bg-accent px-6 py-3 text-center font-medium text-white hover:bg-accent-hover">
            Request New Link
          </Link>
          <Link href="/login" className="block w-full rounded-lg border border-border px-6 py-3 text-center font-medium text-foreground hover:bg-border-light">
            Return to Login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set New Password" subtitle="Enter your new password below">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <FormError message={error} />}
        {successMessage && <SuccessMessage message={successMessage} />}

        <FormInput
          label="New Password"
          type="password"
          name="password"
          placeholder="At least 8 characters"
          value={formData.password}
          onChange={handleChange}
          error={fieldErrors.password}
          disabled={isLoading}
          required
        />

        <FormInput
          label="Confirm Password"
          type="password"
          name="confirmPassword"
          placeholder="Confirm your new password"
          value={formData.confirmPassword}
          onChange={handleChange}
          error={fieldErrors.confirmPassword}
          disabled={isLoading}
          required
        />

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-accent px-6 py-3 font-medium text-white transition-colors hover:bg-accent-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Resetting password...' : 'Reset Password'}
        </button>

        <p className="text-center text-sm text-foreground-secondary">
          Remember your password?{' '}
          <Link href="/login" className="font-medium text-accent hover:text-accent-hover">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
