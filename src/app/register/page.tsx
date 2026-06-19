'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthLayout } from '@/components/AuthLayout';
import { FormInput } from '@/components/FormInput';
import { FormError } from '@/components/FormError';
import { SuccessMessage } from '@/components/SuccessMessage';
import { useApiRequest } from '@/hooks/useApiRequest';

export default function RegisterPage() {
  const router = useRouter();
  const { request, isLoading, error, fieldErrors, setError } = useApiRequest();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      delete fieldErrors[name];
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Client-side validation
    if (!formData.email || !formData.password || !formData.confirmPassword) {
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

    const response = await request('/api/auth/register', 'POST', {
      email: formData.email,
      password: formData.password,
    });

    if (response.success) {
      setSuccessMessage('Registration successful! Redirecting to login...');
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    }
  };

  return (
    <AuthLayout title="Create Account" subtitle="Register to get started with event meal management">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <FormError message={error} />}
        {successMessage && <SuccessMessage message={successMessage} />}

        <FormInput
          label="Email"
          type="email"
          name="email"
          placeholder="your@example.com"
          value={formData.email}
          onChange={handleChange}
          error={fieldErrors.email}
          disabled={isLoading}
          required
        />

        <FormInput
          label="Password"
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
          placeholder="Confirm your password"
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
          {isLoading ? 'Creating account...' : 'Create Account'}
        </button>

        <p className="text-center text-sm text-foreground-secondary">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-accent hover:text-accent-hover">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
