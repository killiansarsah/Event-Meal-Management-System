'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Participant {
  id: string;
  full_name: string;
  address: string;
  category_id: string;
  payment_status: string;
}

export default function SearchPreRegisteredContent({ eventId }: { eventId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    setError(null);

    // Only search if query has at least 2 characters
    if (query.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const { data, error: queryError } = await supabase
        .from('participants')
        .select('id, full_name, address, category_id, payment_status')
        .eq('event_id', eventId)
        .ilike('full_name', `%${query}%`)
        .order('full_name');

      if (queryError) {
        setError('Search failed');
        setResults([]);
        return;
      }

      setResults(data || []);
    } catch (err) {
      console.error('[v0] Search error:', err);
      setError('An error occurred during search');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [eventId, supabase]);

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Link href={`/events/${eventId}/register`} className="text-accent hover:underline mb-6 inline-block">
          ← Back to Dashboard
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">Search Pre-Registered</h1>
        <p className="text-foreground-secondary mb-8">Find and approve pre-registered participants</p>

        {/* Search Input */}
        <div className="bg-background-secondary border border-border rounded-lg p-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Participant Name
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Type at least 2 characters to search..."
              className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
              disabled={loading}
            />
            <p className="text-xs text-foreground-tertiary mt-2">
              Live search: Results update as you type (minimum 2 characters)
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-error/10 border border-error text-error-foreground rounded-lg p-4 mb-6">
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Results */}
        {hasSearched && (
          <div className="bg-background-secondary border border-border rounded-lg overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent"></div>
                <p className="mt-4 text-foreground-secondary">Searching...</p>
              </div>
            ) : results.length > 0 ? (
              <div className="divide-y divide-border">
                {results.map((participant) => (
                  <div
                    key={participant.id}
                    className="p-4 hover:bg-background/50 transition-colors cursor-pointer"
                    onClick={() =>
                      router.push(`/events/${eventId}/register/participant/${participant.id}`)
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{participant.full_name}</p>
                        <p className="text-sm text-foreground-secondary">{participant.address}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              participant.payment_status === 'pending'
                                ? 'bg-warning/20 text-warning-foreground'
                                : participant.payment_status === 'approved'
                                ? 'bg-success/20 text-success-foreground'
                                : 'bg-error/20 text-error-foreground'
                            }`}
                          >
                            {participant.payment_status.charAt(0).toUpperCase() +
                              participant.payment_status.slice(1)}
                          </span>
                        </div>
                      </div>
                      <div className="text-accent text-xl">→</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-foreground-secondary">
                No participants found matching &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        )}

        {/* Initial State */}
        {!hasSearched && (
          <div className="bg-background-tertiary border border-border rounded-lg p-12 text-center">
            <p className="text-foreground-secondary text-lg">
              Start typing a participant&apos;s name to search
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
