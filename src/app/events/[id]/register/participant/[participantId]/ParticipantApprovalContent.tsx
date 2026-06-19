'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { FormInput } from '@/components/FormInput';
import { FormError } from '@/components/FormError';
import { SuccessMessage } from '@/components/SuccessMessage';

interface Category {
  id: string;
  name: string;
}

interface Participant {
  id: string;
  full_name: string;
  address: string;
  category_id: string;
  payment_status: string;
  receipt_number: string | null;
}

interface EventInfo {
  id: string;
  payment_required: boolean;
}

export default function ParticipantApprovalContent({
  eventId,
  participantId,
}: {
  eventId: string;
  participantId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get event
        const eventRes = await supabase
          .from('events')
          .select('id, payment_required')
          .eq('id', eventId)
          .single();

        if (eventRes.error || !eventRes.data) {
          setError('Failed to load event');
          return;
        }

        setEvent(eventRes.data);

        // Get participant
        const partRes = await supabase
          .from('participants')
          .select('id, full_name, address, category_id, payment_status, receipt_number')
          .eq('id', participantId)
          .single();

        if (partRes.error || !partRes.data) {
          setError('Failed to load participant');
          return;
        }

        setParticipant(partRes.data);
        setReceiptNumber(partRes.data.receipt_number || '');

        // Get category if assigned
        if (partRes.data.category_id) {
          const catRes = await supabase
            .from('participant_categories')
            .select('id, name')
            .eq('id', partRes.data.category_id)
            .single();

          if (!catRes.error && catRes.data) {
            setCategory(catRes.data);
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
  }, [eventId, participantId, supabase]);

  const handleApprove = async () => {
    setError(null);
    setSubmitting(true);

    try {
      if (event?.payment_required && !receiptNumber) {
        setError('Receipt number is required');
        setSubmitting(false);
        return;
      }

      // Update participant with approval
      const userId = (await supabase.auth.getUser()).data.user?.id;

      const updateRes = await supabase
        .from('participants')
        .update({
          payment_status: 'approved',
          receipt_number: receiptNumber || null,
          approved_at: new Date().toISOString(),
          approved_by: userId,
        })
        .eq('id', participantId)
        .select()
        .single();

      if (updateRes.error || !updateRes.data) {
        setError('Failed to approve participant');
        setSubmitting(false);
        return;
      }

      // Generate QR code via function or API
      try {
        await supabase.functions.invoke('generate-qr-code', {
          body: { participantId },
        });
      } catch (err) {
        console.warn('[v0] QR code generation warning:', err);
        // Don't fail if QR generation fails - it might already exist
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/events/${eventId}/register/print/${participantId}`);
      }, 1000);
    } catch (err) {
      console.error('[v0] Approval error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!confirm('Are you sure you want to decline this participant?')) {
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      const updateRes = await supabase
        .from('participants')
        .update({
          payment_status: 'declined',
          approved_by: userId,
          approved_at: new Date().toISOString(),
        })
        .eq('id', participantId);

      if (updateRes.error) {
        setError('Failed to decline participant');
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/events/${eventId}/register/search`);
      }, 1000);
    } catch (err) {
      console.error('[v0] Decline error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent"></div>
          <p className="mt-4 text-foreground-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (!participant || !event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-error font-medium">Failed to load participant</p>
          <Link href={`/events/${eventId}/register/search`} className="mt-4 inline-block text-accent hover:underline">
            Back to search
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <Link href={`/events/${eventId}/register/search`} className="text-accent hover:underline mb-6 inline-block">
          ← Back to Search
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-8">Approval Screen</h1>

        {/* Status Badge */}
        <div className="mb-6">
          <span
            className={`text-sm px-3 py-1 rounded font-medium ${
              participant.payment_status === 'pending'
                ? 'bg-warning/20 text-warning-foreground'
                : participant.payment_status === 'approved'
                ? 'bg-success/20 text-success-foreground'
                : 'bg-error/20 text-error-foreground'
            }`}
          >
            {participant.payment_status.charAt(0).toUpperCase() + participant.payment_status.slice(1)}
          </span>
        </div>

        {/* Participant Info Card */}
        <div className="bg-background-secondary border border-border rounded-lg p-6 mb-8">
          {error && <FormError message={error} />}
          {success && <SuccessMessage message="Participant approved! Proceeding to print..." />}

          <div className="space-y-6">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-foreground-secondary mb-2">
                Full Name
              </label>
              <p className="text-2xl font-bold text-foreground">{participant.full_name}</p>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-foreground-secondary mb-2">
                Address
              </label>
              <p className="text-foreground">{participant.address}</p>
            </div>

            {/* Category */}
            {category && (
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-2">
                  Category
                </label>
                <p className="text-foreground font-medium">{category.name}</p>
              </div>
            )}

            {/* Current Payment Status */}
            <div>
              <label className="block text-sm font-medium text-foreground-secondary mb-2">
                Current Payment Status
              </label>
              <p className="text-foreground capitalize">{participant.payment_status}</p>
            </div>

            {/* Receipt Number - Only if payment required */}
            {event.payment_required && (
              <FormInput
                label="Receipt Number"
                type="text"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="Enter or update receipt number"
                disabled={submitting}
              />
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4 mt-8">
              <button
                onClick={handleDecline}
                disabled={submitting}
                className="bg-error/10 hover:bg-error/20 text-error font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {submitting ? 'Processing...' : 'Decline'}
              </button>
              <button
                onClick={handleApprove}
                disabled={submitting}
                className="bg-success hover:bg-success/90 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {submitting ? 'Processing...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
