import { CATEGORIES } from '@/data/constants';

/**
 * Fee rule types:
 *  - full     → full consultation fee
 *  - fixed    → a fixed reduced fee (value = fee amount)
 *  - percent  → percentage discount on the consultation fee (value = % off)
 *  - free     → consultation fee waived completely
 */
export const FEE_RULE_TYPES = [
  { id: 'full', label: 'Full fee' },
  { id: 'fixed', label: 'Fixed reduced fee' },
  { id: 'percent', label: 'Percentage off' },
  { id: 'free', label: 'Free / waived' },
];

export function describeRule(rule, baseFee, currency = 'Rs.') {
  if (!rule) return 'Full fee';
  switch (rule.type) {
    case 'free':
      return 'Fee waived (Rs. 0)'.replace('Rs.', currency);
    case 'fixed':
      return `Reduced fee ${currency} ${Number(rule.value).toLocaleString()}`;
    case 'percent':
      return `${rule.value}% off consultation`;
    default:
      return `Full fee ${currency} ${Number(baseFee).toLocaleString()}`;
  }
}

/**
 * Consultation fee for a billing category.
 * Returns the base fee, the amount waived by the category and the net fee.
 */
export function computeConsultationFee(categoryId, settings) {
  const base = Number(settings?.fees?.consultationFee) || 0;
  const rule = settings?.feeRules?.[categoryId] || { type: 'full' };
  let fee = base;
  if (rule.type === 'free') fee = 0;
  else if (rule.type === 'fixed') fee = Math.min(base, Math.max(0, Number(rule.value) || 0));
  else if (rule.type === 'percent') fee = Math.round(base * (1 - (Number(rule.value) || 0) / 100));
  fee = Math.max(0, fee);
  return {
    base,
    waived: base - fee,
    fee,
    rule,
    label: CATEGORIES[categoryId]?.label || 'Regular Patient',
    isFree: fee === 0,
    isReduced: fee > 0 && fee < base,
  };
}

/**
 * Medicine charges come from clinic-prescription items that were
 * actually dispensed / administered by the clinic.
 */
export function medicineChargesForVisit(visit, medicines) {
  const items = (visit?.clinicRx?.items || []).filter((i) => i.dispensed);
  return items.map((i) => {
    const med = medicines.find((m) => m.id === i.medicineId);
    const qty = Number(i.dispensedQty ?? i.quantity) || 0;
    const unitPrice = Number(med?.sellingPrice) || 0;
    return {
      medicineId: i.medicineId,
      name: med?.name || i.name,
      unit: med?.unit || '',
      qty,
      unitPrice,
      total: qty * unitPrice,
    };
  });
}

/**
 * Compute every bill total from its parts.
 */
export function computeBillTotals({
  consultationBase = 0,
  categoryWaiver = 0,
  medicines = [],
  additionalCharges = [],
  discountType = 'amount',
  discountValue = 0,
  amountPaid = 0,
}) {
  const medicineCharges = medicines.reduce((a, m) => a + (Number(m.total) || 0), 0);
  const additionalTotal = additionalCharges.reduce((a, c) => a + (Number(c.amount) || 0), 0);
  const subtotal = Number(consultationBase) + medicineCharges + additionalTotal;
  const afterWaiver = subtotal - Number(categoryWaiver);
  const rawDiscount =
    discountType === 'percent'
      ? Math.round((afterWaiver * (Number(discountValue) || 0)) / 100)
      : Number(discountValue) || 0;
  const manualDiscount = Math.min(Math.max(0, rawDiscount), Math.max(0, afterWaiver));
  const totalDiscount = Number(categoryWaiver) + manualDiscount;
  const total = Math.max(0, subtotal - totalDiscount);
  const paid = Math.max(0, Number(amountPaid) || 0);
  const balance = Math.max(0, total - paid);
  const change = Math.max(0, paid - total);
  let paymentStatus = 'unpaid';
  if (total === 0 || paid >= total) paymentStatus = 'paid';
  else if (paid > 0) paymentStatus = 'partial';

  return {
    medicineCharges,
    additionalTotal,
    subtotal,
    manualDiscount,
    totalDiscount,
    total,
    amountPaid: Math.min(paid, total),
    tendered: paid,
    balance,
    change,
    paymentStatus,
  };
}
