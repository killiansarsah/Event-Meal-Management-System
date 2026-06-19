'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useApiRequest } from '@/hooks/useApiRequest';

interface Event {
  id: string;
  name: string;
  date_start: string;
  date_end: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  registration_link_token: string;
}

interface EventWithStats extends Event {
  registrationCount: number;
  paymentCount: number;
}

export default function DashboardContent() {
  const supabase = createClient();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [events, setEvents] = useState<EventWithStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { request } = useApiRequest();

  useEffect(() => {
    // Get tenant_id from sessionStorage
    const stored = sessionStorage.getItem('tenant_id');
    setTenantId(stored);
  }, []);

  useEffect(() => {
    if (!tenantId) return;

    const fetchEvents = async () => {
      setLoading(true);
      const response = await request(`/api/events`, 'GET');

      if (response.success && Array.isArray(response.data)) {
        // Fetch stats for each event
        const eventsWithStats = await Promise.all(
          response.data.map(async (event: Event) => {
            // Count registrations
            const { count: regCount } = await supabase
              .from('participants')
              .select('*', { count: 'exact' })
              .eq('event_id', event.id);

            // Count approved payments
            const { count: payCount } = await supabase
              .from('participants')
              .select('*', { count: 'exact' })
              .eq('event_id', event.id)
              .eq('payment_status', 'approved');

            return {
              ...event,
              registrationCount: regCount || 0,
              paymentCount: payCount || 0,
            };
          })
        );

        setEvents(eventsWithStats);
      } else if (response.error) {
        setError(response.error);
      }
      setLoading(false);
    };

    fetchEvents();
  }, [tenantId, request, supabase]);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-foreground-secondary mt-2">Manage your events and registrations</p>
          </div>
          <Link
            href="/events/new"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
          >
            + Create New Event
          </Link>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent"></div>
          </div>
        )}

        {/* Events Grid */}
        {!loading && (
          <>
            {events.length === 0 ? (
              <div className="text-center py-12 bg-background-secondary rounded-lg border border-border">
                <p className="text-foreground-secondary mb-4">No events yet</p>
                <Link
                  href="/events/new"
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
                >
                  Create your first event
                </Link>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {events.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="bg-background-secondary border border-border rounded-lg p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-semibold text-foreground text-lg flex-1 pr-2">{event.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadgeColor(event.status)}`}>
                        {event.status}
                      </span>
                    </div>

                    <p className="text-foreground-secondary text-sm mb-4">
                      {new Date(event.date_start).toLocaleDateString()} — {new Date(event.date_end).toLocaleDateString()}
                    </p>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                      <div>
                        <p className="text-foreground-tertiary text-xs uppercase tracking-wide">Registrations</p>
                        <p className="text-2xl font-bold text-accent mt-1">{event.registrationCount}</p>
                      </div>
                      <div>
                        <p className="text-foreground-tertiary text-xs uppercase tracking-wide">Approved</p>
                        <p className="text-2xl font-bold text-green-600 mt-1">{event.paymentCount}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
