import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Banknote,
  CalendarDays,
  CalendarRange,
  CreditCard,
  Download,
  HeartHandshake,
  Package,
  Pill,
  Receipt,
  Repeat,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Tabs, { Segmented } from '@/components/ui/Tabs';
import StatCard from '@/components/ui/StatCard';
import CategoryTag from '@/components/ui/CategoryTag';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { axisProps, ChartLegend, ChartTooltip, gridProps, SERIES, SINGLE, yAxisProps } from '@/components/charts/ChartKit';
import { CATEGORIES, PAYMENT_METHODS } from '@/data/constants';
import { useData } from '@/context/DataContext';
import { billComponents, categoryBreakdown, dailySeries, dayRange, FOLLOW_UP_IDS, medicineConsumption, monthKey, paymentBreakdown, ZERO_FEE_IDS } from '@/utils/analytics';
import { addDays, dateKey, downloadFile, formatCompact, formatCurrency, formatDate, formatMonth, formatNumber, toCSV } from '@/utils/format';
import { stockStatus } from '@/pages/inventory/stockStatus';

const PRESETS = [
  { id: 'today', label: 'Today' },
  { id: '7', label: '7 days' },
  { id: '30', label: '30 days' },
  { id: 'month', label: 'This month' },
  { id: '60', label: '60 days' },
  { id: 'custom', label: 'Custom' },
];

const TABS = [
  { id: 'patients', label: 'Patients', icon: Users },
  { id: 'revenue', label: 'Revenue', icon: Banknote },
  { id: 'free', label: 'Free patients', icon: HeartHandshake },
  { id: 'followup', label: 'Follow-ups', icon: Repeat },
  { id: 'medicine', label: 'Medicine consumption', icon: Pill },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'payments', label: 'Payment methods', icon: CreditCard },
];

function rangeFor(preset, custom, today) {
  const t = new Date();
  if (preset === 'today') return [today, today];
  if (preset === 'month') return [`${today.slice(0, 7)}-01`, today];
  if (preset === 'custom') return [custom.from, custom.to];
  return [dateKey(addDays(t, -(Number(preset) - 1))), today];
}

