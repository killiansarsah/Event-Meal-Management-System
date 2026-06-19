'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useApiRequest } from '@/hooks/useApiRequest';

interface Participant {
  id: string;
  full_name: string;
  category_id: string | null;
  payment_status: 'pending' | 'approved' | 'declined';
  registered_online: boolean;
  created_at: string;
  category?: { name: string };
}

export default function ViewParticipantsContent({ eventId }: { eventId: string }) {
  const supabase = createClient();
  const { request, isLoading } = useApiRequest();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [filtered, setFiltered] = useState<Participant[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'declined'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchParticipants = async () => {
      const response = await request(`/api/events/${eventId}/participants`, 'GET');

      if (response.success && Array.isArray(response.data)) {
        setParticipants(response.data);
      }
    };

    fetchParticipants();
  }, [eventId, request]);

  useEffect(() => {
    let result = participants;

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter((p) => p.payment_status === statusFilter);
    }

    // Apply search
    if (searchTerm) {
      result = result.filter((p) => p.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    setFiltered(result);
  }, [participants, statusFilter, searchTerm]);

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>;
      case 'declined':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Declined</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href={`/events/${eventId}`} className="text-accent hover:underline mb-6 inline-block">
          ← Back to Event
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-8">Participants</h1>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <input
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="all">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="declined">Declined</option>
          </select>
        </div>

        {/* Participants Table */}
        <div className="bg-background-secondary border border-border rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-foreground-secondary">Loading participants...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-foreground-secondary">No participants found</div>
          ) : (
            <table className="w-full">
              <thead className="border-b border-border bg-background">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Category</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Payment Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Registration Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Registered Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((participant) => (
                  <tr key={participant.id} className="border-b border-border hover:bg-background transition-colors">
                    <td className="px-6 py-4 text-foreground font-medium">{participant.full_name}</td>
                    <td className="px-6 py-4 text-foreground">{participant.category?.name || 'N/A'}</td>
                    <td className="px-6 py-4">{getPaymentBadge(participant.payment_status)}</td>
                    <td className="px-6 py-4 text-foreground text-sm">
                      {participant.registered_online ? 'Online' : 'On-site'}
                    </td>
                    <td className="px-6 py-4 text-foreground-secondary text-sm">
                      {new Date(participant.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-foreground-secondary text-sm mt-4">
          Showing {filtered.length} of {participants.length} participants
        </p>
      </div>
    </div>
  );
}
