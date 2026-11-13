import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { Check, Info, Printer, Sparkles, Ticket, UserPlus, X } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import SearchInput from '@/components/ui/SearchInput';
import Avatar from '@/components/ui/Avatar';
import CategoryTag, { CategoryIcon, TagList } from '@/components/ui/CategoryTag';
import { LogoMark } from '@/components/brand/Logo';
import { SelectField, TextAreaField, TextField } from '@/components/form/Fields';
import { BILLING_CATEGORY_IDS, CATEGORIES } from '@/data/constants';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { usePrint } from '@/context/PrintContext';
import { useToast } from '@/context/ToastContext';
import { computeConsultationFee, describeRule } from '@/utils/billing';
import { cx, dateKey, daysBetween, formatCurrency, formatDate, formatTime, padToken, sessionFor } from '@/utils/format';
import PatientFormModal from '@/pages/patients/PatientFormModal';
import { vitalsSchema } from '@/utils/validation';

/** Suggest the billing category from the patient's history (same-day / next-day / follow-up). */
export function suggestCategory(patient, visits, settings) {
  if (!patient) return { category: 'regular', reason: '' };
  const today = dateKey(new Date());
  const history = visits
    .filter((v) => v.patientId === patient.id && v.status !== 'cancelled')
    .sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));
  const last = history[0];
  if (patient.tags.includes('free')) return { category: 'free', reason: 'Patient is registered as a Free Patient.' };
  if (last) {
    const gap = daysBetween(last.date, today);
    if (gap === 0) return { category: 'same_day_follow_up', reason: `Already visited today at ${formatTime(last.registeredAt)} — same-day follow-up.`, last };
    if (gap === 1) return { category: 'next_day_follow_up', reason: 'Visited yesterday — next-day follow-up.', last };
    if (gap <= (settings.followUp?.standardFollowUpDays || 7))
      return { category: 'follow_up', reason: `Last visit ${gap} days ago (${formatDate(last.date)}) — follow-up.`, last };
  }
  if (patient.tags.includes('discounted')) return { category: 'discounted', reason: 'Patient is registered as a Discounted Patient.' };
  return { category: 'regular', reason: last ? `Last visit on ${formatDate(last.date)}.` : 'First visit to the clinic.' };
}

const schema = Yup.object({
  patientId: Yup.string().required('Select or register a patient first'),
  category: Yup.string().oneOf(BILLING_CATEGORY_IDS).required('Select a category'),
  session: Yup.string().oneOf(['morning', 'evening']).required(),
  doctorId: Yup.string().required('Assign a doctor'),
  complaint: Yup.string().max(200, 'Keep it under 200 characters'),
  vitals: vitalsSchema,
});

export function TokenSlip({ visit, patient, doctor, settings }) {
  return (
    <div className="thermal">
      <div className="thermal__center">
        <div className="thermal__logo">
          <LogoMark size={40} tone="mono" />
        </div>
        <div className="thermal__name">{settings.clinic.name}</div>
        <div className="thermal__tag">{settings.clinic.tagline}</div>
      </div>
      <div className="thermal__rule thermal__rule--double" />
      <div className="thermal__title">Patient Token</div>
      <div className="token-slip__no">{padToken(visit.tokenNo)}</div>
      <div className="thermal__rule" />
      <div className="tr-row"><span>Patient</span><span>{patient.name}</span></div>
      <div className="tr-row"><span>Patient ID</span><span>{patient.id}</span></div>
      <div className="tr-row"><span>Date</span><span>{formatDate(visit.registeredAt)}</span></div>
      <div className="tr-row"><span>Time</span><span>{formatTime(visit.registeredAt)}</span></div>
      <div className="tr-row"><span>Doctor</span><span>{doctor?.name || '—'}</span></div>
      {doctor?.room && <div className="tr-row"><span>Room</span><span>{doctor.room}</span></div>}
      <div className="tr-row"><span>Category</span><span>{CATEGORIES[visit.category]?.short}</span></div>
      <div className="thermal__rule" />
      <div className="thermal__center thermal__note">Please wait for your token number to be called. Billing is done after your consultation.</div>
    </div>
  );
}

