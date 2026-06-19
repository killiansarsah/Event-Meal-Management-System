'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface AuditLogEntry {
  id: string;
  action: string;
  entity_type: string;
  created_at: string;
  details: Record<string, any> | null;
}

interface DashboardStats {
  totalOrganizers: number;
  totalEvents: number;
  recentActivity: AuditLogEntry[];
}

export default function AdminDashboardContent() {
  const supabase = createClient();
  const [stats, setStats] = useState<DashboardStats>({
    totalOrganizers: 0,
    totalEvents: 0,
    recentActivity: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get total organizers
        const { count: organizerCount } = await supabase
          .from('tenants')
          .select('id', { count: 'exact' });

        // Get total events
        const { count: eventCount } = await supabase
          .from('events')
          .select('id', { count: 'exact' });

        // Get recent activity (last 10)
        const { data: recentLogs } = await supabase
          .from('audit_logs')
          .select('id, action, entity_type, created_at, details')
          .order('created_at', { ascending: false })
          .limit(10);

        setStats({
          totalOrganizers: organizerCount || 0,
          totalEvents: eventCount || 0,
          recentActivity: recentLogs || [],
        });
      } catch (err) {
        console.error('[v0] Error fetching dashboard stats:', err);
        setError('Failed to load dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [supabase]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent"></div>
          <p className="mt-4 text-foreground-secondary">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background-secondary sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold text-foreground">Super Admin Dashboard</h1>
          <p className="mt-2 text-foreground-secondary">Platform administration & organizer management</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-error-light/10 border border-error-light text-error">
            {error}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Organizers */}
          <div className="bg-background-secondary rounded-lg border border-border p-6">
            <div className="text-foreground-secondary text-sm font-medium mb-2">Total Organizers</div>
            <div className="text-4xl font-bold text-foreground">{stats.totalOrganizers}</div>
            <div className="mt-4">
              <Link
                href="/admin/organizers"
                className="text-accent hover:text-accent-hover text-sm font-medium"
              >
                Manage Organizers →
              </Link>
            </div>
          </div>

          {/* Total Events */}
          <div className="bg-background-secondary rounded-lg border border-border p-6">
            <div className="text-foreground-secondary text-sm font-medium mb-2">Total Events</div>
            <div className="text-4xl font-bold text-foreground">{stats.totalEvents}</div>
            <p className="mt-4 text-foreground-secondary text-sm">Across all organizers</p>
          </div>

          {/* Platform Status */}
          <div className="bg-background-secondary rounded-lg border border-border p-6">
            <div className="text-foreground-secondary text-sm font-medium mb-2">Platform Status</div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-success-light rounded-full animate-pulse"></div>
              <span className="text-foreground font-medium">Operational</span>
            </div>
            <p className="mt-4 text-foreground-secondary text-sm">All systems normal</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-background-secondary rounded-lg border border-border">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">Recent Activity</h2>
            <p className="text-foreground-secondary text-sm mt-1">Last 10 actions across the platform</p>
          </div>

          <div className="divide-y divide-border">
            {stats.recentActivity.length === 0 ? (
              <div className="p-6 text-center text-foreground-secondary">No recent activity</div>
            ) : (
              stats.recentActivity.map((log) => (
                <div key={log.id} className="p-4 hover:bg-background-secondary/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-foreground capitalize">
                        {log.action.replace(/_/g, ' ')}
                      </div>
                      <div className="text-foreground-secondary text-sm mt-1">
                        {log.entity_type && `${log.entity_type.replace(/_/g, ' ')}`}
                      </div>
                    </div>
                    <div className="text-foreground-tertiary text-sm">
                      {new Date(log.created_at).toLocaleDateString()}{' '}
                      {new Date(log.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
