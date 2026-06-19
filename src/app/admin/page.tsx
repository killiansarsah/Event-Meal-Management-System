import { ProtectAdmin } from '@/components/ProtectAdmin';
import AdminDashboardContent from './AdminDashboardContent';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Super Admin Dashboard - Elira Event Platform',
  description: 'Platform administration dashboard',
};

export default function AdminDashboard() {
  return (
    <ProtectAdmin>
      <AdminDashboardContent />
    </ProtectAdmin>
  );
}
