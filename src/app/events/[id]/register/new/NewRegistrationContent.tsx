'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { registerParticipantOffline, syncFromServer } from '@/lib/offline/sync';
import { FormInput } from '@/components/FormInput';
import { FormError } from '@/components/FormError';
import { SuccessMessage } from '@/components/SuccessMessage';

interface Category {
  id: string;
  name: string;
  registration_fee: number;
}

interface EventInfo {
  id: string;
  name: string;
  payment_required: boolean;
}

export default function NewRegistrationContent({ eventId }: { eventId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    address: '',
    categoryId: '',
    receiptNumber: '',
  });

  // Check online status
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load event and categories
  useEffect(() => {
    const loadData = async () => {
      try {
        // Sync offline data from server if online
        if (isOnline) {
          await syncFromServer();
        }

        // Get event details
        const eventRes = await supabase
          .from('events')
          .select('id, name, payment_required')
          .eq('id', eventId)
          .single();

        if (eventRes.error || !eventRes.data) {
          setError('Failed to load event');
          return;
        }

        setEvent(eventRes.data);

        // Get categories
        const catRes = await supabase
          .from('participant_categories')
          .select('id, name, registration_fee')
          .eq('event_id', eventId)
          .order('name');

        if (!catRes.error && catRes.data) {
          setCategories(catRes.data);
          if (catRes.data.length > 0) {
            setFormData(prev => ({ ...prev, categoryId: catRes.data[0].id }));
          }
        }
      } catch (err) {
        console.error('[v0] Load data error:', err);
        setError('An error occurred');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [eventId, supabase, isOnline]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // Validate
      if (!formData.fullName || !formData.address || !formData.categoryId) {
        setError('Please fill in all required fields');
        setSubmitting(false);
        return;
      }

      if (event?.payment_required && !formData.receiptNumber) {
        setError('Receipt number is required');
        setSubmitting(false);
        return;
      }

      if (isOnline) {
        // Online mode: use API
        const participantRes = await supabase
          .from('participants')
          .insert({
            event_id: eventId,
            full_name: formData.fullName,
            address: formData.address,
            category_id: formData.categoryId,
            receipt_number: formData.receiptNumber || null,
            payment_status: 'pending',
            registered_online: false,
            registered_by: (await supabase.auth.getUser()).data.user?.id,
          })
          .select()
          .single();

        if (participantRes.error || !participantRes.data) {
          setError('Failed to create participant');
          setSubmitting(false);
          return;
        }

        const participantId = participantRes.data.id;

        // Approve participant
        const approveRes = await supabase
          .from('participants')
          .update({
            payment_status: 'approved',
            approved_at: new Date().toISOString(),
            approved_by: (await supabase.auth.getUser()).data.user?.id,
          })
          .eq('id', participantId)
          .select()
          .single();

        if (approveRes.error) {
          setError('Failed to approve participant');
          setSubmitting(false);
          return;
        }

        // Generate QR code
        const qrRes = await supabase.functions.invoke('generate-qr-code', {
          body: { participantId },
        });

        if (qrRes.error) {
          console.warn('[v0] QR code generation failed:', qrRes.error);
        }

        setSuccess(true);
        setTimeout(() => {
          router.push(`/events/${eventId}/register/print/${participantId}`);
        }, 1000);
      } else {
        // Offline mode: use registerParticipantOffline
        const offlineRes = await registerParticipantOffline({
          full_name: formData.fullName,
          address: formData.address,
          category_id: formData.categoryId,
          receipt_number: formData.receiptNumber || undefined,
          eventId,
        });

        if (!offlineRes.success) {
          setError(offlineRes.error);
          setSubmitting(false);
          return;
        }

        setSuccess(true);
        setTimeout(() => {
          // For offline, show a confirmation and stay on page or go back
          router.push(`/events/${eventId}/register`);
        }, 1500);
      }
    } catch (err) {
      console.error('[v0] Registration error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent"></div>
          <p className="mt-4 text-foreground-secondary">Loading form...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-error font-medium">Failed to load event</p>
          <Link href="/" className="mt-4 inline-block text-accent hover:underline">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <Link href={`/events/${eventId}/register`} className="text-accent hover:underline mb-6 inline-block">
          ← Back to Dashboard
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">{event.name}</h1>
        <p className="text-foreground-secondary mb-8">New On-Site Registration</p>

        {/* Offline Warning */}
        {!isOnline && (
          <div className="bg-warning/10 border border-warning text-warning-foreground rounded-lg p-4 mb-6">
            <p className="font-medium">Offline Mode Active</p>
            <p className="text-sm">Your registration will be synced when you&apos;re back online.</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-background-secondary border border-border rounded-lg p-6">
          {error && <FormError message={error} />}
          {success && <SuccessMessage message="Participant registered successfully!" />}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <FormInput
              label="Full Name *"
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
              placeholder="Enter participant full name"
              disabled={submitting}
              required
            />

            {/* Address */}
            <FormInput
              label="Address *"
              type="text"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Enter participant address"
              disabled={submitting}
              required
            />

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Category *
              </label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                disabled={submitting}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
                required
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} {cat.registration_fee > 0 ? `(₵${cat.registration_fee})` : '(Free)'}
                  </option>
                ))}
              </select>
            </div>

            {/* Receipt Number - Only if payment required */}
            {event.payment_required && (
              <FormInput
                label="Receipt Number *"
                type="text"
                value={formData.receiptNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, receiptNumber: e.target.value }))}
                placeholder="Enter payment receipt number"
                disabled={submitting}
                required
              />
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !isOnline && event.payment_required}
              className="w-full bg-accent text-white font-semibold py-3 rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Processing...' : event.payment_required ? 'Approve & Generate QR' : 'Register'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
