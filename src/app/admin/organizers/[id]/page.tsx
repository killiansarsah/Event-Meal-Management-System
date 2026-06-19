import { ProtectAdmin } from '@/components/ProtectAdmin';
import OrganizerDetailsContent from './OrganizerDetailsContent';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Organizer Details - Elira Event Platform',
  description: 'View and manage organizer details',
};

export default function OrganizerDetails({
  params,
}: {
  params: { id: string };
}) {
  return (
    <ProtectAdmin>
      <OrganizerDetailsContent organizerId={params.id} />
    </ProtectAdmin>
  );
}
