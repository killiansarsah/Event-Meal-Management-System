import { ProtectOrganizer } from '@/components/ProtectOrganizer';
import ManageSessionsContent from './ManageSessionsContent';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Manage Meal Sessions - Elira Event Platform',
  description: 'Configure meal sessions',
};

interface Props {
  params: { id: string };
}

export default function ManageSessionsPage({ params }: Props) {
  return (
    <ProtectOrganizer>
      <ManageSessionsContent eventId={params.id} />
    </ProtectOrganizer>
  );
}
