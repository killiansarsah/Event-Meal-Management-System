'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface EventInfo {
  id: string;
  name: string;
  payment_required: boolean;
}

export default function RegistrationDashboardContent({ eventId }: { eventId: string }) {
  const supabase = createClient();
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [todayCount, setTodayCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch event details
        const eventResponse = await supabase
          .from('events')
          .select('id, name, payment_required')
          .eq('id', eventId)
          .single();

        if (eventResponse.error || !eventResponse.data) {
          setError('Failed to load event');
          return;
        }

        setEvent(eventResponse.data);

        // Fetch today's registration count
        const today = new Date().toISOString().split('T')[0];
        const countResponse = await supabase
          .from('participants')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', eventId)
          .gte('created_at', `${today}T00:00:00`)
          .lte('created_at', `${today}T23:59:59`);

        if (!countResponse.error) {
          setTodayCount(countResponse.count || 0);
        }
      } catch (err) {
        console.error('[v0] Dashboard fetch error:', err);
        setError('An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [eventId, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent"></div>
          <p className="mt-4 text-foreground-secondary">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-error font-medium">{error || 'Failed to load event'}</p>
          <Link href="/" className="mt-4 inline-block text-accent hover:underline">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-foreground mb-2">{event.name}</h1>
          <p className="text-foreground-secondary">Registration Dashboard</p>
        </div>

        {/* Today's Count Card */}
        <div className="bg-background-secondary border border-border rounded-lg p-6 mb-8">
          <p className="text-foreground-secondary text-sm mb-2">Registrations Today</p>
          <p className="text-4xl font-bold text-accent">{todayCount}</p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* New Registration Button */}
          <Link
            href={`/events/${eventId}/register/new`}
            className="group bg-accent hover:bg-accent/90 text-white font-semibold py-6 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg flex flex-col items-center justify-center text-center"
          >
            <div className="text-4xl mb-3">➕</div>
            <div className="text-lg">New Registration</div>
            <div className="text-sm text-white/80 mt-2">Register a participant on-site</div>
          </Link>

          {/* Search Pre-Registered Button */}
          <Link
            href={`/events/${eventId}/register/search`}
            className="group bg-foreground-secondary hover:bg-foreground-secondary/90 text-white font-semibold py-6 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg flex flex-col items-center justify-center text-center"
          >
            <div className="text-4xl mb-3">🔍</div>
            <div className="text-lg">Search Pre-Registered</div>
            <div className="text-sm text-white/80 mt-2">Find and approve pre-registered participants</div>
          </Link>
        </div>

        {/* Quick Info */}
        <div className="mt-12 bg-background-tertiary border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Info</h2>
          <ul className="space-y-3 text-foreground-secondary">
            <li className="flex items-start">
              <span className="text-accent mr-3">•</span>
              <span>Payment Required: {event.payment_required ? 'Yes' : 'No'}</span>
            </li>
            <li className="flex items-start">
              <span className="text-accent mr-3">•</span>
              <span>
                {event.payment_required
                  ? 'You will need to verify receipt numbers for each participant'
                  : 'No payment verification needed for this event'}
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-accent mr-3">•</span>
              <span>QR codes are generated automatically after approval</span>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
