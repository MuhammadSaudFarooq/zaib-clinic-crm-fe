import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Activity,
  AlertTriangle,
  ArrowRight,
  Banknote,
  CalendarCheck2,
  ClipboardCheck,
  HeartHandshake,
  Hourglass,
  Package,
  PackageCheck,
  Pill,
  Receipt,
  Repeat,
  Stethoscope,
  Ticket,
  UserPlus,
  Users,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import StatCard from '@/components/ui/StatCard';
import Button from '@/components/ui/Button';
import PageHeader from '@/components/ui/PageHeader';
import { Segmented } from '@/components/ui/Tabs';
import CategoryTag from '@/components/ui/CategoryTag';
import { VisitStatusBadge } from '@/components/ui/Badge';
import { Person } from '@/components/ui/Avatar';
import EmptyState from '@/components/ui/EmptyState';
import { axisProps, ChartLegend, ChartTooltip, gridProps, SERIES, SINGLE, yAxisProps } from '@/components/charts/ChartKit';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import {
  categoryBreakdown,
  categoryGroups,
  dailySeries,
  FOLLOW_UP_IDS,
  lastNDays,
  medicineConsumption,
  percentChange,
  ZERO_FEE_IDS,
} from '@/utils/analytics';
import {
  addDays,
  dateKey,
  formatCompact,
  formatCurrency,
  formatNumber,
  formatTime,
  padToken,
  relativeTime,
} from '@/utils/format';

const ACTIVITY_ICONS = {
  token: [Ticket, 'tone-brand'],
  patient: [UserPlus, 'tone-blue'],
  consultation: [Stethoscope, 'tone-violet'],
  dispense: [Pill, 'tone-amber'],
  bill: [Receipt, 'tone-green'],
  stock: [Package, 'tone-gold'],
  staff: [Users, 'tone-gray'],
  settings: [Activity, 'tone-gray'],
};

