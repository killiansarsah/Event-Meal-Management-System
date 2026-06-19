'use client';

import { ProtectRegistrationStaff } from '@/components/ProtectRegistrationStaff';
import NewRegistrationContent from './NewRegistrationContent';

export const dynamic = 'force-dynamic';

export default function NewRegistrationPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <ProtectRegistrationStaff>
      <NewRegistrationContent eventId={params.id} />
    </ProtectRegistrationStaff>
  );
}
