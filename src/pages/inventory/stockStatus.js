import { addDays, dateKey } from '@/utils/format';

/** Derive a medicine's stock status for badges & filters. */
export function stockStatus(med, today = dateKey(new Date())) {
  const soon = dateKey(addDays(new Date(), 30));
  if (med.expiryDate < today) return { id: 'expired', label: 'Expired', tone: 'red' };
  if (med.currentStock <= 0) return { id: 'out', label: 'Out of stock', tone: 'red' };
  if (med.currentStock <= med.minStock) return { id: 'low', label: 'Low stock', tone: 'amber' };
  if (med.expiryDate <= soon) return { id: 'expiring', label: 'Expiring soon', tone: 'violet' };
  return { id: 'ok', label: 'In stock', tone: 'green' };
}
