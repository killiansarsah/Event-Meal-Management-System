import { ProtectOrganizer } from '@/components/ProtectOrganizer';
import DashboardContent from './DashboardContent';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Organizer Dashboard - Elira Event Platform',
  description: 'Manage your events and registrations',
};

export default function DashboardPage() {
  return (
    <ProtectOrganizer>
      <DashboardContent />
    </ProtectOrganizer>
  );
}
