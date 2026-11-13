import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Eye, Hourglass, PhoneCall, Stethoscope, Store, Pill } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Avatar, { Person } from '@/components/ui/Avatar';
import CategoryTag from '@/components/ui/CategoryTag';
import { VisitStatusBadge } from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { Segmented } from '@/components/ui/Tabs';
import { usePrintPrescription } from '@/components/print/PrintPreviews';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { formatDuration, formatTime, minutesSince, padToken } from '@/utils/format';

export default function ConsultationQueue() {
  const { todayVisits, lookup, api, doctors } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const printRx = usePrintPrescription();
  const isDoctor = user.role === 'doctor';
  const [scope, setScope] = useState(isDoctor ? 'mine' : 'all');

  const mine = (v) => scope === 'all' || v.doctorId === user.id;
  const current = todayVisits.filter((v) => v.status === 'in_consultation' && mine(v));
  const waiting = todayVisits.filter((v) => v.status === 'waiting' && (mine(v) || !v.doctorId));
  const done = todayVisits.filter((v) => ['pharmacy', 'billing', 'completed'].includes(v.status) && mine(v)).reverse();

  const start = (v) => {
    const doctorId = isDoctor ? user.id : v.doctorId || doctors[0]?.id;
    const busy = todayVisits.find((x) => x.status === 'in_consultation' && x.doctorId === doctorId);
    if (busy && busy.id !== v.id) {
      toast.warning('Finish the current consultation first', `Token #${busy.tokenNo} is still in session.`);
      navigate(`/consultations/${busy.id}`);
      return;
    }
    api.startConsultation(v.id, doctorId, user.id);
    navigate(`/consultations/${v.id}`);
  };

  return (
    <>
      <PageHeader
        title="Consultations"
        subtitle="Call patients in, examine, and write the Clinic and Medical Store prescriptions."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Consultations' }]}
        actions={
          <Segmented
            value={scope}
            onChange={setScope}
            options={[
              { id: 'mine', label: isDoctor ? 'My patients' : 'Assigned' },
              { id: 'all', label: 'All doctors' },
            ]}
          />
        }
      />

      {current.length > 0 && (
        <div className="grid grid-2 mb-16">
          {current.map((v) => {
            const p = lookup.patient[v.patientId];
            return (
              <div key={v.id} className="current-patient">
                <div className="current-patient__badge">
                  <span className="badge__dot" /> In consultation · {lookup.staff[v.doctorId]?.name}
                </div>
                <div className="flex items-center gap-16 wrap">
                  <span className="token-chip token-chip--lg token-chip--gold">{padToken(v.tokenNo)}</span>
                  <Avatar name={p?.name} size="lg" />
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="current-patient__name">{p?.name}</div>
                    <div className="current-patient__meta">
                      {p?.id} · {p?.age} yrs · {p?.gender} · started {formatTime(v.consultation?.startedAt)}
                    </div>
                    <div className="tag-list mt-8">
                      <CategoryTag id={v.category} />
                      <CategoryTag id={v.session} />
                    </div>
                  </div>
                  <Button variant="gold" size="lg" iconRight={ArrowRight} to={`/consultations/${v.id}`}>
                    Continue
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-2">
        <Card>
          <CardHeader title="Waiting patients" subtitle={`${waiting.length} in queue`} icon={Hourglass} />
          {waiting.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Queue is clear" text="No patients are waiting right now." />
          ) : (
            <div className="list">
              {waiting.map((v, i) => {
                const p = lookup.patient[v.patientId];
                return (
                  <div key={v.id} className="list__item">
                    <span className="token-chip token-chip--sm">{padToken(v.tokenNo)}</span>
                    <div className="grow" style={{ minWidth: 0 }}>
                      <Person name={p?.name} meta={`${p?.age} yrs · ${p?.gender} · waiting ${formatDuration(minutesSince(v.registeredAt))}`} />
                      {v.complaint && <div className="text-xs muted mt-4 truncate">“{v.complaint}”</div>}
                    </div>
                    <div className="tag-list" style={{ justifyContent: 'flex-end' }}>
                      <CategoryTag id={v.category} size="sm" short />
                    </div>
                    <Button size="sm" variant={i === 0 ? 'primary' : 'soft'} icon={PhoneCall} onClick={() => start(v)}>
                      Call in
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Consulted today" subtitle="Print prescriptions any time" icon={Stethoscope} />
          {done.length === 0 ? (
            <EmptyState icon={Stethoscope} title="No consultations completed yet" />
          ) : (
            <div className="list">
              {done.slice(0, 12).map((v) => {
                const p = lookup.patient[v.patientId];
                return (
                  <div key={v.id} className="list__item">
                    <span className="token-chip token-chip--sm" style={{ background: 'var(--ink-100)', color: 'var(--ink-800)' }}>
                      {padToken(v.tokenNo)}
                    </span>
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="fw-600 truncate">{p?.name}</div>
                      <div className="text-xs muted truncate">{v.consultation?.diagnosis}</div>
                    </div>
                    <VisitStatusBadge status={v.status} />
                    <div className="flex gap-4">
                      <Button size="sm" variant="ghost" iconOnly icon={Pill} title="Print clinic prescription" aria-label="Print clinic prescription" onClick={() => printRx(v.id, 'clinic')} />
                      <Button size="sm" variant="ghost" iconOnly icon={Store} title="Print store prescription" aria-label="Print store prescription" onClick={() => printRx(v.id, 'store')} />
                      <Button size="sm" variant="ghost" iconOnly icon={Eye} title="Open visit" aria-label="Open visit" onClick={() => navigate(`/visits/${v.id}`)} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
