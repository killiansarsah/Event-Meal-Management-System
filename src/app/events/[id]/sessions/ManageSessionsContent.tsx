'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useApiRequest } from '@/hooks/useApiRequest';
import { FormInput } from '@/components/FormInput';
import { FormError } from '@/components/FormError';
import { SuccessMessage } from '@/components/SuccessMessage';

interface MealSession {
  id: string;
  name: string;
  date: string;
  start_time: string;
  end_time: string;
}

export default function ManageSessionsContent({ eventId }: { eventId: string }) {
  const supabase = createClient();
  const { request } = useApiRequest();

  const [sessions, setSessions] = useState<MealSession[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newSession, setNewSession] = useState({
    name: '',
    date: '',
    startTime: '',
    endTime: '',
  });
  const [success, setSuccess] = useState('');
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    fetchSessions();
  }, [eventId]);

  const fetchSessions = async () => {
    const { data, error } = await supabase
      .from('meal_sessions')
      .select('*')
      .eq('event_id', eventId)
      .order('date', { ascending: true });

    if (data) setSessions(data);
  };

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();

    const response = await request(`/api/events/${eventId}/sessions`, 'POST', {
      name: newSession.name,
      date: newSession.date,
      start_time: newSession.startTime,
      end_time: newSession.endTime,
    });

    if (response.success) {
      setSuccess('Session added successfully');
      setNewSession({ name: '', date: '', startTime: '', endTime: '' });
      setIsAdding(false);
      fetchSessions();
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    const response = await request(`/api/events/${eventId}/sessions/${sessionId}`, 'DELETE');

    if (!response.success) {
      if (response.error?.includes('409') || response.error?.includes('check-ins')) {
        setDeleteError('Cannot delete: meal check-ins exist for this session');
        setTimeout(() => setDeleteError(''), 4000);
        return;
      }
    }

    setSuccess('Session deleted');
    fetchSessions();
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href={`/events/${eventId}`} className="text-accent hover:underline mb-6 inline-block">
          ← Back to Event
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">Manage Meal Sessions</h1>
        <p className="text-foreground-secondary mb-8">Configure when meals are served at your event</p>

        {success && <SuccessMessage message={success} />}
        {deleteError && <FormError message={deleteError} />}

        {!isAdding ? (
          <button
            onClick={() => setIsAdding(true)}
            className="mb-8 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors font-medium"
          >
            + Add Session
          </button>
        ) : (
          <form onSubmit={handleAddSession} className="bg-background-secondary border border-border rounded-lg p-6 mb-8">
            <FormInput
              label="Session Name"
              name="name"
              type="text"
              value={newSession.name}
              onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
              placeholder="e.g. Breakfast, Lunch, Dinner"
              required
            />
            <FormInput
              label="Date"
              name="date"
              type="date"
              value={newSession.date}
              onChange={(e) => setNewSession({ ...newSession, date: e.target.value })}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Start Time"
                name="startTime"
                type="time"
                value={newSession.startTime}
                onChange={(e) => setNewSession({ ...newSession, startTime: e.target.value })}
                required
              />
              <FormInput
                label="End Time"
                name="endTime"
                type="time"
                value={newSession.endTime}
                onChange={(e) => setNewSession({ ...newSession, endTime: e.target.value })}
                required
              />
            </div>
            <div className="flex gap-4 mt-6">
              <button type="submit" className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors font-medium">
                Add Session
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 bg-background-secondary border border-border rounded-lg hover:bg-background transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="bg-background-secondary border border-border rounded-lg overflow-hidden">
          {sessions.length === 0 ? (
            <div className="p-8 text-center text-foreground-secondary">No sessions configured</div>
          ) : (
            <table className="w-full">
              <thead className="border-b border-border bg-background">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Time</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id} className="border-b border-border hover:bg-background transition-colors">
                    <td className="px-6 py-4 text-foreground">{session.name}</td>
                    <td className="px-6 py-4 text-foreground">{new Date(session.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-foreground">{session.start_time} — {session.end_time}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteSession(session.id)}
                        className="text-red-600 hover:text-red-800 font-medium text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
