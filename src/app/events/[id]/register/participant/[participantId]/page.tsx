'use client';

import { ProtectRegistrationStaff } from '@/components/ProtectRegistrationStaff';
import ParticipantApprovalContent from './ParticipantApprovalContent';

export const dynamic = 'force-dynamic';

export default function ParticipantApprovalPage({
  params,
}: {
  params: { id: string; participantId: string };
}) {
  return (
    <ProtectRegistrationStaff>
      <ParticipantApprovalContent eventId={params.id} participantId={params.participantId} />
    </ProtectRegistrationStaff>
  );
}
