'use client';

import { ProtectRegistrationStaff } from '@/components/ProtectRegistrationStaff';
import SearchPreRegisteredContent from './SearchPreRegisteredContent';

export const dynamic = 'force-dynamic';

export default function SearchPreRegisteredPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <ProtectRegistrationStaff>
      <SearchPreRegisteredContent eventId={params.id} />
    </ProtectRegistrationStaff>
  );
}
