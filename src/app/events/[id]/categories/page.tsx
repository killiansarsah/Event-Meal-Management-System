import { ProtectOrganizer } from '@/components/ProtectOrganizer';
import ManageCategoriesContent from './ManageCategoriesContent';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Manage Categories - Elira Event Platform',
  description: 'Configure participant categories',
};

interface Props {
  params: { id: string };
}

export default function ManageCategoriesPage({ params }: Props) {
  return (
    <ProtectOrganizer>
      <ManageCategoriesContent eventId={params.id} />
    </ProtectOrganizer>
  );
}
