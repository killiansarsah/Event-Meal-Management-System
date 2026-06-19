import { ProtectOrganizer } from '@/components/ProtectOrganizer';
import ViewParticipantsContent from './ViewParticipantsContent';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'View Participants - Elira Event Platform',
  description: 'Manage event participants',
};

interface Props {
  params: { id: string };
}

export default function ViewParticipantsPage({ params }: Props) {
  return (
    <ProtectOrganizer>
      <ViewParticipantsContent eventId={params.id} />
    </ProtectOrganizer>
  );
}
