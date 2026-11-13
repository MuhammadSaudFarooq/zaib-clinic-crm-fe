import { CATEGORIES } from '@/data/constants';
import { addDays, dateKey, formatShortDate, parseKey } from './format';

export const FOLLOW_UP_IDS = ['follow_up', 'same_day_follow_up', 'next_day_follow_up'];
export const ZERO_FEE_IDS = ['free', 'no_charge', 'same_day_follow_up'];

export const isActiveVisit = (v) => v.status !== 'cancelled';

/** Build an inclusive list of date keys */
export function dayRange(fromKey, toKey) {
  const out = [];
  let d = parseKey(fromKey);
  const end = parseKey(toKey);
  while (d <= end) {
    out.push(dateKey(d));
    d = addDays(d, 1);
  }
  return out;
}

export function lastNDays(n, endKey = dateKey(new Date())) {
  return dayRange(dateKey(addDays(parseKey(endKey), -(n - 1))), endKey);
}

/** Split a bill into revenue components (manual discount is taken from consultation first). */
export function billComponents(b) {
  let consultation = b.consultationNet;
  let medicines = b.medicineCharges;
  let other = b.additionalTotal;
  let disc = b.discount?.amount || 0;
  const take = (v) => {
    const t = Math.min(v, disc);
    disc -= t;
    return v - t;
  };
  consultation = take(consultation);
  medicines = take(medicines);
  other = take(other);
  return { consultation, medicines, other };
}

export function dailySeries(visits, bills, days) {
  const map = Object.fromEntries(
    days.map((k) => [
      k,
      {
        date: k,
        label: formatShortDate(k),
        visits: 0,
        morning: 0,
        evening: 0,
        newPatients: 0,
        followUps: 0,
        free: 0,
        consultation: 0,
        medicines: 0,
        other: 0,
        revenue: 0,
        collected: 0,
      },
    ]),
  );
  for (const v of visits) {
    const row = map[v.date];
    if (!row || !isActiveVisit(v)) continue;
    row.visits += 1;
    row[v.session === 'evening' ? 'evening' : 'morning'] += 1;
    if (FOLLOW_UP_IDS.includes(v.category)) row.followUps += 1;
    if (ZERO_FEE_IDS.includes(v.category)) row.free += 1;
  }
  for (const b of bills) {
    const row = map[dateKey(b.createdAt)];
    if (!row) continue;
    const c = billComponents(b);
    row.consultation += c.consultation;
    row.medicines += c.medicines;
    row.other += c.other;
    row.revenue += b.total;
    row.collected += b.amountPaid;
  }
  return days.map((k) => map[k]);
}

export function categoryBreakdown(visits) {
  const counts = {};
  for (const v of visits) {
    if (!isActiveVisit(v)) continue;
    counts[v.category] = (counts[v.category] || 0) + 1;
  }
  return Object.values(CATEGORIES)
    .filter((c) => c.kind === 'billing')
    .map((c) => ({ id: c.id, label: c.label, value: counts[c.id] || 0 }))
    .sort((a, b) => b.value - a.value);
}

/** Groups categories into 4 readable buckets for donut charts. */
export function categoryGroups(visits) {
  const groups = [
    { id: 'regular', label: 'Regular', ids: ['regular'], value: 0 },
    { id: 'followup', label: 'Follow-ups', ids: FOLLOW_UP_IDS, value: 0 },
    { id: 'free', label: 'Free & No-charge', ids: ['free', 'no_charge'], value: 0 },
    { id: 'discounted', label: 'Discounted', ids: ['discounted'], value: 0 },
  ];
  for (const v of visits) {
    if (!isActiveVisit(v)) continue;
    const g = groups.find((x) => x.ids.includes(v.category));
    if (g) g.value += 1;
  }
  return groups;
}

export function medicineConsumption(movements, medicines, fromKey, toKey) {
  const byMed = {};
  for (const m of movements) {
    if (m.type !== 'out' || m.reason !== 'dispensed') continue;
    const k = dateKey(m.date);
    if (k < fromKey || k > toKey) continue;
    byMed[m.medicineId] = (byMed[m.medicineId] || 0) + m.quantity;
  }
  return medicines
    .map((med) => ({
      id: med.id,
      name: med.name,
      unit: med.unit,
      category: med.category,
      qty: byMed[med.id] || 0,
      value: (byMed[med.id] || 0) * med.sellingPrice,
    }))
    .filter((r) => r.qty > 0)
    .sort((a, b) => b.qty - a.qty);
}

export function paymentBreakdown(bills) {
  const out = { cash: { amount: 0, count: 0 }, card: { amount: 0, count: 0 }, other: { amount: 0, count: 0 } };
  for (const b of bills) {
    const k = out[b.paymentMethod] ? b.paymentMethod : 'other';
    out[k].amount += b.amountPaid;
    out[k].count += 1;
  }
  return out;
}

export function monthKey(input) {
  return dateKey(input).slice(0, 7);
}

export function percentChange(curr, prev) {
  if (!prev) return curr ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}
