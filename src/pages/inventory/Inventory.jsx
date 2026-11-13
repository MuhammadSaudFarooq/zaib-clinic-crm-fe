import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  CalendarX2,
  Download,
  History,
  Package,
  PackagePlus,
  Pencil,
  Plus,
  SlidersHorizontal,
  Wallet,
  Eye,
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Tabs from '@/components/ui/Tabs';
import SearchInput from '@/components/ui/SearchInput';
import StatCard from '@/components/ui/StatCard';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import Pagination, { usePagination } from '@/components/ui/Pagination';
import { MEDICINE_CATEGORIES, STOCK_MOVEMENT_TYPES, STOCK_REASONS } from '@/data/constants';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { addDays, cx, dateKey, downloadFile, formatCompact, formatCurrency, formatDate, formatDateTime, formatNumber, toCSV } from '@/utils/format';
import { MedicineFormModal, StockAdjustModal, StockInModal } from './InventoryModals';
import { stockStatus } from './stockStatus';

function StockBar({ med }) {
  const pct = Math.min(100, Math.round((med.currentStock / Math.max(1, med.minStock * 3)) * 100));
  const tone = med.currentStock <= med.minStock ? 'red' : med.currentStock <= med.minStock * 1.5 ? 'amber' : 'green';
  return (
    <div style={{ minWidth: 110 }}>
      <div className="flex items-center justify-between text-sm">
        <strong className="tabular">{formatNumber(med.currentStock)}</strong>
        <span className="text-xs muted">min {med.minStock}</span>
      </div>
      <div className="progress mt-4">
        <div className={`progress__bar progress__bar--${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Inventory() {
  const { state, lookup, today } = useData();
  const { can } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'stock';
  const setTab = (t) => setParams(t === 'stock' ? {} : { tab: t }, { replace: true });
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [mvType, setMvType] = useState('');
  const [mvMed, setMvMed] = useState('');
  const [mvPeriod, setMvPeriod] = useState('30');
  const [formOpen, setFormOpen] = useState(false);
  const [editMed, setEditMed] = useState(null);
  const [stockInMed, setStockInMed] = useState(null);
  const [adjustMed, setAdjustMed] = useState(null);
  const cur = state.settings.fees.currency;
  const canManage = can('inventory.manage');

  const soon = dateKey(addDays(new Date(), 30));
  const since30 = dateKey(addDays(new Date(), -29));
  const lowList = state.medicines.filter((m) => m.currentStock <= m.minStock);
  const expiredList = state.medicines.filter((m) => m.expiryDate < today || m.expiryDate <= soon);

  const stats = useMemo(() => {
    const recent = state.movements.filter((m) => dateKey(m.date) >= since30);
    return {
      skus: state.medicines.length,
      units: state.medicines.reduce((a, m) => a + Math.max(0, m.currentStock), 0),
      value: state.medicines.reduce((a, m) => a + Math.max(0, m.currentStock) * m.purchasePrice, 0),
      received30: recent.filter((m) => m.type === 'in').reduce((a, m) => a + m.quantity, 0),
      consumed30: recent.filter((m) => m.type === 'out').reduce((a, m) => a + m.quantity, 0),
      low: lowList.length,
      expired: state.medicines.filter((m) => m.expiryDate < today).length,
      expiring: state.medicines.filter((m) => m.expiryDate >= today && m.expiryDate <= soon).length,
    };
  }, [state.medicines, state.movements, since30, lowList.length, today, soon]);

  const medRows = useMemo(() => {
    const base = tab === 'low' ? lowList : tab === 'expiry' ? expiredList : state.medicines;
    const t = q.trim().toLowerCase();
    return base
      .filter((m) => (!category || m.category === category) && (!t || m.name.toLowerCase().includes(t) || m.genericName.toLowerCase().includes(t) || m.batchNo.toLowerCase().includes(t) || m.id.toLowerCase().includes(t)))
      .sort((a, b) => (tab === 'expiry' ? a.expiryDate.localeCompare(b.expiryDate) : a.name.localeCompare(b.name)));
  }, [tab, lowList, expiredList, state.medicines, q, category]);

  const moveRows = useMemo(() => {
    const from = mvPeriod === 'all' ? '0000' : dateKey(addDays(new Date(), -(Number(mvPeriod) - 1)));
    return state.movements
      .filter((m) => dateKey(m.date) >= from && (!mvType || m.type === mvType) && (!mvMed || m.medicineId === mvMed))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state.movements, mvType, mvMed, mvPeriod]);

  const medPg = usePagination(medRows, 12, `${tab}|${q}|${category}`);
  const mvPg = usePagination(moveRows, 15, `${mvType}|${mvMed}|${mvPeriod}`);

  const exportCSV = () => {
    downloadFile(
      `zaib-clinic-inventory-${today}.csv`,
      toCSV(state.medicines, [
        { label: 'ID', value: (m) => m.id },
        { label: 'Medicine', value: (m) => m.name },
        { label: 'Generic', value: (m) => m.genericName },
        { label: 'Category', value: (m) => m.category },
        { label: 'Unit', value: (m) => m.unit },
        { label: 'Current stock', value: (m) => m.currentStock },
        { label: 'Min stock', value: (m) => m.minStock },
        { label: 'Received', value: (m) => m.totalReceived },
        { label: 'Consumed', value: (m) => m.totalConsumed },
        { label: 'Adjusted', value: (m) => m.totalAdjusted },
        { label: 'Purchase price', value: (m) => m.purchasePrice },
        { label: 'Selling price', value: (m) => m.sellingPrice },
        { label: 'Supplier', value: (m) => m.supplier },
        { label: 'Batch', value: (m) => m.batchNo },
        { label: 'Expiry', value: (m) => m.expiryDate },
        { label: 'Status', value: (m) => stockStatus(m, today).label },
      ]),
    );
  };

  return (
    <>
      <PageHeader
        title="Medicine Inventory"
        subtitle="Track purchases, dispensing, adjustments and available stock. Stock is deducted only when medicines are dispensed."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Inventory' }]}
        actions={
          <>
            <Button variant="secondary" icon={Download} onClick={exportCSV}>
              Export
            </Button>
            {canManage && (
              <Button icon={Plus} onClick={() => setFormOpen(true)}>
                Add Medicine
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-4 mb-16">
        <StatCard label="Medicines (SKUs)" value={stats.skus} icon={Package} tone="brand" foot={<span>{formatNumber(stats.units)} units available</span>} />
        <StatCard label="Stock value" value={formatCurrency(stats.value, cur)} icon={Wallet} tone="gold" foot={<span>at purchase price</span>} />
        <StatCard label="Received / consumed (30d)" value={`${formatCompact(stats.received30)} / ${formatCompact(stats.consumed30)}`} icon={Boxes} tone="blue" foot={<span>units in · units out</span>} />
        <StatCard label="Alerts" value={stats.low + stats.expired} icon={AlertTriangle} tone="red" foot={<span>{stats.low} low · {stats.expired} expired · {stats.expiring} expiring</span>} />
      </div>

      <Card>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'stock', label: 'All stock', icon: Package, count: state.medicines.length },
            { id: 'low', label: 'Low stock', icon: AlertTriangle, count: lowList.length },
            { id: 'expiry', label: 'Expired / expiring', icon: CalendarX2, count: expiredList.length },
            { id: 'movements', label: 'Stock in / out', icon: History, count: null },
          ]}
        />

        {tab !== 'movements' ? (
          <>
            <div className="table-toolbar">
              <SearchInput value={q} onChange={setQ} placeholder="Search medicine, generic, batch…" />
              <select className="select select--sm" style={{ width: 'auto' }} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
                <option value="">All categories</option>
                {MEDICINE_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            {medRows.length === 0 ? (
              <EmptyState icon={Package} title={tab === 'low' ? 'No low-stock medicines' : tab === 'expiry' ? 'Nothing expired or expiring' : 'No medicines found'} />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Medicine</th>
                      <th>Category / Unit</th>
                      <th>Available</th>
                      <th className="num">Received</th>
                      <th className="num">Consumed</th>
                      <th className="num">Price (buy / sell)</th>
                      <th>Batch · Expiry</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medPg.pageItems.map((m) => {
                      const st = stockStatus(m, today);
                      return (
                        <tr key={m.id} className="is-clickable" onClick={() => navigate(`/inventory/${m.id}`)}>
                          <td>
                            <div className="fw-600">{m.name}</div>
                            <div className="text-xs muted">
                              {m.genericName} · <span className="mono">{m.id}</span>
                            </div>
                          </td>
                          <td className="text-sm nowrap">
                            {m.category}
                            <div className="text-xs muted">{m.unit}</div>
                          </td>
                          <td>
                            <StockBar med={m} />
                          </td>
                          <td className="num text-green">+{formatNumber(m.totalReceived)}</td>
                          <td className="num text-red">-{formatNumber(m.totalConsumed)}</td>
                          <td className="num nowrap text-sm">
                            {formatCurrency(m.purchasePrice, cur)} / <strong>{formatCurrency(m.sellingPrice, cur)}</strong>
                          </td>
                          <td className="nowrap text-sm">
                            <span className="mono">{m.batchNo}</span>
                            <div className={cx('text-xs', m.expiryDate < today ? 'text-red fw-600' : m.expiryDate <= soon ? 'text-amber fw-600' : 'muted')}>
                              Exp {formatDate(m.expiryDate)}
                            </div>
                          </td>
                          <td>
                            <Badge tone={st.tone} dot>
                              {st.label}
                            </Badge>
                          </td>
                          <td className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-4" style={{ justifyContent: 'flex-end' }}>
                              {canManage && (
                                <Button size="sm" variant="soft" icon={PackagePlus} onClick={() => setStockInMed(m)}>
                                  Stock in
                                </Button>
                              )}
                              {canManage && (
                                <>
                                  <Button size="sm" variant="ghost" iconOnly icon={SlidersHorizontal} title="Stock adjustment" aria-label="Stock adjustment" onClick={() => setAdjustMed(m)} />
                                  <Button size="sm" variant="ghost" iconOnly icon={Pencil} title="Edit details" aria-label="Edit details" onClick={() => setEditMed(m)} />
                                </>
                              )}
                              <Button size="sm" variant="ghost" iconOnly icon={Eye} title="Usage history" aria-label="Usage history" onClick={() => navigate(`/inventory/${m.id}`)} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination {...medPg} />
          </>
        ) : (
          <>
            <div className="table-toolbar">
              <select className="select select--sm" style={{ width: 'auto' }} value={mvType} onChange={(e) => setMvType(e.target.value)} aria-label="Movement type">
                <option value="">All movements</option>
                {Object.values(STOCK_MOVEMENT_TYPES).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <select className="select select--sm" style={{ width: 'auto', maxWidth: 260 }} value={mvMed} onChange={(e) => setMvMed(e.target.value)} aria-label="Medicine">
                <option value="">All medicines</option>
                {[...state.medicines]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
              <select className="select select--sm" style={{ width: 'auto' }} value={mvPeriod} onChange={(e) => setMvPeriod(e.target.value)} aria-label="Period">
                <option value="1">Today</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="all">All time</option>
              </select>
              <span className="ml-auto text-sm muted">
                <span className="text-green fw-700">+{formatNumber(moveRows.filter((m) => m.type === 'in').reduce((a, m) => a + m.quantity, 0))}</span> in ·{' '}
                <span className="text-red fw-700">-{formatNumber(moveRows.filter((m) => m.type === 'out').reduce((a, m) => a + m.quantity, 0))}</span> out
              </span>
            </div>
            {moveRows.length === 0 ? (
              <EmptyState icon={History} title="No stock movements" />
            ) : (
              <div className="table-wrap">
                <table className="table table--compact">
                  <thead>
                    <tr>
                      <th>Date & time</th>
                      <th>Type</th>
                      <th>Medicine</th>
                      <th>Reason</th>
                      <th>Reference</th>
                      <th className="num">Qty</th>
                      <th className="num">Balance</th>
                      <th>By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mvPg.pageItems.map((m) => {
                      const t = STOCK_MOVEMENT_TYPES[m.type];
                      const signed = m.type === 'in' ? m.quantity : m.type === 'out' ? -m.quantity : m.quantity;
                      return (
                        <tr key={m.id}>
                          <td className="nowrap text-sm">{formatDateTime(m.date)}</td>
                          <td>
                            <Badge tone={t.tone}>
                              {m.type === 'in' ? <ArrowDownLeft size={12} /> : m.type === 'out' ? <ArrowUpRight size={12} /> : <SlidersHorizontal size={12} />}
                              {t.label}
                            </Badge>
                          </td>
                          <td className="fw-600">{lookup.medicine[m.medicineId]?.name}</td>
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
            <Pagination {...mvPg} />
          </>
        )}
      </Card>

      <MedicineFormModal open={formOpen || !!editMed} medicine={editMed} onClose={() => { setFormOpen(false); setEditMed(null); }} />
      <StockInModal medicine={stockInMed} onClose={() => setStockInMed(null)} />
      <StockAdjustModal medicine={adjustMed} onClose={() => setAdjustMed(null)} />
    </>
  );
}

