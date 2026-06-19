import { ProtectAdmin } from '@/components/ProtectAdmin';
import ManageOrganizersContent from './ManageOrganizersContent';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Manage Organizers - Elira Event Platform',
  description: 'View and manage all event organizers',
};

export default function ManageOrganizers() {
  return (
    <ProtectAdmin>
      <ManageOrganizersContent />
    </ProtectAdmin>
  );
}
