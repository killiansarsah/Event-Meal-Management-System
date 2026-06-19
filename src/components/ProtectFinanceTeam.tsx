'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * ProtectFinanceTeam: Ensures only finance_team users can access a page.
 * Redirects all other roles to /login.
 * Also stores event_id in sessionStorage for finance team to access.
 */
export function ProtectFinanceTeam({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createClient();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          router.push('/login');
          return;
        }

        // Get the user's role and event_id from the database
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role, event_id, tenant_id')
          .eq('id', user.id)
          .single();

        if (userError || !userData) {
          router.push('/login');
          return;
        }

        // Check if user is finance_team
        if (userData.role !== 'finance_team') {
          router.push('/login');
          return;
        }

        // Store event_id and tenant_id in sessionStorage for later use
        if (userData.event_id) {
          sessionStorage.setItem('event_id', userData.event_id);
        }
        if (userData.tenant_id) {
          sessionStorage.setItem('tenant_id', userData.tenant_id);
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error('[v0] Auth check error:', error);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, supabase]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent"></div>
          <p className="mt-4 text-foreground-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
