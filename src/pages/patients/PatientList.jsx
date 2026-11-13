import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Download, Eye, HeartHandshake, Ticket, UserPlus, Users, UserRoundPlus, CalendarDays } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SearchInput from '@/components/ui/SearchInput';
import StatCard from '@/components/ui/StatCard';
import { Person } from '@/components/ui/Avatar';
import CategoryTag, { TagList } from '@/components/ui/CategoryTag';
import EmptyState from '@/components/ui/EmptyState';
import Pagination, { usePagination } from '@/components/ui/Pagination';
import { CATEGORIES, GENDERS } from '@/data/constants';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { dateKey, downloadFile, formatDate, toCSV } from '@/utils/format';
import PatientFormModal from './PatientFormModal';
import IssueTokenModal from '@/pages/queue/IssueTokenModal';

export default function PatientList() {
  const { state, today } = useData();
  const { can } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  const [gender, setGender] = useState('');
  const [period, setPeriod] = useState('all');
  const [sort, setSort] = useState('recent');
  const [formOpen, setFormOpen] = useState(false);
  const [tokenFor, setTokenFor] = useState(null);

  useEffect(() => {
    if (params.get('new') === '1' && can('patients.create')) {
      setFormOpen(true);
      params.delete('new');
      setParams(params, { replace: true });
    }
  }, [params, setParams, can]);

  const visitsByPatient = useMemo(() => {
    const map = {};
    for (const v of state.visits) {
      if (v.status === 'cancelled') continue;
      const m = (map[v.patientId] ||= { count: 0, last: null, lastCategory: null });
      m.count += 1;
      if (!m.last || v.registeredAt > m.last) {
        m.last = v.registeredAt;
        m.lastCategory = v.category;
      }
    }
    return map;
  }, [state.visits]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const month = today.slice(0, 7);
    let list = state.patients.filter((p) => {
      if (term && !(p.name.toLowerCase().includes(term) || p.id.toLowerCase().includes(term) || p.phone.replace(/-/g, '').includes(term.replace(/-/g, '')))) return false;
      if (gender && p.gender !== gender) return false;
      if (tag) {
        const last = visitsByPatient[p.id]?.lastCategory;
        if (!p.tags.includes(tag) && last !== tag) return false;
      }
      const reg = dateKey(p.registeredAt);
      if (period === 'today' && reg !== today) return false;
      if (period === 'month' && !reg.startsWith(month)) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'visits') return (visitsByPatient[b.id]?.count || 0) - (visitsByPatient[a.id]?.count || 0);
      if (sort === 'lastVisit') return (visitsByPatient[b.id]?.last || '').localeCompare(visitsByPatient[a.id]?.last || '');
      return b.registeredAt.localeCompare(a.registeredAt);
    });
    return list;
  }, [state.patients, q, tag, gender, period, sort, visitsByPatient, today]);

  const pg = usePagination(filtered, 12, `${q}|${tag}|${gender}|${period}|${sort}`);

  const stats = {
    total: state.patients.length,
    today: state.patients.filter((p) => dateKey(p.registeredAt) === today).length,
    month: state.patients.filter((p) => dateKey(p.registeredAt).startsWith(today.slice(0, 7))).length,
    free: state.patients.filter((p) => p.tags.includes('free')).length,
  };

  const exportCSV = () => {
    const csv = toCSV(filtered, [
      { label: 'Patient ID', value: (p) => p.id },
      { label: 'Name', value: (p) => p.name },
      { label: 'Phone', value: (p) => p.phone },
      { label: 'Age', value: (p) => p.age },
      { label: 'Gender', value: (p) => p.gender },
      { label: 'Address', value: (p) => p.address },
      { label: 'Category', value: (p) => p.tags.map((t) => CATEGORIES[t]?.label).join(' / ') },
      { label: 'Registered', value: (p) => formatDate(p.registeredAt) },
      { label: 'Visits', value: (p) => visitsByPatient[p.id]?.count || 0 },
    ]);
    downloadFile(`zaib-clinic-patients-${today}.csv`, csv);
  };

  return (
    <>
      <PageHeader
        title="Patients"
        subtitle="Every patient has one unique record with their full visit, prescription and billing history."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Patients' }]}
        actions={
          <>
            <Button variant="secondary" icon={Download} onClick={exportCSV}>
              Export
            </Button>
            {can('patients.create') && (
              <Button icon={UserPlus} onClick={() => setFormOpen(true)}>
                Register Patient
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-4 mb-16">
        <StatCard label="Total patients" value={stats.total} icon={Users} tone="brand" />
        <StatCard label="Registered today" value={stats.today} icon={UserRoundPlus} tone="blue" />
        <StatCard label="Registered this month" value={stats.month} icon={CalendarDays} tone="gold" />
        <StatCard label="Free patients" value={stats.free} icon={HeartHandshake} tone="green" />
      </div>

      <Card>
        <div className="table-toolbar">
          <SearchInput value={q} onChange={setQ} placeholder="Search name, patient ID or phone…" />
          <select className="select select--sm" style={{ width: 'auto' }} value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Filter by category">
            <option value="">All categories</option>
            {Object.values(CATEGORIES)
              .filter((c) => c.kind === 'billing')
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
          </select>
          <select className="select select--sm" style={{ width: 'auto' }} value={gender} onChange={(e) => setGender(e.target.value)} aria-label="Filter by gender">
            <option value="">All genders</option>
            {GENDERS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
          <select className="select select--sm" style={{ width: 'auto' }} value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Filter by registration date">
            <option value="all">Any registration date</option>
            <option value="today">Registered today</option>
            <option value="month">Registered this month</option>
          </select>
          <select className="select select--sm" style={{ width: 'auto', marginLeft: 'auto' }} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            <option value="recent">Newest first</option>
            <option value="name">Name A–Z</option>
            <option value="visits">Most visits</option>
            <option value="lastVisit">Last visit</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={Users} title="No patients match your filters" text="Try a different name, ID or phone number — or register a new patient." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Phone</th>
                  <th>Age / Gender</th>
                  <th>Category</th>
                  <th className="num">Visits</th>
                  <th>Last visit</th>
                  <th>Registered</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pg.pageItems.map((p) => {
                  const vs = visitsByPatient[p.id];
                  const lastCat = vs?.lastCategory;
                  return (
                    <tr key={p.id} className="is-clickable" onClick={() => navigate(`/patients/${p.id}`)}>
                      <td>
                        <Person name={p.name} meta={<span className="mono">{p.id}</span>} />
                      </td>
                      <td className="nowrap">{p.phone}</td>
                      <td className="nowrap">
                        {p.age} yrs · {p.gender}
                      </td>
                      <td>
                        <span className="tag-list">
                          <TagList ids={p.tags} short />
                          {lastCat && lastCat !== 'regular' && !p.tags.includes(lastCat) && <CategoryTag id={lastCat} short />}
                        </span>
                      </td>
                      <td className="num">{vs?.count || 0}</td>
                      <td className="nowrap muted">{vs?.last ? formatDate(vs.last) : '—'}</td>
                      <td className="nowrap muted">{formatDate(p.registeredAt)}</td>
                      <td className="text-right nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-4" style={{ justifyContent: 'flex-end' }}>
                          {can('queue.manage') && (
                            <Button variant="soft" size="sm" icon={Ticket} onClick={() => setTokenFor(p.id)}>
                              Token
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" icon={Eye} to={`/patients/${p.id}`}>
                            View
                          </Button>
                        </div>
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

      <PatientFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={(p, opts) => {
          if (opts?.issueToken && can('queue.manage')) setTokenFor(p.id);
        }}
      />
      {tokenFor && <IssueTokenModal open onClose={() => setTokenFor(null)} initialPatientId={tokenFor} />}
    </>
  );
}
