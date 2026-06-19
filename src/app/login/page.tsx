'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthLayout } from '@/components/AuthLayout';
import { FormInput } from '@/components/FormInput';
import { FormError } from '@/components/FormError';
import { SuccessMessage } from '@/components/SuccessMessage';
import { useApiRequest } from '@/hooks/useApiRequest';

export default function LoginPage() {
  const router = useRouter();
  const { request, isLoading, error, fieldErrors } = useApiRequest();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccessMessage(null);

    const response = await request('/api/auth/login', 'POST', {
      email: formData.email,
      password: formData.password,
    });

    if (response.success) {
      setSuccessMessage('Login successful! Redirecting...');
      
      // Get the user role and redirect accordingly
      const userRole = (response.data as any)?.role;
      const eventId = (response.data as any)?.event_id;
      
      let redirectPath = '/dashboard';
      
      if (userRole === 'super_admin') {
        redirectPath = '/admin';
      } else if (userRole === 'organizer') {
        redirectPath = '/dashboard';
      } else if (userRole === 'registration_staff' && eventId) {
        redirectPath = `/events/${eventId}/register`;
      } else if (userRole === 'catering_staff' && eventId) {
        redirectPath = `/events/${eventId}/scan`;
      } else if (userRole === 'finance_team' && eventId) {
        redirectPath = `/events/${eventId}/payments`;
      }
      
      setTimeout(() => {
        router.push(redirectPath);
      }, 1000);
    }
  };

  return (
    <AuthLayout title="Sign In" subtitle="Access your event meal management system">
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
          placeholder="Enter your password"
          value={formData.password}
          onChange={handleChange}
          error={fieldErrors.password}
          disabled={isLoading}
          required
        />

        <div className="flex items-center justify-between pt-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border bg-background-secondary text-accent focus:ring-2 focus:ring-accent-light/50"
              disabled={isLoading}
            />
            <span className="text-sm text-foreground-secondary">Remember me</span>
          </label>
          <Link href="/forgot-password" className="text-sm font-medium text-accent hover:text-accent-hover">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-accent px-6 py-3 font-medium text-white transition-colors hover:bg-accent-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>

        <p className="text-center text-sm text-foreground-secondary">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-medium text-accent hover:text-accent-hover">
            Create one
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
