'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApiRequest } from '@/hooks/useApiRequest';
import { createClient } from '@/lib/supabase/client';

interface Event {
  id: string;
  name: string;
  date_start: string;
  date_end: string;
  venue: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  registration_link_token: string;
  payment_required: boolean;
  logo_url?: string;
}

interface Stats {
  totalRegistrations: number;
  approvedPayments: number;
  pendingPayments: number;
  totalMeals: number;
}

const tabs = [
  { name: 'Categories', href: 'categories', icon: '📂' },
  { name: 'Sessions', href: 'sessions', icon: '🍽️' },
  { name: 'Staff', href: 'staff', icon: '👥' },
  { name: 'Participants', href: 'participants', icon: '📋' },
  { name: 'Reports', href: 'reports', icon: '📊' },
];

export default function EventOverviewContent({ eventId }: { eventId: string }) {
  const { request, isLoading, error } = useApiRequest();
  const supabase = createClient();
  const [event, setEvent] = useState<Event | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalRegistrations: 0,
    approvedPayments: 0,
    pendingPayments: 0,
    totalMeals: 0,
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      const response = await request(`/api/events/${eventId}`, 'GET');

      if (response.success && response.data as any) {
        setEvent((response.data as any).event || response.data as any);

        // Fetch stats
        const { count: totalReg } = await supabase
          .from('participants')
          .select('*', { count: 'exact' })
          .eq('event_id', eventId);

        const { count: approved } = await supabase
          .from('participants')
          .select('*', { count: 'exact' })
          .eq('event_id', eventId)
          .eq('payment_status', 'approved');

        const { count: pending } = await supabase
          .from('participants')
          .select('*', { count: 'exact' })
          .eq('event_id', eventId)
          .eq('payment_status', 'pending');

        const { count: checkins } = await supabase
          .from('meal_checkins')
          .select('*', { count: 'exact' })
          .eq('event_id', eventId);

        setStats({
          totalRegistrations: totalReg || 0,
          approvedPayments: approved || 0,
          pendingPayments: pending || 0,
          totalMeals: checkins || 0,
        });
      }
    };

    fetchEvent();
  }, [eventId, request, supabase]);

  const copyRegistrationLink = () => {
    if (event?.registration_link_token) {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const link = `${baseUrl}/register/${event.registration_link_token}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent"></div>
          <p className="mt-4 text-foreground-secondary">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-foreground mb-4">Event not found</p>
          <Link href="/dashboard" className="text-accent hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <Link href="/dashboard" className="text-accent hover:underline mb-6 inline-block">
          ← Back to Dashboard
        </Link>

        <div className="flex items-start justify-between mb-8">
          <div className="flex items-start gap-6">
            {event.logo_url && (
              <div className="w-20 h-20 rounded-lg overflow-hidden border border-border flex-shrink-0">
                <img src={event.logo_url} alt={event.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-foreground">{event.name}</h1>
              <p className="text-foreground-secondary mt-2">
                {new Date(event.date_start).toLocaleDateString()} — {new Date(event.date_end).toLocaleDateString()}
              </p>
              <p className="text-foreground-secondary">{event.venue}</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-background-secondary border border-border rounded-lg p-4">
            <p className="text-foreground-tertiary text-xs uppercase tracking-wide">Total Registrations</p>
            <p className="text-3xl font-bold text-accent mt-2">{stats.totalRegistrations}</p>
          </div>
          <div className="bg-background-secondary border border-border rounded-lg p-4">
            <p className="text-foreground-tertiary text-xs uppercase tracking-wide">Approved Payments</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{stats.approvedPayments}</p>
          </div>
          <div className="bg-background-secondary border border-border rounded-lg p-4">
            <p className="text-foreground-tertiary text-xs uppercase tracking-wide">Pending Payments</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pendingPayments}</p>
          </div>
          <div className="bg-background-secondary border border-border rounded-lg p-4">
            <p className="text-foreground-tertiary text-xs uppercase tracking-wide">Meal Check-ins</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{stats.totalMeals}</p>
          </div>
        </div>

        {/* Registration Link */}
        <div className="bg-background-secondary border border-border rounded-lg p-6 mb-8">
          <h2 className="font-semibold text-foreground mb-4">Public Registration Link</h2>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={
                typeof window !== 'undefined'
                  ? `${window.location.origin}/register/${event.registration_link_token}`
                  : ''
              }
              className="flex-1 px-4 py-2 rounded-lg bg-background border border-border text-foreground-secondary"
            />
            <button
              onClick={copyRegistrationLink}
              className="px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors font-medium"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-border mb-8">
          <div className="flex gap-6 overflow-x-auto">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={`/events/${eventId}/${tab.href}`}
                className="pb-3 px-2 text-foreground hover:text-accent border-b-2 border-transparent hover:border-accent transition-colors whitespace-nowrap"
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Content area message */}
        <div className="bg-background-secondary border border-border rounded-lg p-8 text-center">
          <p className="text-foreground-secondary">Select a tab above to manage event details</p>
        </div>
      </div>
    </div>
  );
}
