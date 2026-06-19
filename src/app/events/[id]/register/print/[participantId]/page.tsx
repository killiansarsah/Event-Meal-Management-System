'use client';

import { ProtectRegistrationStaff } from '@/components/ProtectRegistrationStaff';
import StickerPrintPreviewContent from './StickerPrintPreviewContent';

export const dynamic = 'force-dynamic';

export default function StickerPrintPreviewPage({
  params,
}: {
  params: { id: string; participantId: string };
}) {
  return (
    <ProtectRegistrationStaff>
      <StickerPrintPreviewContent eventId={params.id} participantId={params.participantId} />
    </ProtectRegistrationStaff>
  );
}
