import { ProtectOrganizer } from '@/components/ProtectOrganizer';
import ManageStaffContent from './ManageStaffContent';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Manage Staff - Elira Event Platform',
  description: 'Invite and manage event staff',
};

interface Props {
  params: { id: string };
}

export default function ManageStaffPage({ params }: Props) {
  return (
    <ProtectOrganizer>
      <ManageStaffContent eventId={params.id} />
    </ProtectOrganizer>
  );
}