export default function IssueTokenModal({ open, onClose, initialPatientId }) {
  const { state, api, doctors, todayVisits, lookup } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const { print } = usePrint();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [registerOpen, setRegisterOpen] = useState(false);
  const [issued, setIssued] = useState(null);
  const formikRef = useRef(null);
  const close = () => {
    setIssued(null);
    setQuery('');
    onClose();
  };

  useEffect(() => {
    if (open) {
      setQuery('');
      setIssued(null);
    }
  }, [open]);

  const matches = useMemo(() => {
    const t = query.trim().toLowerCase();
    if (t.length < 2) return [];
    return state.patients
      .filter((p) => p.name.toLowerCase().includes(t) || p.id.toLowerCase().includes(t) || p.phone.replace(/-/g, '').includes(t.replace(/-/g, '')))
      .slice(0, 6);
  }, [query, state.patients]);

  const load = (id) => todayVisits.filter((v) => v.doctorId === id && (v.status === 'waiting' || v.status === 'in_consultation')).length;
  const leastBusy = [...doctors].sort((a, b) => load(a.id) - load(b.id))[0];

  const initialPatient = initialPatientId ? lookup.patient[initialPatientId] : null;
  const initialSuggestion = suggestCategory(initialPatient, state.visits, state.settings);

  const printSlip = (visit) => {
    print(
      <TokenSlip visit={visit} patient={lookup.patient[visit.patientId] || issued?.patient} doctor={lookup.staff[visit.doctorId]} settings={state.settings} />,
      { format: 'thermal', title: `Token ${visit.tokenNo}` },
    );
  };

  if (!open) return null;

  if (issued) {
    const { visit, patient } = issued;
    const doctor = lookup.staff[visit.doctorId];
    return (
      <Modal open onClose={close} size="sm" title="Token issued">
        <div className="token-issued">
          <span className="token-issued__label">Token number</span>
          <div className="token-issued__no">{padToken(visit.tokenNo)}</div>
          <div className="fw-700" style={{ fontSize: 16 }}>{patient.name}</div>
          <div className="muted text-sm">
            {patient.id} · {doctor?.name} {doctor?.room ? `· ${doctor.room}` : ''}
          </div>
          <div className="mt-12">
            <CategoryTag id={visit.category} size="lg" />
          </div>
          <div className="callout callout--brand mt-16" style={{ textAlign: 'left' }}>
            <Info size={16} />
            <span>The patient now waits in the queue. Billing will be completed at the end of the visit.</span>
          </div>
        </div>
        <div className="modal__footer" style={{ margin: '20px -22px -20px' }}>
          <Button variant="secondary" icon={Printer} onClick={() => printSlip(visit)}>
            Print slip
          </Button>
          <Button
            onClick={() => {
              close();
              navigate('/queue');
            }}
          >
            Go to queue
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <>
      <Modal open={open} onClose={close} size="lg" title="Issue new token" subtitle="Find the patient, choose the visit category and assign a doctor.">
        <Formik
          innerRef={formikRef}
          initialValues={{
            patientId: initialPatient?.id || '',
            category: initialSuggestion.category,
            session: sessionFor(new Date()),
            doctorId: leastBusy?.id || '',
            complaint: '',
            vitals: { bp: '', pulse: '', temp: '', weight: '', spo2: '' },
          }}
          validationSchema={schema}
          onSubmit={(values) => {
            const visit = api.issueToken(values, user.id);
            const patient = lookup.patient[values.patientId];
            toast.success(`Token #${visit.tokenNo} issued`, `${patient?.name} added to the waiting queue.`);
            setIssued({ visit, patient });
          }}
        >
          {({ values, setFieldValue, errors, touched, submitCount }) => {
            const patient = lookup.patient[values.patientId];
            const suggestion = suggestCategory(patient, state.visits, state.settings);
            const fee = computeConsultationFee(values.category, state.settings);
            const selectPatient = (p) => {
              setFieldValue('patientId', p.id);
              setFieldValue('category', suggestCategory(p, state.visits, state.settings).category);
              setQuery('');
            };
            return (
              <Form noValidate>
                {/* Step 1: patient */}
                <div className="section-title">
                  <span className="step-num">1</span> Patient
                </div>
                {patient ? (
                  <div className="selected-patient">
                    <Avatar name={patient.name} size="lg" />
                    <div className="grow">
                      <div className="fw-700" style={{ fontSize: 15 }}>{patient.name}</div>
                      <div className="muted text-sm">
                        {patient.id} · {patient.age} yrs · {patient.gender} · {patient.phone}
                      </div>
                      <div className="mt-4">
                        <TagList ids={patient.tags} size="sm" />
                      </div>
                    </div>
                    {!initialPatientId && (
                      <Button variant="ghost" size="sm" icon={X} onClick={() => setFieldValue('patientId', '')}>
                        Change
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex gap-8 wrap">
                      <SearchInput value={query} onChange={setQuery} placeholder="Search by name, patient ID or phone…" autoFocus className="grow" />
                      <Button variant="soft" icon={UserPlus} onClick={() => setRegisterOpen(true)}>
                        Register new
                      </Button>
                    </div>
                    {matches.length > 0 && (
                      <div className="patient-picker">
                        {matches.map((p) => (
                          <button key={p.id} type="button" className="patient-picker__item" onClick={() => selectPatient(p)}>
                            <Avatar name={p.name} size="sm" />
                            <span className="grow" style={{ minWidth: 0 }}>
                              <span className="fw-600 truncate" style={{ display: 'block' }}>{p.name}</span>
                              <span className="text-xs muted">{p.id} · {p.phone} · {p.age} yrs</span>
                            </span>
                            <TagList ids={p.tags} size="sm" short />
                          </button>
                        ))}
                      </div>
                    )}
                    {query.trim().length >= 2 && matches.length === 0 && (
                      <div className="callout callout--info mt-8">
                        <Info size={16} />
                        <span>No patient found. Register them as a new patient.</span>
                      </div>
                    )}
                    {(touched.patientId || submitCount > 0) && errors.patientId && <div className="field__error mt-8">{errors.patientId}</div>}
                  </>
                )}

                {/* Step 2: category */}
                <div className="section-title mt-24">
                  <span className="step-num">2</span> Visit category & charges
                </div>
                {patient && suggestion.reason && (
                  <div className="callout callout--warning" style={{ marginBottom: 12 }}>
                    <Sparkles size={16} />
                    <span>
                      <strong>Suggested: {CATEGORIES[suggestion.category].label}.</strong> {suggestion.reason}
                    </span>
                  </div>
                )}
                <div className="option-grid">
                  {BILLING_CATEGORY_IDS.map((id) => {
                    const c = CATEGORIES[id];
                    const f = computeConsultationFee(id, state.settings);
                    const selected = values.category === id;
                    return (
                      <button key={id} type="button" className={cx('option-card', selected && 'is-selected')} onClick={() => setFieldValue('category', id)}>
                        {selected && <Check size={15} className="option-card__check" />}
                        <span className="option-card__title">
                          <span className="tag tag--sm" style={{ background: c.bg, color: c.fg, padding: '0 5px' }}>
                            <CategoryIcon id={id} size={11} />
                          </span>
                          {c.label}
                        </span>
                        <span className="option-card__desc">
                          {f.isFree ? 'No consultation charge' : formatCurrency(f.fee, state.settings.fees.currency)}
                          {f.isReduced && ` · ${describeRule(f.rule, f.base, state.settings.fees.currency)}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="fee-preview mt-12">
                  <span>Consultation fee at billing</span>
                  <strong>
                    {fee.waived > 0 && <s className="muted" style={{ marginRight: 8, fontWeight: 500 }}>{formatCurrency(fee.base, state.settings.fees.currency)}</s>}
                    {formatCurrency(fee.fee, state.settings.fees.currency)}
                  </strong>
                </div>

                {/* Step 3: assignment */}
                <div className="section-title mt-24">
                  <span className="step-num">3</span> Doctor & session
                </div>
                <div className="form-grid">
                  <SelectField
                    name="doctorId"
                    label="Assign doctor"
                    required
                    placeholder="Select doctor"
                    options={doctors.map((d) => ({ value: d.id, label: `${d.name}${d.room ? ` · ${d.room}` : ''} — ${load(d.id)} in queue` }))}
                  />
                  <div className="field">
                    <span className="field__label">Visit session</span>
                    <div className="segmented" style={{ alignSelf: 'flex-start' }}>
                      {['morning', 'evening'].map((s) => (
                        <button key={s} type="button" className={cx(values.session === s && 'is-active')} onClick={() => setFieldValue('session', s)}>
                          <span className="flex items-center gap-4">
                            <CategoryIcon id={s} size={13} /> {CATEGORIES[s].label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <TextAreaField name="complaint" label="Presenting complaint (optional)" placeholder="e.g. Fever and cough for 2 days" rows={2} className="full" />
                </div>
                <details className="vitals-details mt-12">
                  <summary>Record vitals at reception (optional)</summary>
                  <div className="form-grid form-grid--3 mt-12">
                    <TextField name="vitals.bp" label="Blood pressure" placeholder="120/80" />
                    <TextField name="vitals.pulse" label="Pulse (/min)" placeholder="78" />
                    <TextField name="vitals.temp" label="Temperature (°F)" placeholder="98.6" />
                    <TextField name="vitals.weight" label="Weight (kg)" placeholder="70" />
                    <TextField name="vitals.spo2" label="SpO₂ (%)" placeholder="98" />
                  </div>
                </details>

                <div className="modal__footer" style={{ margin: '22px -22px -20px' }}>
                  <span className="grow muted text-sm">
                    Next token: <strong className="text-brand">#{padToken(todayVisits.reduce((m, v) => Math.max(m, v.tokenNo), 0) + 1)}</strong>
                  </span>
                  <Button variant="secondary" onClick={close}>
                    Cancel
                  </Button>
                  <Button type="submit" icon={Ticket}>
                    Issue token
                  </Button>
                </div>
              </Form>
            );
          }}
        </Formik>
      </Modal>
      {/* Rendered outside the token <Form> so its submit event never bubbles into it */}
      <PatientFormModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        allowIssueToken={false}
        onSaved={(p) => {
          formikRef.current?.setFieldValue('patientId', p.id);
          formikRef.current?.setFieldValue('category', p.tags.includes('free') ? 'free' : p.tags.includes('discounted') ? 'discounted' : 'regular');
        }}
      />
    </>
  );
}

