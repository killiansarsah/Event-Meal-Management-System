'use client';

import { ProtectFinanceTeam } from '@/components/ProtectFinanceTeam';
import PaymentsOverviewContent from './PaymentsOverviewContent';

export const dynamic = 'force-dynamic';

export default function PaymentsPage() {
  return (
    <ProtectFinanceTeam>
      <PaymentsOverviewContent />
    </ProtectFinanceTeam>
  );
}
