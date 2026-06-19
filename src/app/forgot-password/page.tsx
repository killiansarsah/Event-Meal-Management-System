'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuthLayout } from '@/components/AuthLayout';
import { FormInput } from '@/components/FormInput';
import { FormError } from '@/components/FormError';
import { SuccessMessage } from '@/components/SuccessMessage';
import { useApiRequest } from '@/hooks/useApiRequest';

export default function ForgotPasswordPage() {
  const { request, isLoading, error, fieldErrors } = useApiRequest();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccessMessage(null);

    const response = await request('/api/auth/reset-password-request', 'POST', {
      email,
    });

    if (response.success) {
      setSuccessMessage('Password reset link has been sent to your email. Please check your inbox.');
      setEmail('');
    }
  };

  return (
    <AuthLayout title="Reset Password" subtitle="Enter your email to receive a password reset link">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <FormError message={error} />}
        {successMessage && <SuccessMessage message={successMessage} />}

        <FormInput
          label="Email"
          type="email"
          name="email"
          placeholder="your@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
          disabled={isLoading}
          required
        />

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-accent px-6 py-3 font-medium text-white transition-colors hover:bg-accent-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Sending link...' : 'Send Reset Link'}
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
