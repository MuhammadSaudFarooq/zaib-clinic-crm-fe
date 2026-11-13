import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Download } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SearchInput from '@/components/ui/SearchInput';
import { Person } from '@/components/ui/Avatar';
import CategoryTag from '@/components/ui/CategoryTag';
import { VisitStatusBadge } from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import Pagination, { usePagination } from '@/components/ui/Pagination';
import { BILLING_CATEGORY_IDS, CATEGORIES, VISIT_STATUS } from '@/data/constants';
import { useData } from '@/context/DataContext';
import { addDays, dateKey, downloadFile, formatCurrency, formatDate, formatTime, padToken, toCSV } from '@/utils/format';

export default function VisitList() {
  const { state, lookup, today } = useData();
  const navigate = useNavigate();
  const cur = state.settings.fees.currency;
  const [q, setQ] = useState('');
  const [from, setFrom] = useState(dateKey(addDays(new Date(), -6)));
  const [to, setTo] = useState(today);
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [doctor, setDoctor] = useState('');

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return state.visits
      .filter((v) => {
        if (v.date < from || v.date > to) return false;
        if (status && v.status !== status) return false;
        if (category && v.category !== category) return false;
        if (doctor && v.doctorId !== doctor) return false;
        if (t) {
          const p = lookup.patient[v.patientId];
          if (!(p?.name.toLowerCase().includes(t) || p?.id.toLowerCase().includes(t) || v.id.toLowerCase().includes(t) || (v.consultation?.diagnosis || '').toLowerCase().includes(t)))
            return false;
        }
        return true;
      })
      .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));
  }, [state.visits, from, to, status, category, doctor, q, lookup]);

  const pg = usePagination(rows, 15, `${q}|${from}|${to}|${status}|${category}|${doctor}`);

  const exportCSV = () => {
    downloadFile(
      `zaib-clinic-visits-${from}-to-${to}.csv`,
      toCSV(rows, [
        { label: 'Visit ID', value: (v) => v.id },
        { label: 'Date', value: (v) => v.date },
        { label: 'Token', value: (v) => v.tokenNo },
        { label: 'Patient ID', value: (v) => v.patientId },
        { label: 'Patient', value: (v) => lookup.patient[v.patientId]?.name },
        { label: 'Category', value: (v) => CATEGORIES[v.category]?.label },
        { label: 'Session', value: (v) => v.session },
        { label: 'Doctor', value: (v) => lookup.staff[v.doctorId]?.name },
        { label: 'Diagnosis', value: (v) => v.consultation?.diagnosis || '' },
        { label: 'Clinic Rx items', value: (v) => v.clinicRx.items.length },
        { label: 'Store Rx items', value: (v) => v.storeRx.items.length },
        { label: 'Status', value: (v) => VISIT_STATUS[v.status]?.label },
        { label: 'Bill total', value: (v) => (v.billId ? lookup.bill[v.billId]?.total : '') },
      ]),
    );
  };

  return (
    <>
      <PageHeader
        title="Visit Records"
        subtitle="Every visit keeps its own date, token, two prescriptions and billing record."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Visit Records' }]}
        actions={
          <Button variant="secondary" icon={Download} onClick={exportCSV}>
            Export
          </Button>
        }
      />
      <Card>
        <div className="table-toolbar">
          <SearchInput value={q} onChange={setQ} placeholder="Patient, ID, visit ID or diagnosis" />
          <div className="date-range">
            <input type="date" className="input input--sm" value={from} max={to} onChange={(e) => setFrom(e.target.value || from)} aria-label="From date" />
            <span className="muted">to</span>
            <input type="date" className="input input--sm" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value || to)} aria-label="To date" />
          </div>
          <select className="select select--sm" style={{ width: 'auto' }} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="">All statuses</option>
            {Object.values(VISIT_STATUS).map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <select className="select select--sm" style={{ width: 'auto' }} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
            <option value="">All categories</option>
            {BILLING_CATEGORY_IDS.map((id) => (
              <option key={id} value={id}>
                {CATEGORIES[id].label}
              </option>
            ))}
          </select>
          <select className="select select--sm" style={{ width: 'auto' }} value={doctor} onChange={(e) => setDoctor(e.target.value)} aria-label="Doctor">
            <option value="">All doctors</option>
            {state.staff
              .filter((s) => s.role === 'doctor')
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
          </select>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No visits in this range" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Visit</th>
                  <th>Patient</th>
                  <th>Category</th>
                  <th>Doctor</th>
                  <th>Diagnosis</th>
                  <th className="num">Rx</th>
                  <th className="num">Bill</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pg.pageItems.map((v) => {
                  const p = lookup.patient[v.patientId];
                  const b = v.billId ? lookup.bill[v.billId] : null;
                  return (
                    <tr key={v.id} className="is-clickable" onClick={() => navigate(`/visits/${v.id}`)}>
                      <td className="nowrap">
                        <div className="flex items-center gap-8">
                          <span className="token-chip token-chip--sm">{padToken(v.tokenNo)}</span>
                          <div>
                            <div className="fw-600">{formatDate(v.date)}</div>
                            <div className="text-xs muted">{formatTime(v.registeredAt)}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Person name={p?.name} meta={p?.id} />
                      </td>
                      <td>
                        <div className="tag-list">
                          <CategoryTag id={v.category} short />
                          <CategoryTag id={v.session} short />
                        </div>
                      </td>
                      <td className="nowrap text-sm">{lookup.staff[v.doctorId]?.name || '—'}</td>
                      <td className="text-sm" style={{ minWidth: 180 }}>
                        {v.consultation?.diagnosis || <span className="muted">—</span>}
                      </td>
                      <td className="num text-sm nowrap">
                        {v.clinicRx.items.length} + {v.storeRx.items.length}
                      </td>
                      <td className="num nowrap">{b ? formatCurrency(b.total, cur) : <span className="muted">—</span>}</td>
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
        <Pagination {...pg} />
      </Card>
    </>
  );
}
