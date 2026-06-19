'use client';

import { ProtectCateringStaff } from '@/components/ProtectCateringStaff';
import MealScanningContent from './MealScanningContent';

export const dynamic = 'force-dynamic';

export default function MealScanningPage() {
  return (
    <ProtectCateringStaff>
      <MealScanningContent />
    </ProtectCateringStaff>
  );
}
