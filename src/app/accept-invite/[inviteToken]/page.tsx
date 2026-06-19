'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { AuthLayout } from '@/components/AuthLayout';
import { FormInput } from '@/components/FormInput';
import { FormError } from '@/components/FormError';
import { SuccessMessage } from '@/components/SuccessMessage';
import { useApiRequest } from '@/hooks/useApiRequest';

interface InviteData {
  email: string;
  eventName: string;
  role: string;
}

export default function AcceptInvitePage() {
  const router = useRouter();
  const params = useParams();
  const inviteToken = params.inviteToken as string;
  const { request, isLoading, error, fieldErrors, setError } = useApiRequest();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
  });

  // Load invite details
  useEffect(() => {
    const loadInvite = async () => {
      try {
        const response = await fetch(`/api/public/invite/${inviteToken}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Invalid or expired invite');
          setLoadingInvite(false);
          return;
        }

        setInviteData(data);
      } catch (err) {
        setError('Failed to load invite details');
      } finally {
        setLoadingInvite(false);
      }
    };

    loadInvite();
  }, [inviteToken, setError]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Client-side validation
    if (!formData.firstName || !formData.lastName || !formData.password || !formData.confirmPassword) {
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

    const response = await request('/api/auth/accept-invite', 'POST', {
      inviteToken,
      firstName: formData.firstName,
      lastName: formData.lastName,
      password: formData.password,
    });

    if (response.success) {
      setSuccessMessage('Invite accepted! Signing you in...');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    }
  };

  if (loadingInvite) {
    return (
      <AuthLayout title="Loading..." subtitle="Please wait while we verify your invite">
        <div className="text-center text-foreground-secondary">Loading invite details...</div>
      </AuthLayout>
    );
  }

  if (!inviteData) {
    return (
      <AuthLayout title="Invite Expired" subtitle="This invite link is invalid or has expired">
        <div className="space-y-4">
          {error && <FormError message={error} />}
          <Link href="/login" className="block w-full rounded-lg bg-accent px-6 py-3 text-center font-medium text-white hover:bg-accent-hover">
            Return to Login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Accept Invite" subtitle={`Complete your profile to join ${inviteData.eventName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <FormError message={error} />}
        {successMessage && <SuccessMessage message={successMessage} />}

        <div className="rounded-lg bg-border-light p-4">
          <p className="text-sm text-foreground-secondary">
            <span className="font-medium text-foreground">Event:</span> {inviteData.eventName}
          </p>
          <p className="mt-2 text-sm text-foreground-secondary">
            <span className="font-medium text-foreground">Email:</span> {inviteData.email}
          </p>
          <p className="mt-2 text-sm text-foreground-secondary">
            <span className="font-medium text-foreground">Role:</span> {inviteData.role}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label="First Name"
            type="text"
            name="firstName"
            placeholder="John"
            value={formData.firstName}
            onChange={handleChange}
            error={fieldErrors.firstName}
            disabled={isLoading}
            required
          />

          <FormInput
            label="Last Name"
            type="text"
            name="lastName"
            placeholder="Doe"
            value={formData.lastName}
            onChange={handleChange}
            error={fieldErrors.lastName}
            disabled={isLoading}
            required
          />
        </div>

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
          {isLoading ? 'Setting up account...' : 'Accept Invite'}
        </button>
      </form>
    </AuthLayout>
  );
}