function SimpleTable({ columns, rows, footer, empty = 'No data in this range' }) {
  if (!rows.length) return <EmptyState icon={CalendarRange} title={empty} />;
  return (
    <div className="table-wrap">
      <table className="table table--compact">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.label} className={c.num ? 'num' : undefined}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.key || i}>
              {columns.map((c) => (
                <td key={c.label} className={c.num ? 'num' : undefined}>
                  {c.render ? c.render(r) : c.value(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer && (
          <tfoot>
            <tr>
              {footer.map((f, i) => (
                <td key={i} className={columns[i]?.num ? 'num' : undefined}>
                  {f}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

export default function Reports() {
  const { state, lookup, today } = useData();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'patients';
  const setTab = (t) => setParams({ tab: t }, { replace: true });
  const [preset, setPreset] = useState('30');
  const [custom, setCustom] = useState({ from: dateKey(addDays(new Date(), -13)), to: today });
  const cur = state.settings.fees.currency;
  const money = (v) => formatCurrency(v, cur);

  const [from, to] = rangeFor(preset, custom, today);
  const days = useMemo(() => dayRange(from, to), [from, to]);
  const visits = useMemo(() => state.visits.filter((v) => v.date >= from && v.date <= to && v.status !== 'cancelled'), [state.visits, from, to]);
  const bills = useMemo(() => state.bills.filter((b) => dateKey(b.createdAt) >= from && dateKey(b.createdAt) <= to), [state.bills, from, to]);
  const series = useMemo(() => dailySeries(state.visits, state.bills, days), [state.visits, state.bills, days]);
  const newPatients = useMemo(() => state.patients.filter((p) => dateKey(p.registeredAt) >= from && dateKey(p.registeredAt) <= to), [state.patients, from, to]);

  const seriesWithNew = useMemo(() => {
    const byDay = {};
    newPatients.forEach((p) => {
      const k = dateKey(p.registeredAt);
      byDay[k] = (byDay[k] || 0) + 1;
    });
    return series.map((r) => ({ ...r, newPatients: byDay[r.date] || 0 }));
  }, [series, newPatients]);

  const monthly = useMemo(() => {
    const map = {};
    for (const v of state.visits) {
      if (v.status === 'cancelled') continue;
      const k = v.date.slice(0, 7);
      const m = (map[k] ||= { month: k, visits: 0, patients: new Set(), newPatients: 0, revenue: 0, days: new Set(), followUps: 0, free: 0 });
      m.visits += 1;
      m.patients.add(v.patientId);
      m.days.add(v.date);
      if (FOLLOW_UP_IDS.includes(v.category)) m.followUps += 1;
      if (ZERO_FEE_IDS.includes(v.category)) m.free += 1;
    }
    for (const p of state.patients) {
      const k = monthKey(p.registeredAt);
      if (map[k]) map[k].newPatients += 1;
    }
    for (const b of state.bills) {
      const k = monthKey(b.createdAt);
      if (map[k]) map[k].revenue += b.amountPaid;
    }
    return Object.values(map)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((m) => ({ ...m, label: formatMonth(m.month), unique: m.patients.size, avg: Math.round(m.visits / m.days.size) }));
  }, [state.visits, state.patients, state.bills]);

  const totals = useMemo(() => {
    const billed = bills.reduce((a, b) => a + b.total, 0);
    const collected = bills.reduce((a, b) => a + b.amountPaid, 0);
    const discounts = bills.reduce((a, b) => a + b.totalDiscount, 0);
    const outstanding = bills.reduce((a, b) => a + b.balance, 0);
    const comp = bills.reduce(
      (acc, b) => {
        const c = billComponents(b);
        acc.consultation += c.consultation;
        acc.medicines += c.medicines;
        acc.other += c.other;
        return acc;
      },
      { consultation: 0, medicines: 0, other: 0 },
    );
    return { billed, collected, discounts, outstanding, avg: bills.length ? Math.round(billed / bills.length) : 0, ...comp };
  }, [bills]);

  const freeVisits = visits.filter((v) => ZERO_FEE_IDS.includes(v.category) || (v.billId && lookup.bill[v.billId]?.consultationNet === 0));
  const followVisits = visits.filter((v) => FOLLOW_UP_IDS.includes(v.category));
  const consumption = useMemo(() => medicineConsumption(state.movements, state.medicines, from, to), [state.movements, state.medicines, from, to]);
  const payments = useMemo(() => paymentBreakdown(bills), [bills]);
  const payRows = PAYMENT_METHODS.map((m, i) => ({ key: m.id, label: m.label, color: SERIES[i], ...payments[m.id] }));
  const payTotal = payRows.reduce((a, r) => a + r.amount, 0);

  const inventoryRows = useMemo(() => {
    const per = {};
    for (const m of state.movements) {
      const k = dateKey(m.date);
      if (k < from || k > to) continue;
      const r = (per[m.medicineId] ||= { in: 0, out: 0, adj: 0 });
      if (m.type === 'in') r.in += m.quantity;
      else if (m.type === 'out') r.out += m.quantity;
      else r.adj += m.quantity;
    }
    return state.medicines.map((m) => ({
      key: m.id,
      med: m,
      in: per[m.id]?.in || 0,
      out: per[m.id]?.out || 0,
      adj: per[m.id]?.adj || 0,
      value: Math.max(0, m.currentStock) * m.purchasePrice,
      status: stockStatus(m, today),
    }));
  }, [state.movements, state.medicines, from, to, today]);

  const exportTab = () => {
    const file = `zaib-clinic-${tab}-report-${from}-to-${to}.csv`;
    const map = {
      patients: () =>
        toCSV(seriesWithNew, [
          { label: 'Date', value: (r) => r.date },
          { label: 'Visits', value: (r) => r.visits },
          { label: 'Morning', value: (r) => r.morning },
          { label: 'Evening', value: (r) => r.evening },
          { label: 'New patients', value: (r) => r.newPatients },
          { label: 'Follow-ups', value: (r) => r.followUps },
          { label: 'Free', value: (r) => r.free },
        ]),
      revenue: () =>
        toCSV(series, [
          { label: 'Date', value: (r) => r.date },
          { label: 'Consultation', value: (r) => r.consultation },
          { label: 'Medicines', value: (r) => r.medicines },
          { label: 'Other', value: (r) => r.other },
          { label: 'Billed', value: (r) => r.revenue },
          { label: 'Collected', value: (r) => r.collected },
        ]),
      free: () =>
        toCSV(freeVisits, [
          { label: 'Date', value: (v) => v.date },
          { label: 'Patient', value: (v) => lookup.patient[v.patientId]?.name },
          { label: 'Patient ID', value: (v) => v.patientId },
          { label: 'Category', value: (v) => CATEGORIES[v.category]?.label },
          { label: 'Waived', value: (v) => lookup.bill[v.billId]?.categoryWaiver ?? '' },
        ]),
      followup: () =>
        toCSV(followVisits, [
          { label: 'Date', value: (v) => v.date },
          { label: 'Patient', value: (v) => lookup.patient[v.patientId]?.name },
          { label: 'Type', value: (v) => CATEGORIES[v.category]?.label },
          { label: 'Consultation charged', value: (v) => lookup.bill[v.billId]?.consultationNet ?? '' },
        ]),
      medicine: () =>
        toCSV(consumption, [
          { label: 'Medicine', value: (r) => r.name },
          { label: 'Category', value: (r) => r.category },
          { label: 'Qty dispensed', value: (r) => r.qty },
          { label: 'Value', value: (r) => r.value },
        ]),
      inventory: () =>
        toCSV(inventoryRows, [
          { label: 'Medicine', value: (r) => r.med.name },
          { label: 'Received', value: (r) => r.in },
          { label: 'Consumed', value: (r) => r.out },
          { label: 'Adjusted', value: (r) => r.adj },
          { label: 'Current stock', value: (r) => r.med.currentStock },
          { label: 'Status', value: (r) => r.status.label },
          { label: 'Stock value', value: (r) => r.value },
        ]),
      payments: () =>
        toCSV(payRows, [
          { label: 'Method', value: (r) => r.label },
          { label: 'Bills', value: (r) => r.count },
          { label: 'Amount', value: (r) => r.amount },
        ]),
    };
    downloadFile(file, map[tab]());
  };

  const freeByCat = categoryBreakdown(freeVisits).filter((c) => c.value > 0);
  const followByCat = categoryBreakdown(followVisits).filter((c) => c.value > 0);

  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        subtitle={`${formatDate(from)} – ${formatDate(to)} · ${days.length} day${days.length === 1 ? '' : 's'}`}
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Reports' }]}
        actions={
          <Button variant="secondary" icon={Download} onClick={exportTab}>
            Export CSV
          </Button>
        }
      />

      <Card className="mb-16">
        <CardBody className="report-filters">
          <div className="flex items-center gap-8">
            <CalendarDays size={17} className="muted" />
            <strong className="text-sm">Date range</strong>
          </div>
          <Segmented options={PRESETS} value={preset} onChange={setPreset} />
          {preset === 'custom' && (
            <div className="date-range">
              <input type="date" className="input input--sm" value={custom.from} max={custom.to} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value || c.from }))} aria-label="From" />
              <span className="muted">to</span>
              <input type="date" className="input input--sm" value={custom.to} min={custom.from} max={today} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value || c.to }))} aria-label="To" />
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="mb-16">
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
      </Card>

      {/* ------------------------ Patients ------------------------ */}
      {tab === 'patients' && (
        <>
          <div className="grid grid-4 mb-16">
            <StatCard label="Total visits" value={formatNumber(visits.length)} icon={Users} tone="brand" />
            <StatCard label="Unique patients" value={formatNumber(new Set(visits.map((v) => v.patientId)).size)} icon={Users} tone="blue" />
            <StatCard label="New registrations" value={formatNumber(newPatients.length)} icon={TrendingUp} tone="green" />
            <StatCard label="Avg. visits / day" value={(visits.length / Math.max(1, days.length)).toFixed(1)} icon={CalendarDays} tone="gold" />
          </div>
          <div className="grid grid-2 mb-16">
            <Card>
              <CardHeader title="Daily patient report" subtitle="Visits & new registrations per day" />
              <CardBody>
                <ChartLegend
                  items={[
                    { label: 'Visits', color: SERIES[0] },
                    { label: 'New patients', color: SERIES[1] },
                  ]}
                />
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={seriesWithNew} margin={{ top: 10, right: 6, left: -12, bottom: 0 }} barGap={2}>
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={16} />
                      <YAxis {...yAxisProps} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(10,147,150,0.06)' }} />
                      <Bar dataKey="visits" name="Visits" fill={SERIES[0]} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="newPatients" name="New patients" fill={SERIES[1]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Monthly patient report" subtitle="All recorded months" />
              <CardBody>
                <ChartLegend items={[{ label: 'Visits', color: SERIES[0] }, { label: 'Unique patients', color: SERIES[2] }]} />
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthly} margin={{ top: 10, right: 6, left: -6, bottom: 0 }} barGap={2}>
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="label" {...axisProps} />
                      <YAxis {...yAxisProps} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(10,147,150,0.06)' }} />
                      <Bar dataKey="visits" name="Visits" fill={SERIES[0]} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="unique" name="Unique patients" fill={SERIES[2]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardBody>
            </Card>
          </div>
          <div className="grid grid-2">
            <Card>
              <CardHeader title="Daily breakdown" />
              <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                <SimpleTable
                  rows={[...seriesWithNew].reverse()}
                  columns={[
                    { label: 'Date', value: (r) => formatDate(r.date) },
                    { label: 'Visits', value: (r) => r.visits, num: true },
                    { label: 'Morning', value: (r) => r.morning, num: true },
                    { label: 'Evening', value: (r) => r.evening, num: true },
                    { label: 'New', value: (r) => r.newPatients, num: true },
                    { label: 'Follow-up', value: (r) => r.followUps, num: true },
                    { label: 'Free', value: (r) => r.free, num: true },
                  ]}
                  footer={['Total', visits.length, series.reduce((a, r) => a + r.morning, 0), series.reduce((a, r) => a + r.evening, 0), newPatients.length, series.reduce((a, r) => a + r.followUps, 0), series.reduce((a, r) => a + r.free, 0)]}
                />
              </div>
            </Card>
            <Card>
              <CardHeader title="Monthly summary" />
              <SimpleTable
                rows={[...monthly].reverse()}
                columns={[
                  { label: 'Month', value: (r) => r.label },
                  { label: 'Visits', value: (r) => r.visits, num: true },
                  { label: 'Unique', value: (r) => r.unique, num: true },
                  { label: 'New', value: (r) => r.newPatients, num: true },
                  { label: 'Avg/day', value: (r) => r.avg, num: true },
                  { label: 'Collected', value: (r) => money(r.revenue), num: true },
                ]}
              />
            </Card>
          </div>
        </>
      )}

      {/* ------------------------ Revenue ------------------------ */}
      {tab === 'revenue' && (
        <>
          <div className="grid grid-4 mb-16">
            <StatCard label="Total billed" value={money(totals.billed)} icon={Receipt} tone="brand" foot={<span>{bills.length} bills</span>} />
            <StatCard label="Collected" value={money(totals.collected)} icon={Banknote} tone="green" />
            <StatCard label="Discounts & waivers" value={money(totals.discounts)} icon={HeartHandshake} tone="violet" />
            <StatCard label="Outstanding" value={money(totals.outstanding)} icon={Wallet} tone="red" foot={<span>avg bill {money(totals.avg)}</span>} />
          </div>
          <div className="grid grid-main-side mb-16">
            <Card>
              <CardHeader title="Revenue report" subtitle="Billed revenue by source per day" />
              <CardBody>
                <ChartLegend
                  items={[
                    { label: 'Consultation', color: SERIES[0] },
                    { label: 'Clinic medicines', color: SERIES[1] },
                    { label: 'Other charges', color: SERIES[2] },
                  ]}
                />
                <div className="chart-box chart-box--tall">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={series} margin={{ top: 10, right: 6, left: 0, bottom: 0 }}>
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={16} />
                      <YAxis {...yAxisProps} tickFormatter={formatCompact} />
                      <Tooltip content={<ChartTooltip formatter={money} />} cursor={{ fill: 'rgba(10,147,150,0.06)' }} />
                      <Bar dataKey="consultation" name="Consultation" stackId="r" fill={SERIES[0]} stroke="#fff" strokeWidth={1} />
                      <Bar dataKey="medicines" name="Clinic medicines" stackId="r" fill={SERIES[1]} stroke="#fff" strokeWidth={1} />
                      <Bar dataKey="other" name="Other charges" stackId="r" fill={SERIES[2]} stroke="#fff" strokeWidth={1} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Revenue mix" subtitle="Share of billed revenue" />
              <CardBody>
                {[
                  ['Consultation', totals.consultation, SERIES[0]],
                  ['Clinic medicines', totals.medicines, SERIES[1]],
                  ['Other charges', totals.other, SERIES[2]],
                ].map(([l, v, c]) => {
                  const sum = totals.consultation + totals.medicines + totals.other || 1;
                  return (
                    <div key={l} className="mix-row">
                      <div className="flex items-center justify-between text-sm">
                        <span className="legend__item">
                          <span className="legend__swatch" style={{ background: c }} />
                          {l}
                        </span>
                        <strong className="tabular">{money(v)}</strong>
                      </div>
                      <div className="progress mt-4" style={{ height: 8 }}>
                        <div className="progress__bar" style={{ width: `${(v / sum) * 100}%`, background: c }} />
                      </div>
                      <div className="text-xs muted mt-4">{Math.round((v / sum) * 100)}% of billed revenue</div>
                    </div>
                  );
                })}
              </CardBody>
            </Card>
          </div>
          <Card>
            <CardHeader title="Daily revenue" />
            <div style={{ maxHeight: 460, overflowY: 'auto' }}>
              <SimpleTable
                rows={[...series].reverse()}
                columns={[
                  { label: 'Date', value: (r) => formatDate(r.date) },
                  { label: 'Consultation', value: (r) => money(r.consultation), num: true },
                  { label: 'Medicines', value: (r) => money(r.medicines), num: true },
                  { label: 'Other', value: (r) => money(r.other), num: true },
                  { label: 'Billed', value: (r) => money(r.revenue), num: true },
                  { label: 'Collected', value: (r) => money(r.collected), num: true },
                ]}
                footer={['Total', money(totals.consultation), money(totals.medicines), money(totals.other), money(totals.billed), money(totals.collected)]}
              />
            </div>
          </Card>
        </>
      )}

      {/* ------------------------ Free patients ------------------------ */}
      {tab === 'free' && (
        <>
          <div className="grid grid-4 mb-16">
            <StatCard label="Free / zero-fee visits" value={freeVisits.length} icon={HeartHandshake} tone="green" />
            <StatCard label="Share of visits" value={`${visits.length ? Math.round((freeVisits.length / visits.length) * 100) : 0}%`} icon={Users} tone="brand" />
            <StatCard
              label="Consultation waived"
              value={money(freeVisits.reduce((a, v) => a + (lookup.bill[v.billId]?.categoryWaiver || 0), 0))}
              icon={Wallet}
              tone="violet"
            />
            <StatCard label="Registered free patients" value={state.patients.filter((p) => p.tags.includes('free')).length} icon={HeartHandshake} tone="gold" />
          </div>
          <div className="grid grid-main-side">
            <Card>
              <CardHeader title="Free patient report" subtitle="Visits with no consultation charge" />
              <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                <SimpleTable
                  rows={[...freeVisits].sort((a, b) => b.registeredAt.localeCompare(a.registeredAt))}
                  columns={[
                    { label: 'Date', value: (v) => formatDate(v.date) },
                    { label: 'Patient', value: (v) => lookup.patient[v.patientId]?.name },
                    { label: 'Category', render: (v) => <CategoryTag id={v.category} short />, value: () => '' },
                    { label: 'Doctor', value: (v) => lookup.staff[v.doctorId]?.name || '—' },
                    { label: 'Waived', value: (v) => (v.billId ? money(lookup.bill[v.billId]?.categoryWaiver) : 'Pending'), num: true },
                  ]}
                />
              </div>
            </Card>
            <Card>
              <CardHeader title="By category" />
              <CardBody>
                {freeByCat.length === 0 && <EmptyState title="No free visits" />}
                {freeByCat.map((c) => (
                  <div key={c.id} className="kv-row">
                    <span>
                      <CategoryTag id={c.id} />
                    </span>
                    <span>{c.value}</span>
                  </div>
                ))}
              </CardBody>
            </Card>
          </div>
        </>
      )}

      {/* ------------------------ Follow-ups ------------------------ */}
      {tab === 'followup' && (
        <>
          <div className="grid grid-4 mb-16">
            <StatCard label="Follow-up visits" value={followVisits.length} icon={Repeat} tone="gold" />
            {['follow_up', 'same_day_follow_up', 'next_day_follow_up'].map((id, i) => (
              <StatCard key={id} label={CATEGORIES[id].label} value={followVisits.filter((v) => v.category === id).length} icon={Repeat} tone={['amber', 'pink', 'violet'][i]} />
            ))}
          </div>
          <div className="grid grid-main-side">
            <Card>
              <CardHeader title="Follow-up patient report" subtitle="Reduced or zero consultation charges" />
              <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                <SimpleTable
                  rows={[...followVisits].sort((a, b) => b.registeredAt.localeCompare(a.registeredAt))}
                  columns={[
                    { label: 'Date', value: (v) => formatDate(v.date) },
                    { label: 'Patient', value: (v) => lookup.patient[v.patientId]?.name },
                    { label: 'Type', render: (v) => <CategoryTag id={v.category} short />, value: () => '' },
                    { label: 'Session', render: (v) => <CategoryTag id={v.session} short size="sm" />, value: () => '' },
                    { label: 'Charged', value: (v) => (v.billId ? money(lookup.bill[v.billId]?.consultationNet) : 'Pending'), num: true },
                    { label: 'Saved', value: (v) => (v.billId ? money(lookup.bill[v.billId]?.categoryWaiver) : '—'), num: true },
                  ]}
                />
              </div>
            </Card>
            <Card>
              <CardHeader title="Follow-up mix" />
              <CardBody>
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={followByCat} dataKey="value" nameKey="label" innerRadius="60%" outerRadius="92%" paddingAngle={2} stroke="#fff" strokeWidth={2}>
                        {followByCat.map((c, i) => (
                          <Cell key={c.id} fill={SERIES[i]} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip labelFormatter={(_, p) => p?.[0]?.name} />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ChartLegend items={followByCat.map((c, i) => ({ label: c.label, color: SERIES[i], value: c.value }))} />
              </CardBody>
            </Card>
          </div>
        </>
      )}

      {/* ------------------------ Medicine consumption ------------------------ */}
      {tab === 'medicine' && (
        <>
          <div className="grid grid-4 mb-16">
            <StatCard label="Units dispensed" value={formatNumber(consumption.reduce((a, r) => a + r.qty, 0))} icon={Pill} tone="brand" />
            <StatCard label="Medicines used" value={consumption.length} icon={Package} tone="blue" />
            <StatCard label="Dispensed value" value={money(consumption.reduce((a, r) => a + r.value, 0))} icon={Banknote} tone="green" />
            <StatCard label="Top medicine" value={consumption[0]?.name || '—'} icon={TrendingUp} tone="gold" foot={consumption[0] && <span>{consumption[0].qty} units</span>} />
          </div>
          <div className="grid grid-2">
            <Card>
              <CardHeader title="Medicine consumption report" subtitle="Top 10 by units dispensed" />
              <CardBody>
                {consumption.length === 0 ? (
                  <EmptyState title="No consumption" />
                ) : (
                  <div className="chart-box chart-box--xl">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={consumption.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }} barCategoryGap="26%">
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" width={150} tick={{ fill: '#4b646d', fontSize: 11.5 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip formatter={(v) => `${v} units`} />} cursor={{ fill: 'rgba(10,147,150,0.06)' }} />
                        <Bar dataKey="qty" name="Dispensed" fill={SINGLE} radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#334e58', fontSize: 11.5, fontWeight: 600 }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="All dispensed medicines" />
              <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                <SimpleTable
                  rows={consumption}
                  columns={[
                    { label: 'Medicine', value: (r) => r.name },
                    { label: 'Category', value: (r) => r.category },
                    { label: 'Qty', value: (r) => `${r.qty} ${r.unit.toLowerCase()}`, num: true },
                    { label: 'Value', value: (r) => money(r.value), num: true },
                  ]}
                />
              </div>
            </Card>
          </div>
        </>
      )}

      {/* ------------------------ Inventory ------------------------ */}
      {tab === 'inventory' && (
        <>
          <div className="grid grid-4 mb-16">
            <StatCard label="Received in period" value={formatNumber(inventoryRows.reduce((a, r) => a + r.in, 0))} icon={Package} tone="green" />
            <StatCard label="Consumed in period" value={formatNumber(inventoryRows.reduce((a, r) => a + r.out, 0))} icon={Pill} tone="red" />
            <StatCard label="Net adjustments" value={formatNumber(inventoryRows.reduce((a, r) => a + r.adj, 0))} icon={Repeat} tone="amber" />
            <StatCard label="Current stock value" value={money(inventoryRows.reduce((a, r) => a + r.value, 0))} icon={Wallet} tone="gold" />
          </div>
          <Card>
            <CardHeader title="Inventory report" subtitle="Movement in the selected period & current position" />
            <SimpleTable
              rows={inventoryRows}
              columns={[
                { label: 'Medicine', value: (r) => r.med.name },
                { label: 'Category', value: (r) => r.med.category },
                { label: 'Received', value: (r) => `+${r.in}`, num: true },
                { label: 'Consumed', value: (r) => `-${r.out}`, num: true },
                { label: 'Adjusted', value: (r) => r.adj, num: true },
                { label: 'In stock', value: (r) => r.med.currentStock, num: true },
                { label: 'Min', value: (r) => r.med.minStock, num: true },
                { label: 'Value', value: (r) => money(r.value), num: true },
                { label: 'Status', render: (r) => <Badge tone={r.status.tone} dot>{r.status.label}</Badge>, value: () => '' },
              ]}
            />
          </Card>
        </>
      )}

      {/* ------------------------ Payment methods ------------------------ */}
      {tab === 'payments' && (
        <>
          <div className="grid grid-4 mb-16">
            {payRows.map((r, i) => (
              <StatCard key={r.key} label={r.label} value={money(r.amount)} icon={[Banknote, CreditCard, Wallet][i]} tone={['green', 'blue', 'violet'][i]} foot={<span>{r.count} bills · {payTotal ? Math.round((r.amount / payTotal) * 100) : 0}%</span>} />
            ))}
            <StatCard label="Total collected" value={money(payTotal)} icon={Receipt} tone="brand" />
          </div>
          <div className="grid grid-2">
            <Card>
              <CardHeader title="Payment method report" subtitle="Share of collected amount" />
              <CardBody>
                <div className="donut">
                  <div className="donut__chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={payRows} dataKey="amount" nameKey="label" innerRadius="64%" outerRadius="94%" paddingAngle={2} stroke="#fff" strokeWidth={2}>
                          {payRows.map((r) => (
                            <Cell key={r.key} fill={r.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip formatter={money} labelFormatter={(_, p) => p?.[0]?.name} />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="donut__center">
                      <strong>{formatCompact(payTotal)}</strong>
                      <span>{cur}</span>
                    </div>
                  </div>
                  <div className="donut__legend">
                    {payRows.map((r) => (
                      <div key={r.key} className="donut__row">
                        <span className="legend__swatch" style={{ background: r.color }} />
                        <span className="grow">{r.label}</span>
                        <strong className="tabular">{money(r.amount)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Daily collection by method" />
              <CardBody>
                <ChartLegend items={payRows.map((r) => ({ label: r.label.split(' ')[0], color: r.color }))} />
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={days.map((d) => {
                        const dayBills = bills.filter((b) => dateKey(b.createdAt) === d);
                        const p = paymentBreakdown(dayBills);
                        return { label: formatDate(d).slice(0, 6), cash: p.cash.amount, card: p.card.amount, other: p.other.amount };
                      })}
                      margin={{ top: 10, right: 6, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={16} />
                      <YAxis {...yAxisProps} tickFormatter={formatCompact} />
                      <Tooltip content={<ChartTooltip formatter={money} />} />
                      <Area type="monotone" dataKey="cash" name="Cash" stackId="p" stroke={SERIES[0]} fill={SERIES[0]} fillOpacity={0.18} strokeWidth={2} />
                      <Area type="monotone" dataKey="card" name="Card" stackId="p" stroke={SERIES[1]} fill={SERIES[1]} fillOpacity={0.18} strokeWidth={2} />
                      <Area type="monotone" dataKey="other" name="Other" stackId="p" stroke={SERIES[2]} fill={SERIES[2]} fillOpacity={0.18} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
