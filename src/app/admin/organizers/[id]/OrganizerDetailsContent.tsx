'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { FormInput } from '@/components/FormInput';
import { FormError } from '@/components/FormError';
import { SuccessMessage } from '@/components/SuccessMessage';

interface OrganizerDetails {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: 'active' | 'suspended';
  createdAt: string;
}

interface Event {
  id: string;
  name: string;
  dateStart: string;
  dateEnd: string;
  status: string;
  participantCount: number;
}

export default function OrganizerDetailsContent({
  organizerId,
}: {
  organizerId: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [organizer, setOrganizer] = useState<OrganizerDetails | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: '', phone: '' });
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchOrganizerDetails = useCallback(async () => {
    try {
      // Get organizer details
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('id, name, email, phone, status, created_at')
        .eq('id', organizerId)
        .single();

      if (tenantError) throw tenantError;

      setOrganizer({
        id: tenantData.id,
        name: tenantData.name,
        email: tenantData.email,
        phone: tenantData.phone,
        status: tenantData.status,
        createdAt: tenantData.created_at,
      });

      setEditData({
        name: tenantData.name,
        phone: tenantData.phone || '',
      });

      // Get events for this organizer
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, name, date_start, date_end, status')
        .eq('tenant_id', organizerId)
        .order('date_start', { ascending: false });

      if (eventsError) throw eventsError;

      // Get participant counts for each event
      const eventsWithCounts = await Promise.all(
        (eventsData || []).map(async (event) => {
          const { count } = await supabase
            .from('participants')
            .select('id', { count: 'exact' })
            .eq('event_id', event.id);

          return {
            id: event.id,
            name: event.name,
            dateStart: event.date_start,
            dateEnd: event.date_end,
            status: event.status,
            participantCount: count || 0,
          };
        })
      );

      setEvents(eventsWithCounts);
    } catch (err) {
      console.error('[v0] Error fetching organizer details:', err);
      setError('Failed to load organizer details');
    } finally {
      setIsLoading(false);
    }
  }, [supabase, organizerId]);

  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('tenants')
        .update({
          name: editData.name,
          phone: editData.phone || null,
        })
        .eq('id', organizerId);

      if (updateError) throw updateError;

      setOrganizer((prev) =>
        prev
          ? { ...prev, name: editData.name, phone: editData.phone || null }
          : null
      );

      setSuccessMessage('Organizer details updated successfully');
      setIsEditing(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('[v0] Error saving changes:', err);
      setError('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!organizer) return;

    try {
      setIsTogglingStatus(true);
      setError(null);

      const newStatus = organizer.status === 'active' ? 'suspended' : 'active';

      const { error: updateError } = await supabase
        .from('tenants')
        .update({ status: newStatus })
        .eq('id', organizerId);

      if (updateError) throw updateError;

      setOrganizer((prev) => (prev ? { ...prev, status: newStatus } : null));

      setSuccessMessage(
        `Organizer ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`
      );
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('[v0] Error toggling status:', err);
      setError('Failed to update organizer status');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  useEffect(() => {
    fetchOrganizerDetails();
  }, [fetchOrganizerDetails]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent"></div>
          <p className="mt-4 text-foreground-secondary">Loading organizer details...</p>
        </div>
      </div>
    );
  }

  if (!organizer) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="text-center">
          <p className="text-error mb-4">Organizer not found</p>
          <Link href="/admin/organizers" className="text-accent hover:text-accent-hover">
            ← Back to Organizers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background-secondary sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <Link
            href="/admin/organizers"
            className="text-accent hover:text-accent-hover text-sm font-medium mb-3 inline-block"
          >
            ← Back to Organizers
          </Link>
          <h1 className="text-3xl font-bold text-foreground">{organizer.name}</h1>
          <p className="mt-2 text-foreground-secondary">{organizer.email}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-error-light/10 border border-error-light text-error">
            {error}
          </div>
        )}

        {successMessage && (
          <SuccessMessage message={successMessage} />
        )}

        {/* Organizer Details Card */}
        <div className="bg-background-secondary rounded-lg border border-border p-8 mb-8">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-xl font-bold text-foreground">Organizer Information</h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-accent hover:text-accent-hover text-sm font-medium"
              >
                Edit
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-6">
              <FormInput
                label="Organization Name"
                name="name"
                type="text"
                value={editData.name}
                onChange={(e) => setEditData((prev) => ({ ...prev, name: e.target.value }))}
              />

              <FormInput
                label="Phone Number"
                name="phone"
                type="tel"
                value={editData.phone}
                onChange={(e) => setEditData((prev) => ({ ...prev, phone: e.target.value }))}
              />

              <div className="flex gap-4">
                <button
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:bg-gray-400 transition-colors font-medium"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-2 bg-background border border-border text-foreground rounded-lg hover:bg-background-secondary transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-foreground-secondary font-medium">Email</label>
                <p className="text-foreground mt-1">{organizer.email}</p>
              </div>
              <div>
                <label className="text-sm text-foreground-secondary font-medium">Phone</label>
                <p className="text-foreground mt-1">{organizer.phone || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm text-foreground-secondary font-medium">Status</label>
                <div className="mt-1">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      organizer.status === 'active'
                        ? 'bg-success-light/20 text-success-dark'
                        : 'bg-error-light/20 text-error'
                    }`}
                  >
                    {organizer.status === 'active' ? 'Active' : 'Suspended'}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm text-foreground-secondary font-medium">Created</label>
                <p className="text-foreground mt-1">
                  {new Date(organizer.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          {!isEditing && (
            <div className="mt-6 pt-6 border-t border-border">
              <button
                onClick={handleToggleStatus}
                disabled={isTogglingStatus}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  organizer.status === 'active'
                    ? 'bg-error-light/10 text-error hover:bg-error-light/20 disabled:bg-gray-400'
                    : 'bg-success-light/10 text-success-dark hover:bg-success-light/20 disabled:bg-gray-400'
                }`}
              >
                {isTogglingStatus
                  ? 'Updating...'
                  : organizer.status === 'active'
                    ? 'Suspend Organizer'
                    : 'Activate Organizer'}
              </button>
            </div>
          )}
        </div>

        {/* Events Section */}
        <div className="bg-background-secondary rounded-lg border border-border overflow-hidden">
          <div className="px-8 py-6 border-b border-border">
            <h2 className="text-xl font-bold text-foreground">Events ({events.length})</h2>
            <p className="text-foreground-secondary text-sm mt-1">
              All events created by this organizer
            </p>
          </div>

          <div className="overflow-x-auto">
            {events.length === 0 ? (
              <div className="px-8 py-8 text-center text-foreground-secondary">
                No events created yet
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-background border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                      Event Name
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                      Dates
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                      Participants
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {events.map((event) => (
                    <tr key={event.id} className="hover:bg-background/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground">{event.name}</td>
                      <td className="px-6 py-4 text-foreground-secondary text-sm">
                        {new Date(event.dateStart).toLocaleDateString()} -{' '}
                        {new Date(event.dateEnd).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            event.status === 'active'
                              ? 'bg-success-light/20 text-success-dark'
                              : 'bg-background border border-border text-foreground-secondary'
                          }`}
                        >
                          {event.status === 'active' ? 'Active' : event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-foreground">{event.participantCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
