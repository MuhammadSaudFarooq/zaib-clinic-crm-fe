import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ban,
  CheckCircle2,
  Clock,
  Columns3,
  Eye,
  Hourglass,
  List,
  MonitorPlay,
  PhoneCall,
  Pill,
  Receipt,
  Stethoscope,
  Ticket,
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Tabs, { Segmented } from '@/components/ui/Tabs';
import SearchInput from '@/components/ui/SearchInput';
import StatCard from '@/components/ui/StatCard';
import { Person } from '@/components/ui/Avatar';
import CategoryTag from '@/components/ui/CategoryTag';
import { VisitStatusBadge } from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/Modal';
import { BILLING_CATEGORY_IDS, CATEGORIES } from '@/data/constants';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { cx, formatDate, formatDuration, formatTime, minutesSince, padToken } from '@/utils/format';
import IssueTokenModal from './IssueTokenModal';

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'waiting', label: 'Waiting' },
  { id: 'in_consultation', label: 'In Consultation' },
  { id: 'pharmacy', label: 'Dispensing' },
  { id: 'billing', label: 'Billing' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

const BOARD = [
  { id: 'waiting', title: 'Waiting', icon: Hourglass, statuses: ['waiting'], tone: 'amber' },
  { id: 'consult', title: 'In Consultation', icon: Stethoscope, statuses: ['in_consultation'], tone: 'blue' },
  { id: 'post', title: 'Dispensing & Billing', icon: Receipt, statuses: ['pharmacy', 'billing'], tone: 'violet' },
  { id: 'done', title: 'Completed', icon: CheckCircle2, statuses: ['completed'], tone: 'green' },
];

export function waitMinutes(v) {
  if (v.status === 'waiting') return minutesSince(v.registeredAt);
  if (v.consultation?.startedAt) return Math.max(0, Math.round((new Date(v.consultation.startedAt) - new Date(v.registeredAt)) / 60000));
  return null;
}

function useTick(ms = 30000) {
  const [, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((t) => t + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
}

export default function Queue() {
  useTick();
  const { state, api, lookup, doctors, today } = useData();
  const { user, can } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [date, setDate] = useState(today);
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [doctor, setDoctor] = useState('');
  const [category, setCategory] = useState('');
  const [view, setView] = useState('list');
  const [tokenOpen, setTokenOpen] = useState(false);
  const [cancelId, setCancelId] = useState(null);

  const isToday = date === today;
  const canManage = can('queue.manage');
  const canCall = canManage || can('consultation.perform');

  const dayVisits = useMemo(
    () => state.visits.filter((v) => v.date === date).sort((a, b) => a.tokenNo - b.tokenNo),
    [state.visits, date],
  );

  const filtered = dayVisits.filter((v) => {
    if (status !== 'all' && v.status !== status) return false;
    if (doctor && v.doctorId !== doctor) return false;
    if (category && v.category !== category) return false;
    if (q) {
      const p = lookup.patient[v.patientId];
      const t = q.toLowerCase();
      if (!(p?.name.toLowerCase().includes(t) || p?.id.toLowerCase().includes(t) || String(v.tokenNo) === t.replace('#', ''))) return false;
    }
    return true;
  });

  const counts = Object.fromEntries(STATUS_TABS.map((t) => [t.id, t.id === 'all' ? dayVisits.length : dayVisits.filter((v) => v.status === t.id).length]));
  const waits = dayVisits.map(waitMinutes).filter((m) => m != null && m < 300);
  const avgWait = waits.length ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : 0;

  const callIn = (v, doctorId) => {
    const doc = doctorId || v.doctorId || doctors[0]?.id;
    const busy = dayVisits.find((x) => x.status === 'in_consultation' && x.doctorId === doc);
    if (busy) {
      toast.warning('Doctor is busy', `${lookup.staff[doc]?.name} is with Token #${busy.tokenNo}. Complete that consultation first.`);
      return;
    }
    api.startConsultation(v.id, doc, user.id);
    toast.success(`Token #${v.tokenNo} called`, `${lookup.patient[v.patientId]?.name} → ${lookup.staff[doc]?.name}${lookup.staff[doc]?.room ? ` (${lookup.staff[doc].room})` : ''}`);
  };

  const callNext = (doc) => {
    const next = dayVisits.find((v) => v.status === 'waiting' && v.doctorId === doc.id) || dayVisits.find((v) => v.status === 'waiting' && !v.doctorId);
    if (!next) {
      toast.info('No one waiting', `There are no waiting patients assigned to ${doc.name}.`);
      return;
    }
    callIn(next, doc.id);
  };

  return (
    <>
      <PageHeader
        title="Tokens & Queue"
        subtitle={`${formatDate(date, { withDay: true })} · Billing happens after consultation, at the end of the visit.`}
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Tokens & Queue' }]}
        actions={
          <>
            <input type="date" className="input" style={{ width: 160 }} value={date} max={today} onChange={(e) => setDate(e.target.value || today)} aria-label="Queue date" />
            <Button variant="secondary" icon={MonitorPlay} onClick={() => window.open('/display', '_blank')}>
              Display board
            </Button>
            {canManage && (
              <Button icon={Ticket} onClick={() => setTokenOpen(true)}>
                Issue Token
              </Button>
            )}
          </>
        }
      />

      {/* Now serving per doctor */}
      {isToday && (
        <div className="serving-grid mb-16">
          {doctors.map((d) => {
            const current = dayVisits.find((v) => v.status === 'in_consultation' && v.doctorId === d.id);
            const waiting = dayVisits.filter((v) => v.status === 'waiting' && v.doctorId === d.id);
            const p = current && lookup.patient[current.patientId];
            return (
              <div key={d.id} className="serving-card">
                <div className="serving-card__head">
                  <Person name={d.name} meta={`${d.room || 'Consultation room'} · ${waiting.length} waiting`} />
                  {current ? <span className="badge badge--blue badge--live"><span className="badge__dot" />In session</span> : <span className="badge badge--gray">Available</span>}
                </div>
                <div className="serving-card__body">
                  <div>
                    <div className="serving-card__label">Now serving</div>
                    {current ? (
                      <div className="flex items-center gap-12 mt-4">
                        <span className="token-chip token-chip--lg">{padToken(current.tokenNo)}</span>
                        <div style={{ minWidth: 0 }}>
                          <div className="fw-700 truncate">{p?.name}</div>
                          <div className="text-xs muted">since {formatTime(current.consultation?.startedAt)}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="serving-card__idle">No patient in session</div>
                    )}
                  </div>
                  <div className="serving-card__next">
                    <div className="serving-card__label">Next</div>
                    <div className="flex gap-4 wrap mt-4">
                      {waiting.slice(0, 4).map((w) => (
                        <span key={w.id} className="token-chip token-chip--sm" style={{ background: 'var(--ink-100)', color: 'var(--ink-800)' }}>
                          {padToken(w.tokenNo)}
                        </span>
                      ))}
                      {waiting.length === 0 && <span className="text-sm muted">—</span>}
                    </div>
                  </div>
                </div>
                {canCall && (
                  <div className="serving-card__foot">
                    {current && can('consultation.perform') && (
                      <Button size="sm" variant="secondary" icon={Stethoscope} to={`/consultations/${current.id}`}>
                        Open consultation
                      </Button>
                    )}
                    <Button size="sm" icon={PhoneCall} disabled={!!current || waiting.length === 0} onClick={() => callNext(d)}>
                      Call next
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-5 mb-16">
        <StatCard label="Tokens issued" value={counts.all} icon={Ticket} tone="brand" />
        <StatCard label="Waiting" value={counts.waiting} icon={Hourglass} tone="amber" />
        <StatCard label="In consultation" value={counts.in_consultation} icon={Stethoscope} tone="blue" />
        <StatCard label="Dispensing / Billing" value={counts.pharmacy + counts.billing} icon={Pill} tone="violet" />
        <StatCard label="Avg. wait time" value={formatDuration(avgWait)} icon={Clock} tone="gold" foot={<span>{counts.completed} completed</span>} />
      </div>

      <Card>
        <Tabs tabs={STATUS_TABS.map((t) => ({ ...t, count: counts[t.id] }))} value={status} onChange={setStatus} />
        <div className="table-toolbar">
          <SearchInput value={q} onChange={setQ} placeholder="Search patient, ID or token #" />
          <select className="select select--sm" style={{ width: 'auto' }} value={doctor} onChange={(e) => setDoctor(e.target.value)} aria-label="Filter by doctor">
            <option value="">All doctors</option>
            {state.staff
              .filter((s) => s.role === 'doctor')
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
          </select>
          <select className="select select--sm" style={{ width: 'auto' }} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
            <option value="">All categories</option>
            {BILLING_CATEGORY_IDS.map((id) => (
              <option key={id} value={id}>
                {CATEGORIES[id].label}
              </option>
            ))}
          </select>
          <Segmented
            className="ml-auto"
            value={view}
            onChange={setView}
            options={[
              { id: 'list', label: <span className="flex items-center gap-4"><List size={14} /> List</span> },
              { id: 'board', label: <span className="flex items-center gap-4"><Columns3 size={14} /> Board</span> },
            ]}
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={Ticket} title="No tokens here" text={isToday ? 'Issue a token to add a patient to the queue.' : 'No tokens match on this date.'} />
        ) : view === 'list' ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Patient</th>
                  <th>Category</th>
                  <th>Registered</th>
                  <th>Visit date</th>
                  <th>Wait</th>
                  <th>Doctor</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => {
                  const p = lookup.patient[v.patientId];
                  const wait = waitMinutes(v);
                  return (
                    <tr key={v.id} className={cx(v.status === 'in_consultation' && 'row-highlight')}>
                      <td>
                        <span className={cx('token-chip', v.status === 'in_consultation' && 'token-chip--gold')}>{padToken(v.tokenNo)}</span>
                      </td>
                      <td>
                        <Person name={p?.name} meta={`${p?.id} · ${p?.age} yrs · ${p?.gender}`} />
                      </td>
                      <td>
                        <div className="tag-list" style={{ maxWidth: 220 }}>
                          <CategoryTag id={v.category} short />
                          <CategoryTag id={v.session} short />
                        </div>
                      </td>
                      <td className="nowrap">{formatTime(v.registeredAt)}</td>
                      <td className="nowrap muted">{formatDate(v.date)}</td>
                      <td className="nowrap">
                        {wait == null ? '—' : <span className={cx(v.status === 'waiting' && wait > 45 && 'text-red fw-600')}>{formatDuration(wait)}</span>}
                      </td>
                      <td style={{ minWidth: 170 }}>
                        {canManage && v.status === 'waiting' && isToday ? (
                          <select
                            className="select select--sm"
                            value={v.doctorId}
                            onChange={(e) => {
                              api.updateVisit(v.id, { doctorId: e.target.value });
                              toast.info('Doctor reassigned', `Token #${v.tokenNo} → ${lookup.staff[e.target.value]?.name}`);
                            }}
                            aria-label="Assign doctor"
                          >
                            <option value="">Unassigned</option>
                            {doctors.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="nowrap">{lookup.staff[v.doctorId]?.name || <span className="muted">Unassigned</span>}</span>
                        )}
                      </td>
                      <td>
                        <VisitStatusBadge status={v.status} />
                      </td>
                      <td className="text-right nowrap">
                        <div className="flex gap-4" style={{ justifyContent: 'flex-end' }}>
                          {v.status === 'waiting' && canCall && isToday && (
                            <Button size="sm" icon={PhoneCall} onClick={() => callIn(v)}>
                              Call in
                            </Button>
                          )}
                          {v.status === 'in_consultation' && can('consultation.perform') && (
                            <Button size="sm" variant="soft" icon={Stethoscope} to={`/consultations/${v.id}`}>
                              Consult
                            </Button>
                          )}
                          {v.status === 'pharmacy' && can('pharmacy.dispense') && (
                            <Button size="sm" variant="soft" icon={Pill} to="/pharmacy">
                              Dispense
                            </Button>
                          )}
                          {v.status === 'billing' && can('billing.create') && (
                            <Button size="sm" variant="gold" icon={Receipt} to={`/billing/checkout/${v.id}`}>
                              Bill
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" iconOnly icon={Eye} onClick={() => navigate(`/visits/${v.id}`)} aria-label="View visit" title="View visit" />
                          {v.status === 'waiting' && canManage && (
                            <Button size="sm" variant="ghost" iconOnly icon={Ban} onClick={() => setCancelId(v.id)} aria-label="Cancel token" title="Cancel token" />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="board">
            {BOARD.map((col) => {
              const items = filtered.filter((v) => col.statuses.includes(v.status));
              const Icon = col.icon;
              return (
                <div key={col.id} className="board__col">
                  <div className={`board__head tone-${col.tone}`}>
                    <Icon size={16} />
                    <span className="grow">{col.title}</span>
                    <span className="board__count">{items.length}</span>
                  </div>
                  <div className="board__list">
                    {items.map((v) => {
                      const p = lookup.patient[v.patientId];
                      const wait = waitMinutes(v);
                      return (
                        <div key={v.id} className="board-card" onClick={() => navigate(`/visits/${v.id}`)} role="button" tabIndex={0}>
                          <div className="flex items-center gap-8">
                            <span className={cx('token-chip token-chip--sm', v.status === 'in_consultation' && 'token-chip--gold')}>{padToken(v.tokenNo)}</span>
                            <strong className="grow truncate">{p?.name}</strong>
                          </div>
                          <div className="tag-list mt-8">
                            <CategoryTag id={v.category} size="sm" short />
                            <CategoryTag id={v.session} size="sm" short />
                          </div>
                          <div className="board-card__meta">
                            <span>{lookup.staff[v.doctorId]?.name || 'Unassigned'}</span>
                            <span>{wait != null ? formatDuration(wait) : formatTime(v.registeredAt)}</span>
                          </div>
                          {col.id === 'post' && <VisitStatusBadge status={v.status} />}
                          {v.status === 'waiting' && canCall && isToday && (
                            <Button
                              size="sm"
                              variant="soft"
                              block
                              icon={PhoneCall}
                              className="mt-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                callIn(v);
                              }}
                            >
                              Call in
                            </Button>
                          )}
                        </div>
                      );
                    })}
                    {items.length === 0 && <div className="board__empty">No tokens</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <IssueTokenModal open={tokenOpen} onClose={() => setTokenOpen(false)} />
      <ConfirmDialog
        open={!!cancelId}
        onClose={() => setCancelId(null)}
        title="Cancel this token?"
        message="The patient will be removed from the waiting queue. This visit will be kept as cancelled in the records."
        confirmLabel="Cancel token"
        tone="danger"
        onConfirm={() => {
          api.cancelVisit(cancelId, user.id);
          toast.info('Token cancelled');
        }}
      />
    </>
  );
}
