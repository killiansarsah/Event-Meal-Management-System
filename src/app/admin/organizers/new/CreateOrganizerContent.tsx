'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApiRequest } from '@/hooks/useApiRequest';
import { FormInput } from '@/components/FormInput';
import { FormError } from '@/components/FormError';
import { SuccessMessage } from '@/components/SuccessMessage';

export default function CreateOrganizerContent() {
  const router = useRouter();
  const { request, isLoading, error, fieldErrors, setError } = useApiRequest();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const result = await request('/api/admin/tenants', 'POST', {
      name: formData.name,
      email: formData.email,
      phone: formData.phone || undefined,
    });

    if (result.success) {
      setSuccessMessage(`Invite sent to ${formData.email}`);
      setTimeout(() => {
        router.push('/admin/organizers?message=organizer-created');
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background-secondary sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold text-foreground">Create New Organizer</h1>
          <p className="mt-2 text-foreground-secondary">
            Invite a new event organizer to the platform
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Back Link */}
        <Link
          href="/admin/organizers"
          className="text-accent hover:text-accent-hover text-sm font-medium mb-6 inline-block"
        >
          ← Back to Organizers
        </Link>

        {/* Form Card */}
        <div className="bg-background-secondary rounded-lg border border-border p-8">
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-error-light/10 border border-error-light text-error">
              {error}
            </div>
          )}

          {successMessage && (
            <SuccessMessage message={successMessage} />
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <FormInput
              label="Organization Name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g. Acme Corporation"
              error={fieldErrors.name}
              required
            />

            {/* Email Field */}
            <FormInput
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="organizer@example.com"
              error={fieldErrors.email}
              required
              helperText="An invitation will be sent to this email"
            />

            {/* Phone Field */}
            <FormInput
              label="Phone Number (Optional)"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="+1 (555) 000-0000"
              error={fieldErrors.phone}
            />

            {/* Form Actions */}
            <div className="flex gap-4 pt-6 border-t border-border">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:bg-gray-400 transition-colors font-medium"
              >
                {isLoading ? 'Sending Invite...' : 'Create Organizer & Send Invite'}
              </button>
              <Link
                href="/admin/organizers"
                className="flex-1 px-6 py-3 bg-background border border-border text-foreground rounded-lg hover:bg-background-secondary transition-colors font-medium text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>

        {/* Info Box */}
        <div className="mt-8 p-6 rounded-lg bg-accent/5 border border-accent/10">
          <h3 className="font-semibold text-foreground mb-2">What happens next?</h3>
          <ul className="space-y-2 text-foreground-secondary text-sm">
            <li>✓ An invite email is sent to the organizer&apos;s email address</li>
            <li>✓ Organizer clicks the link to accept the invite</li>
            <li>✓ Organizer creates their account and password</li>
            <li>✓ Organizer can immediately start creating events</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
