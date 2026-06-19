import { ProtectOrganizer } from '@/components/ProtectOrganizer';
import EventOverviewContent from './EventOverviewContent';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Event Overview - Elira Event Platform',
  description: 'Manage event details and configuration',
};

interface Props {
  params: {
    id: string;
  };
}

export default function EventOverviewPage({ params }: Props) {
  return (
    <ProtectOrganizer>
      <EventOverviewContent eventId={params.id} />
    </ProtectOrganizer>
  );
}
