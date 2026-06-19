'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Organizer {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'suspended';
  createdAt: string;
  eventCount: number;
}

export default function ManageOrganizersContent() {
  const supabase = createClient();
  const router = useRouter();
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState<string | null>(null);

  const fetchOrganizers = useCallback(async () => {
    try {
      // Get all tenants
      const { data: tenants, error: tenantError } = await supabase
        .from('tenants')
        .select('id, name, email, status, created_at')
        .order('created_at', { ascending: false });

      if (tenantError) throw tenantError;

      // Get event counts for each tenant
      const organizersData = await Promise.all(
        (tenants || []).map(async (tenant) => {
          const { count } = await supabase
            .from('events')
            .select('id', { count: 'exact' })
            .eq('tenant_id', tenant.id);

          return {
            id: tenant.id,
            name: tenant.name,
            email: tenant.email,
            status: tenant.status,
            createdAt: tenant.created_at,
            eventCount: count || 0,
          };
        })
      );

      setOrganizers(organizersData);
    } catch (err) {
      console.error('[v0] Error fetching organizers:', err);
      setError('Failed to load organizers');
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  const toggleStatus = useCallback(
    async (organizerId: string, currentStatus: string) => {
      try {
        setIsTogglingStatus(organizerId);
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';

        const { error } = await supabase
          .from('tenants')
          .update({ status: newStatus })
          .eq('id', organizerId);

        if (error) throw error;

        // Update local state
        setOrganizers((prev) =>
          prev.map((org) =>
            org.id === organizerId ? { ...org, status: newStatus } : org
          )
        );

        setSuccessMessage(
          `Organizer ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`
        );
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err) {
        console.error('[v0] Error toggling status:', err);
        setError('Failed to update organizer status');
      } finally {
        setIsTogglingStatus(null);
      }
    },
    [supabase]
  );

  useEffect(() => {
    fetchOrganizers();
  }, [fetchOrganizers]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent"></div>
          <p className="mt-4 text-foreground-secondary">Loading organizers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background-secondary sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Manage Organizers</h1>
            <p className="mt-2 text-foreground-secondary">View and manage all event organizers</p>
          </div>
          <Link
            href="/admin/organizers/new"
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors font-medium"
          >
            Create New Organizer
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-error-light/10 border border-error-light text-error">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 rounded-lg bg-success-light/10 border border-success-light text-success-dark">
            {successMessage}
          </div>
        )}

        {/* Organizers Table */}
        <div className="bg-background-secondary rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                    Organizer Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                    Events
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                    Created
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {organizers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-foreground-secondary">
                      No organizers found
                    </td>
                  </tr>
                ) : (
                  organizers.map((org) => (
                    <tr
                      key={org.id}
                      className="hover:bg-background-secondary/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{org.name}</div>
                      </td>
                      <td className="px-6 py-4 text-foreground-secondary text-sm">{org.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            org.status === 'active'
                              ? 'bg-success-light/20 text-success-dark'
                              : 'bg-error-light/20 text-error'
                          }`}
                        >
                          {org.status === 'active' ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-foreground">{org.eventCount}</td>
                      <td className="px-6 py-4 text-foreground-secondary text-sm">
                        {new Date(org.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm space-x-3 flex items-center">
                        <Link
                          href={`/admin/organizers/${org.id}`}
                          className="text-accent hover:text-accent-hover font-medium"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => toggleStatus(org.id, org.status)}
                          disabled={isTogglingStatus === org.id}
                          className={`font-medium ${
                            org.status === 'active'
                              ? 'text-error hover:text-error-dark'
                              : 'text-success-dark hover:text-success-light'
                          } disabled:opacity-50`}
                        >
                          {isTogglingStatus === org.id
                            ? 'Updating...'
                            : org.status === 'active'
                              ? 'Suspend'
                              : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
