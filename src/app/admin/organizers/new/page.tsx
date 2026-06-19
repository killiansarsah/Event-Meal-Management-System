import { ProtectAdmin } from '@/components/ProtectAdmin';
import CreateOrganizerContent from './CreateOrganizerContent';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Create New Organizer - Elira Event Platform',
  description: 'Invite and create a new event organizer',
};

export default function CreateOrganizer() {
  return (
    <ProtectAdmin>
      <CreateOrganizerContent />
    </ProtectAdmin>
  );
}
