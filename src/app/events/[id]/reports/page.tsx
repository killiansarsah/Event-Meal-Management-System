import { ProtectOrganizer } from '@/components/ProtectOrganizer';
import ReportsContent from './ReportsContent';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Reports - Elira Event Platform',
  description: 'View event reports and analytics',
};

interface Props {
  params: { id: string };
}

export default function ReportsPage({ params }: Props) {
  return (
    <ProtectOrganizer>
      <ReportsContent eventId={params.id} />
    </ProtectOrganizer>
  );
}
