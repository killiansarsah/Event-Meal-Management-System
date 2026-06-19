import { ProtectOrganizer } from '@/components/ProtectOrganizer';
import CreateEventContent from './CreateEventContent';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Create New Event - Elira Event Platform',
  description: 'Create and configure a new event',
};

export default function CreateEventPage() {
  return (
    <ProtectOrganizer>
      <CreateEventContent />
    </ProtectOrganizer>
  );
}