const FLOW = [
  { id: 'waiting', label: 'Waiting', tone: 'amber' },
  { id: 'in_consultation', label: 'With doctor', tone: 'blue' },
  { id: 'pharmacy', label: 'Dispensing', tone: 'violet' },
  { id: 'billing', label: 'Billing', tone: 'pink' },
  { id: 'completed', label: 'Completed', tone: 'green' },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const { state, todayVisits, lookup, today } = useData();
  const { user, can } = useAuth();
  const navigate = useNavigate();
  const [range, setRange] = useState('14');
  const cur = state.settings.fees.currency;

  const yesterday = dateKey(addDays(new Date(), -1));

  const stats = useMemo(() => {
    const active = todayVisits.filter((v) => v.status !== 'cancelled');
    const yVisits = state.visits.filter((v) => v.date === yesterday && v.status !== 'cancelled').length;
    const todayBills = state.bills.filter((b) => dateKey(b.createdAt) === today);
    const yBills = state.bills.filter((b) => dateKey(b.createdAt) === yesterday);
    const revenue = todayBills.reduce((a, b) => a + b.amountPaid, 0);
    const yRevenue = yBills.reduce((a, b) => a + b.amountPaid, 0);
    const pendingBills = state.bills.filter((b) => b.balance > 0);
    const awaitingBilling = state.visits.filter((v) => v.status === 'billing');
    const monthStart = today.slice(0, 7);
    return {
      totalPatients: state.patients.length,
      newThisMonth: state.patients.filter((p) => dateKey(p.registeredAt).startsWith(monthStart)).length,
      today: active.length,
      todayTrend: percentChange(active.length, yVisits),
      waiting: active.filter((v) => v.status === 'waiting').length,
      inConsult: active.filter((v) => v.status === 'in_consultation').length,
      completed: active.filter((v) => ['pharmacy', 'billing', 'completed'].includes(v.status)).length,
      free: active.filter((v) => ZERO_FEE_IDS.includes(v.category)).length,
      followUps: active.filter((v) => FOLLOW_UP_IDS.includes(v.category)).length,
      revenue,
      revenueTrend: percentChange(revenue, yRevenue),
      pendingCount: pendingBills.length + awaitingBilling.length,
      pendingAmount: pendingBills.reduce((a, b) => a + b.balance, 0),
      awaitingBilling: awaitingBilling.length,
      lowStock: state.medicines.filter((m) => m.currentStock <= m.minStock).length,
      expired: state.medicines.filter((m) => m.expiryDate < today).length,
      totalMeds: state.medicines.length,
      totalUnits: state.medicines.reduce((a, m) => a + Math.max(0, m.currentStock), 0),
    };
  }, [state, todayVisits, today, yesterday]);

  const days = useMemo(() => lastNDays(Number(range), today), [range, today]);
  const series = useMemo(() => dailySeries(state.visits, state.bills, days), [state.visits, state.bills, days]);
  const last30 = useMemo(() => lastNDays(30, today), [today]);
  const last30Visits = useMemo(() => state.visits.filter((v) => v.date >= last30[0]), [state.visits, last30]);
  const groups = useMemo(() => categoryGroups(last30Visits), [last30Visits]);
  const breakdown = useMemo(() => categoryBreakdown(last30Visits), [last30Visits]);
  const consumption = useMemo(
    () => medicineConsumption(state.movements, state.medicines, last30[0], today).slice(0, 7),
    [state.movements, state.medicines, last30, today],
  );
  const flowCounts = FLOW.map((f) => ({ ...f, count: todayVisits.filter((v) => v.status === f.id).length }));
  const totalFlow = flowCounts.reduce((a, f) => a + f.count, 0) || 1;
  const recent = [...todayVisits].reverse().slice(0, 7);
  const groupTotal = groups.reduce((a, g) => a + g.value, 0);

  const showFinance = can('billing.view');
  const showInventory = can('inventory.view');

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user.name.replace(/^Dr\.\s*/, 'Dr. ').split(' ').slice(0, 2).join(' ')}`}
        subtitle="Here’s what’s happening at Zaib Clinic today."
        actions={
          <>
            {can('patients.create') && (
              <Button variant="secondary" icon={UserPlus} to="/patients?new=1">
                Register Patient
              </Button>
            )}
            {can('queue.view') && (
              <Button icon={Ticket} to="/queue">
                Open Queue
              </Button>
            )}
          </>
        }
      />

      {/* -------- KPI cards -------- */}
      <div className="grid grid-5">
        <StatCard label="Total Patients" value={formatNumber(stats.totalPatients)} icon={Users} tone="brand" foot={<span>+{stats.newThisMonth} registered this month</span>} to="/patients" />
        <StatCard label="Today’s Patients" value={stats.today} icon={CalendarCheck2} tone="blue" trend={stats.todayTrend} foot={<span>vs yesterday</span>} to="/queue" delay={40} />
        <StatCard label="Currently Waiting" value={stats.waiting} icon={Hourglass} tone="amber" foot={<span>{stats.inConsult} in consultation now</span>} to="/queue" delay={80} />
        <StatCard label="Completed Checkups" value={stats.completed} icon={ClipboardCheck} tone="green" foot={<span>consultations finished today</span>} delay={120} />
        <StatCard label="Free Patients" value={stats.free} icon={HeartHandshake} tone="violet" foot={<span>zero-fee visits today</span>} delay={160} />
        <StatCard label="Follow-up Patients" value={stats.followUps} icon={Repeat} tone="gold" foot={<span>same-day, next-day & regular</span>} delay={200} />
        {showFinance && (
          <StatCard label="Today’s Revenue" value={formatCurrency(stats.revenue, cur)} icon={Banknote} tone="green" trend={stats.revenueTrend} foot={<span>collected vs yesterday</span>} to="/billing" delay={240} />
        )}
        {showFinance && (
          <StatCard
            label="Pending Bills"
            value={stats.pendingCount}
            icon={Receipt}
            tone="pink"
            foot={<span>{stats.awaitingBilling} at desk · {formatCurrency(stats.pendingAmount, cur)} due</span>}
            to="/billing"
            delay={280}
          />
        )}
        {showInventory && (
          <StatCard
            label="Low-stock Medicines"
            value={stats.lowStock}
            icon={AlertTriangle}
            tone="red"
            foot={<span>{stats.expired} expired batch{stats.expired === 1 ? '' : 'es'}</span>}
            to="/inventory?tab=low"
            delay={320}
          />
        )}
        {showInventory && (
          <StatCard
            label="Medicines in Inventory"
            value={stats.totalMeds}
            icon={PackageCheck}
            tone="brand"
            foot={<span>{formatNumber(stats.totalUnits)} units in stock</span>}
            to="/inventory"
            delay={360}
          />
        )}
      </div>

      {/* -------- Patient flow today -------- */}
      <Card className="mt-24">
        <CardHeader
          title="Patient flow today"
          subtitle="Registration → Queue → Consultation → Dispensing → Billing → Receipt"
          icon={Activity}
          actions={<span className="badge badge--brand">{todayVisits.length} tokens issued</span>}
        />
        <CardBody>
          <div className="flow-bar" role="img" aria-label="Distribution of today's patients by stage">
            {flowCounts.map((f) =>
              f.count ? <span key={f.id} className={`flow-bar__seg flow-bar__seg--${f.tone}`} style={{ flexGrow: f.count / totalFlow }} title={`${f.label}: ${f.count}`} /> : null,
            )}
          </div>
          <div className="flow-stats">
            {flowCounts.map((f) => (
              <div key={f.id} className="flow-stat">
                <span className={`flow-stat__dot flow-bar__seg--${f.tone}`} />
                <span className="flow-stat__label">{f.label}</span>
                <strong className="flow-stat__value">{f.count}</strong>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* -------- Charts row 1 -------- */}
      <div className="grid grid-main-side mt-24">
        <Card>
          <CardHeader
            title="Daily patient visits"
            subtitle={`Last ${range} days · morning & evening sessions`}
            actions={
              <Segmented
                value={range}
                onChange={setRange}
                options={[
                  { id: '7', label: '7D' },
                  { id: '14', label: '14D' },
                  { id: '30', label: '30D' },
                ]}
              />
            }
          />
          <CardBody>
            <ChartLegend
              items={[
                { label: 'Morning', color: SERIES[0] },
                { label: 'Evening', color: SERIES[2] },
              ]}
            />
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 12, right: 8, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gMorning" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={SERIES[0]} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={SERIES[0]} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gEvening" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={SERIES[2]} stopOpacity={0.24} />
                      <stop offset="100%" stopColor={SERIES[2]} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={18} />
                  <YAxis {...yAxisProps} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip formatter={(v) => `${v} patients`} />} cursor={{ stroke: '#b5c3c8', strokeDasharray: '4 4' }} />
                  <Area type="monotone" dataKey="morning" name="Morning" stackId="1" stroke={SERIES[0]} strokeWidth={2} fill="url(#gMorning)" activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
                  <Area type="monotone" dataKey="evening" name="Evening" stackId="1" stroke={SERIES[2]} strokeWidth={2} fill="url(#gEvening)" activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Patient categories" subtitle="Visits in the last 30 days" />
          <CardBody>
            <div className="donut">
              <div className="donut__chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={groups} dataKey="value" nameKey="label" innerRadius="64%" outerRadius="94%" paddingAngle={2} stroke="#fff" strokeWidth={2} isAnimationActive>
                      {groups.map((g, i) => (
                        <Cell key={g.id} fill={SERIES[i]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip formatter={(v) => `${v} visits`} labelFormatter={(_, p) => p?.[0]?.name} />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut__center">
                  <strong>{formatNumber(groupTotal)}</strong>
                  <span>visits</span>
                </div>
              </div>
              <div className="donut__legend">
                {groups.map((g, i) => (
                  <div key={g.id} className="donut__row">
                    <span className="legend__swatch" style={{ background: SERIES[i] }} />
                    <span className="grow">{g.label}</span>
                    <strong className="tabular">{g.value}</strong>
                    <span className="muted text-xs tabular" style={{ width: 38, textAlign: 'right' }}>
                      {groupTotal ? Math.round((g.value / groupTotal) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="divider" />
            <div className="tag-list">
              {breakdown
                .filter((b) => b.value > 0)
                .map((b) => (
                  <span key={b.id} className="flex items-center gap-4">
                    <CategoryTag id={b.id} size="sm" short />
                    <span className="text-xs fw-700">{b.value}</span>
                  </span>
                ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* -------- Charts row 2 -------- */}
      <div className="grid grid-main-side mt-24">
        {showFinance ? (
          <Card>
            <CardHeader title="Revenue overview" subtitle={`Billed revenue by source · last ${range} days`} />
            <CardBody>
              <ChartLegend
                items={[
                  { label: 'Consultation', color: SERIES[0] },
                  { label: 'Clinic medicines', color: SERIES[1] },
                  { label: 'Other charges', color: SERIES[2] },
                ]}
              />
              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={series} margin={{ top: 12, right: 8, left: 0, bottom: 0 }} barCategoryGap="22%">
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={18} />
                    <YAxis {...yAxisProps} tickFormatter={(v) => formatCompact(v)} />
                    <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(v, cur)} />} cursor={{ fill: 'rgba(10,147,150,0.06)' }} />
                    <Bar dataKey="consultation" name="Consultation" stackId="r" fill={SERIES[0]} stroke="#fff" strokeWidth={1} />
                    <Bar dataKey="medicines" name="Clinic medicines" stackId="r" fill={SERIES[1]} stroke="#fff" strokeWidth={1} />
                    <Bar dataKey="other" name="Other charges" stackId="r" fill={SERIES[2]} stroke="#fff" strokeWidth={1} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardHeader title="Follow-ups & free visits" subtitle={`Last ${range} days`} />
            <CardBody>
              <ChartLegend
                items={[
                  { label: 'Follow-ups', color: SERIES[0] },
                  { label: 'Zero-fee visits', color: SERIES[1] },
                ]}
              />
              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={series} margin={{ top: 12, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={18} />
                    <YAxis {...yAxisProps} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(10,147,150,0.06)' }} />
                    <Bar dataKey="followUps" name="Follow-ups" fill={SERIES[0]} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="free" name="Zero-fee visits" fill={SERIES[1]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader title="Medicine consumption" subtitle="Top clinic medicines dispensed · 30 days" actions={showInventory && <Link to="/reports?tab=medicine" className="text-sm fw-600">Details</Link>} />
          <CardBody>
            {consumption.length === 0 ? (
              <EmptyState icon={Pill} title="No consumption yet" />
            ) : (
              <div className="chart-box chart-box--tall">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={consumption} layout="vertical" margin={{ top: 0, right: 34, left: 0, bottom: 0 }} barCategoryGap="28%">
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={128} tick={{ fill: '#4b646d', fontSize: 11.5 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip formatter={(v) => `${v} units`} />} cursor={{ fill: 'rgba(10,147,150,0.06)' }} />
                    <Bar dataKey="qty" name="Dispensed" fill={SINGLE} radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#334e58', fontSize: 11.5, fontWeight: 600 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* -------- Recent patients & activity -------- */}
      <div className="grid grid-main-side mt-24">
        <Card>
          <CardHeader
            title="Recent patients"
            subtitle="Latest tokens issued today"
            actions={
              <Button variant="ghost" size="sm" iconRight={ArrowRight} to="/queue">
                View queue
              </Button>
            }
          />
          {recent.length === 0 ? (
            <EmptyState icon={Ticket} title="No tokens issued today" />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Token</th>
                    <th>Patient</th>
                    <th>Category</th>
                    <th>Doctor</th>
                    <th>Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((v) => {
                    const p = lookup.patient[v.patientId];
                    return (
                      <tr key={v.id} className="is-clickable" onClick={() => navigate(`/visits/${v.id}`)}>
                        <td>
                          <span className="token-chip token-chip--sm">{padToken(v.tokenNo)}</span>
                        </td>
                        <td>
                          <Person name={p?.name} meta={`${p?.id} · ${p?.age} yrs`} />
                        </td>
                        <td>
                          <CategoryTag id={v.category} short />
                        </td>
                        <td className="nowrap">{lookup.staff[v.doctorId]?.name || <span className="muted">Unassigned</span>}</td>
                        <td className="nowrap muted">{formatTime(v.registeredAt)}</td>
                        <td>
                          <VisitStatusBadge status={v.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Recent activity" subtitle="Live log across the clinic" />
          <CardBody style={{ maxHeight: 470, overflowY: 'auto', paddingTop: 8 }}>
            <ul className="feed">
              {state.activities.slice(0, 12).map((a) => {
                const [Icon, tone] = ACTIVITY_ICONS[a.type] || ACTIVITY_ICONS.settings;
                return (
                  <li key={a.id} className="feed__item">
                    <span className={`feed__icon ${tone}`}>
                      <Icon size={15} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div className="feed__text">{a.message}</div>
                      <div className="feed__time">
                        {relativeTime(a.at)}
                        {lookup.staff[a.by] ? ` · ${lookup.staff[a.by].name}` : ''}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
