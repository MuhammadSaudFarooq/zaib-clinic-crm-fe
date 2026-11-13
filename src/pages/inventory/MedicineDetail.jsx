import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownLeft, ArrowUpRight, Boxes, Package, PackagePlus, Pencil, SlidersHorizontal, TrendingDown } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import StatCard from '@/components/ui/StatCard';
import EmptyState from '@/components/ui/EmptyState';
import Pagination, { usePagination } from '@/components/ui/Pagination';
import { axisProps, ChartTooltip, gridProps, SINGLE, yAxisProps } from '@/components/charts/ChartKit';
import { STOCK_MOVEMENT_TYPES, STOCK_REASONS } from '@/data/constants';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { lastNDays } from '@/utils/analytics';
import { cx, dateKey, formatCurrency, formatDate, formatDateTime, formatNumber, formatShortDate } from '@/utils/format';
import { MedicineFormModal, StockAdjustModal, StockInModal } from './InventoryModals';
import { stockStatus } from './stockStatus';

export default function MedicineDetail() {
  const { id } = useParams();
  const { state, lookup, today } = useData();
  const { can } = useAuth();
  const [modal, setModal] = useState(null);
  const med = lookup.medicine[id];
  const cur = state.settings.fees.currency;

  const moves = useMemo(() => state.movements.filter((m) => m.medicineId === id).sort((a, b) => b.date.localeCompare(a.date)), [state.movements, id]);
  const pg = usePagination(moves, 12, id);

  const usage = useMemo(() => {
    const days = lastNDays(30, today);
    const map = Object.fromEntries(days.map((d) => [d, 0]));
    for (const m of moves) {
      if (m.type !== 'out') continue;
      const k = dateKey(m.date);
      if (k in map) map[k] += m.quantity;
    }
    return days.map((d) => ({ label: formatShortDate(d), qty: map[d] }));
  }, [moves, today]);

  if (!med) {
    return (
      <Card>
        <EmptyState icon={Package} title="Medicine not found" action={<Button to="/inventory">Back to inventory</Button>} />
      </Card>
    );
  }

  const st = stockStatus(med, today);
  const used30 = usage.reduce((a, d) => a + d.qty, 0);
  const perDay = used30 / 30;
  const daysLeft = perDay > 0 ? Math.floor(med.currentStock / perDay) : null;

  return (
    <>
      <PageHeader
        title={med.name}
        subtitle={`${med.genericName} · ${med.category} · ${med.unit}`}
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Inventory', to: '/inventory' }, { label: med.id }]}
        actions={
          can('inventory.manage') && (
            <>
              <Button variant="secondary" icon={Pencil} onClick={() => setModal('edit')}>
                Edit
              </Button>
              <Button variant="secondary" icon={SlidersHorizontal} onClick={() => setModal('adjust')}>
                Adjust
              </Button>
              <Button icon={PackagePlus} onClick={() => setModal('in')}>
                Stock in
              </Button>
            </>
          )
        }
      />

      <div className="grid grid-4 mb-16">
        <StatCard label="Available stock" value={formatNumber(med.currentStock)} icon={Package} tone={st.tone === 'green' ? 'brand' : st.tone} foot={<Badge tone={st.tone} dot>{st.label}</Badge>} />
        <StatCard label="Total received" value={formatNumber(med.totalReceived)} icon={ArrowDownLeft} tone="green" foot={<span>purchases & opening stock</span>} />
        <StatCard label="Total consumed" value={formatNumber(med.totalConsumed)} icon={ArrowUpRight} tone="red" foot={<span>dispensed / administered</span>} />
        <StatCard
          label="Adjustments"
          value={`${med.totalAdjusted > 0 ? '+' : ''}${formatNumber(med.totalAdjusted)}`}
          icon={Boxes}
          tone="amber"
          foot={<span>expired, damaged, corrections</span>}
        />
      </div>

      <div className="grid grid-main-side mb-16">
        <Card>
          <CardHeader title="Usage history" subtitle="Units dispensed per day · last 30 days" icon={TrendingDown} />
          <CardBody>
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usage} margin={{ top: 10, right: 6, left: -12, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={18} />
                  <YAxis {...yAxisProps} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip formatter={(v) => `${v} ${med.unit.toLowerCase()}(s)`} />} cursor={{ fill: 'rgba(10,147,150,0.06)' }} />
                  <Bar dataKey="qty" name="Dispensed" fill={SINGLE} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Details" />
          <CardBody>
            {[
              ['Medicine ID', <span className="mono">{med.id}</span>],
              ['Supplier', med.supplier],
              ['Batch number', <span className="mono">{med.batchNo}</span>],
              ['Expiry date', <span className={cx(med.expiryDate < today && 'text-red')}>{formatDate(med.expiryDate)}</span>],
              ['Entry date', formatDate(med.entryDate)],
              ['Minimum level', `${med.minStock} ${med.unit.toLowerCase()}(s)`],
              ['Purchase price', formatCurrency(med.purchasePrice, cur)],
              ['Selling price', formatCurrency(med.sellingPrice, cur)],
              ['Stock value', formatCurrency(Math.max(0, med.currentStock) * med.purchasePrice, cur)],
              ['Avg. use / day', `${perDay.toFixed(1)} · ${daysLeft == null ? 'no recent use' : `~${daysLeft} days left`}`],
            ].map(([k, v]) => (
              <div key={k} className="kv-row">
                <span>{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Stock movements" subtitle="Stock-in, stock-out and adjustment records" />
        {moves.length === 0 ? (
          <EmptyState icon={Boxes} title="No movements yet" />
        ) : (
          <div className="table-wrap">
            <table className="table table--compact">
              <thead>
                <tr>
                  <th>Date & time</th>
                  <th>Type</th>
                  <th>Reason</th>
                  <th>Reference</th>
                  <th className="num">Qty</th>
                  <th className="num">Balance</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {pg.pageItems.map((m) => {
                  const t = STOCK_MOVEMENT_TYPES[m.type];
                  const signed = m.type === 'out' ? -m.quantity : m.quantity;
                  return (
                    <tr key={m.id}>
                      <td className="nowrap text-sm">{formatDateTime(m.date)}</td>
                      <td>
                        <Badge tone={t.tone}>{t.label}</Badge>
                      </td>
                      <td className="text-sm">{STOCK_REASONS[m.reason] || m.reason}</td>
                      <td className="text-sm muted">
                        {m.reference}
                        {m.note ? ` · ${m.note}` : ''}
                      </td>
                      <td className={cx('num fw-700', signed >= 0 ? 'text-green' : 'text-red')}>
                        {signed > 0 ? '+' : ''}
                        {signed}
                      </td>
                      <td className="num">{m.balanceAfter}</td>
                      <td className="nowrap text-sm">{lookup.staff[m.by]?.name || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination {...pg} />
      </Card>

      <MedicineFormModal open={modal === 'edit'} medicine={med} onClose={() => setModal(null)} />
      <StockInModal medicine={modal === 'in' ? med : null} onClose={() => setModal(null)} />
      <StockAdjustModal medicine={modal === 'adjust' ? med : null} onClose={() => setModal(null)} />
    </>
  );
}
