'use client';

import { ProtectRegistrationStaff } from '@/components/ProtectRegistrationStaff';
import RegistrationDashboardContent from './RegistrationDashboardContent';

export const dynamic = 'force-dynamic';

export default function RegistrationDashboardPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <ProtectRegistrationStaff>
      <RegistrationDashboardContent eventId={params.id} />
    </ProtectRegistrationStaff>
  );
}
