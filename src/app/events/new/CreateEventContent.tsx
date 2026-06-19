'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApiRequest } from '@/hooks/useApiRequest';
import { FormInput } from '@/components/FormInput';
import { FormError } from '@/components/FormError';
import { SuccessMessage } from '@/components/SuccessMessage';

interface PaymentRules {
  fullPaymentRequired?: boolean;
  depositAllowed?: boolean;
  paymentDeadline?: string;
}

export default function CreateEventContent() {
  const router = useRouter();
  const { request, isLoading, error } = useApiRequest();

  const [formData, setFormData] = useState({
    name: '',
    dateStart: '',
    dateEnd: '',
    venue: '',
    paymentRequired: true,
  });

  const [paymentRules, setPaymentRules] = useState<PaymentRules>({
    fullPaymentRequired: true,
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: any = {
      name: formData.name,
      date_start: formData.dateStart,
      date_end: formData.dateEnd,
      venue: formData.venue,
      payment_required: formData.paymentRequired,
    };

    if (formData.paymentRequired) {
      payload.payment_rules = paymentRules;
    }

    const response = await request('/api/events', 'POST', payload);

    if (response.success && (response.data as any)?.id) {
      setSuccess(true);
      setTimeout(() => {
        router.push(`/events/${(response.data as any).id}`);
      }, 1500);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <SuccessMessage message="Event created successfully! Redirecting..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard" className="text-accent hover:underline mb-6 inline-block">
          ← Back to Dashboard
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">Create New Event</h1>
        <p className="text-foreground-secondary mb-8">Set up a new event with registration and meal management</p>

        <form onSubmit={handleSubmit} className="bg-background-secondary border border-border rounded-lg p-8">
          {error && <FormError message={error} />}

          {/* Event Name */}
          <FormInput
            label="Event Name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="e.g. Annual Conference 2024"
            required
          />

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Start Date"
              name="dateStart"
              type="date"
              value={formData.dateStart}
              onChange={handleInputChange}
              required
            />
            <FormInput
              label="End Date"
              name="dateEnd"
              type="date"
              value={formData.dateEnd}
              onChange={handleInputChange}
              required
            />
          </div>

          {/* Venue */}
          <FormInput
            label="Venue"
            name="venue"
            type="text"
            value={formData.venue}
            onChange={handleInputChange}
            placeholder="e.g. Grand Hall, Downtown Convention Center"
            required
          />

          {/* Logo Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">Event Logo</label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="block text-sm text-foreground-secondary border border-border rounded-lg cursor-pointer bg-background hover:bg-background-secondary transition-colors file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-accent file:text-white file:cursor-pointer"
              />
              {logoPreview && (
                <div className="w-16 h-16 rounded-lg overflow-hidden border border-border flex-shrink-0">
                  <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          {/* Payment Required */}
          <div className="mb-6 p-4 border border-border rounded-lg bg-background">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="paymentRequired"
                checked={formData.paymentRequired}
                onChange={handleInputChange}
                className="w-4 h-4 rounded border-border text-accent focus:ring-2 focus:ring-accent"
              />
              <span className="text-foreground font-medium">Payment Required</span>
            </label>
            <p className="text-foreground-secondary text-sm mt-2">Participants must submit payment to register</p>
          </div>

          {/* Payment Rules - Shown only if payment required */}
          {formData.paymentRequired && (
            <div className="mb-6 p-4 border border-border rounded-lg bg-background">
              <h3 className="font-semibold text-foreground mb-4">Payment Rules</h3>
              <label className="flex items-center gap-3 cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={paymentRules.fullPaymentRequired ?? true}
                  onChange={(e) =>
                    setPaymentRules((prev) => ({ ...prev, fullPaymentRequired: e.target.checked }))
                  }
                  className="w-4 h-4 rounded border-border text-accent focus:ring-2 focus:ring-accent"
                />
                <span className="text-foreground">Full Payment Required</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={paymentRules.depositAllowed ?? false}
                  onChange={(e) =>
                    setPaymentRules((prev) => ({ ...prev, depositAllowed: e.target.checked }))
                  }
                  className="w-4 h-4 rounded border-border text-accent focus:ring-2 focus:ring-accent"
                />
                <span className="text-foreground">Deposit Payment Allowed</span>
              </label>

              {paymentRules.depositAllowed && (
                <FormInput
                  label="Payment Deadline"
                  name="paymentDeadline"
                  type="date"
                  value={paymentRules.paymentDeadline || ''}
                  onChange={(e) =>
                    setPaymentRules((prev) => ({ ...prev, paymentDeadline: e.target.value }))
                  }
                />
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-4 pt-6">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-accent text-white font-medium py-3 rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Creating...' : 'Create Event'}
            </button>
            <Link
              href="/dashboard"
              className="flex-1 bg-background-secondary border border-border text-foreground font-medium py-3 rounded-lg hover:bg-background-secondary/80 transition-colors text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
