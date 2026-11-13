import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FieldArray, Form, Formik } from 'formik';
import * as Yup from 'yup';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCopy,
  Eye,
  HeartPulse,
  History,
  Info,
  PhoneCall,
  Pill,
  Plus,
  Printer,
  Save,
  Stethoscope,
  Store,
  Trash2,
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import CategoryTag, { TagList } from '@/components/ui/CategoryTag';
import { VisitStatusBadge } from '@/components/ui/Badge';
import VisitStepper from '@/components/ui/VisitStepper';
import EmptyState from '@/components/ui/EmptyState';
import { CellInput, CellSelect, SelectField, TextAreaField, TextField } from '@/components/form/Fields';
import { PrescriptionPreviewModal, usePrintPrescription } from '@/components/print/PrintPreviews';
import { BILLING_CATEGORY_IDS, CATEGORIES, COMMON_INSTRUCTIONS } from '@/data/constants';
import { STORE_ONLY_MEDICINES } from '@/data/catalog';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { computeConsultationFee } from '@/utils/billing';
import { addDays, dateKey, formatCurrency, formatDate, formatTime, padToken } from '@/utils/format';
import { requiredNumber, vitalsSchema } from '@/utils/validation';

const schema = Yup.object({
  category: Yup.string().oneOf(BILLING_CATEGORY_IDS).required(),
  complaint: Yup.string().max(300),
  diagnosis: Yup.string().trim().min(3, 'Add a diagnosis').required('Diagnosis is required to complete the consultation'),
  notes: Yup.string().max(600),
  followUpDate: Yup.string().test('future', 'Follow-up must be today or later', (v) => !v || v >= dateKey(new Date())),
  vitals: vitalsSchema,
  clinicItems: Yup.array().of(
    Yup.object({
      medicineId: Yup.string().required('Select a medicine'),
      dosage: Yup.string().trim().required('Dosage required'),
      quantity: requiredNumber('Qty', 'Qty').integer('Whole').min(1, 'Min 1'),
      instructions: Yup.string().max(120),
    }),
  ),
  storeItems: Yup.array().of(
    Yup.object({
      name: Yup.string().trim().required('Medicine name required'),
      dosage: Yup.string().trim().required('Dosage required'),
      quantity: requiredNumber('Qty', 'Qty').integer('Whole').min(1, 'Min 1'),
      instructions: Yup.string().max(120),
    }),
  ),
});

const emptyClinic = { medicineId: '', dosage: '', quantity: 1, instructions: '' };
const emptyStore = { name: '', dosage: '', quantity: 1, instructions: '' };

function toFormValues(visit) {
  return {
    category: visit.category,
    complaint: visit.complaint || '',
    diagnosis: visit.consultation?.diagnosis || '',
    notes: visit.consultation?.notes || '',
    followUpDate: visit.consultation?.followUpDate || '',
    vitals: { bp: '', pulse: '', temp: '', weight: '', spo2: '', ...visit.vitals },
    clinicItems: visit.clinicRx.items.map((i) => ({ id: i.id, medicineId: i.medicineId, dosage: i.dosage, quantity: i.quantity, instructions: i.instructions })),
    clinicNotes: visit.clinicRx.notes || '',
    storeItems: visit.storeRx.items.map((i) => ({ id: i.id, name: i.name, dosage: i.dosage, quantity: i.quantity, instructions: i.instructions })),
    storeNotes: visit.storeRx.notes || '',
  };
}

export default function Consultation() {
  const { visitId } = useParams();
  const { state, api, lookup, todayVisits } = useData();
  const { user, can } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const printRx = usePrintPrescription();
  const [preview, setPreview] = useState(null);
  const [done, setDone] = useState(false);

  const visit = lookup.visit[visitId];
  const patient = visit && lookup.patient[visit.patientId];
  const doctor = visit && lookup.staff[visit.doctorId];
  const cur = state.settings.fees.currency;

  const history = useMemo(
    () =>
      visit
        ? state.visits
            .filter((v) => v.patientId === visit.patientId && v.id !== visit.id && v.status !== 'cancelled' && v.consultation?.completedAt)
            .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt))
            .slice(0, 5)
        : [],
    [state.visits, visit],
  );

  const medOptions = useMemo(
    () =>
      [...state.medicines]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((m) => {
          const expired = m.expiryDate < dateKey(new Date());
          return {
            value: m.id,
            label: `${m.name} — ${expired ? 'EXPIRED' : `${m.currentStock} ${m.unit.toLowerCase()}(s) in stock`}`,
            disabled: expired || m.currentStock <= 0,
          };
        }),
    [state.medicines],
  );

  if (!visit || !patient) {
    return (
      <Card>
        <EmptyState icon={Stethoscope} title="Visit not found" action={<Button to="/consultations">Back to consultations</Button>} />
      </Card>
    );
  }

  const nextWaiting = todayVisits.find((v) => v.status === 'waiting' && (v.doctorId === user.id || v.doctorId === visit.doctorId));
  const readOnly = ['billing', 'completed', 'cancelled'].includes(visit.status);
  const notStarted = visit.status === 'waiting';

  const callNext = () => {
    if (!nextWaiting) return;
    api.startConsultation(nextWaiting.id, user.role === 'doctor' ? user.id : nextWaiting.doctorId, user.id);
    setDone(false);
    navigate(`/consultations/${nextWaiting.id}`);
  };

  /* ---------------- Completed / read-only view ---------------- */
  if (done || readOnly) {
    return (
      <>
        <PageHeader
          title={done ? 'Consultation completed' : `Consultation · Token #${visit.tokenNo}`}
          crumbs={[{ label: 'Home', to: '/' }, { label: 'Consultations', to: '/consultations' }, { label: `Token #${visit.tokenNo}` }]}
        />
        <Card>
          <CardBody>
            <div className="complete-hero">
              <span className="complete-hero__icon">
                <CheckCircle2 size={34} />
              </span>
              <h2>{patient.name}</h2>
              <p className="muted">
                {visit.consultation?.diagnosis} · {visit.clinicRx.items.length} clinic medicine(s) · {visit.storeRx.items.length} store medicine(s)
              </p>
              <div className="mt-16" style={{ width: '100%' }}>
                <VisitStepper status={visit.status} hasClinicMeds={visit.clinicRx.items.length > 0} />
              </div>
              <div className="callout callout--brand mt-16">
                <Info size={16} />
                <span>
                  {visit.status === 'pharmacy' && 'Patient has been sent to the dispensing counter for clinic medicines, then billing.'}
                  {visit.status === 'billing' && 'Patient has been sent to the billing desk. Billing is done at the end of the visit.'}
                  {visit.status === 'completed' && 'This visit is billed and completed.'}
                  {visit.status === 'cancelled' && 'This visit was cancelled.'}
                </span>
              </div>
              <div className="rx-print-pair mt-24">
                <div className="rx-print-card rx-print-card--clinic">
                  <Pill size={22} />
                  <strong>{state.settings.prescription.clinicTitle}</strong>
                  <span>{visit.clinicRx.items.length} item(s) · given by the clinic</span>
                  <div className="flex gap-8 mt-8">
                    <Button size="sm" variant="secondary" icon={Eye} onClick={() => setPreview('clinic')}>
                      Preview
                    </Button>
                    <Button size="sm" icon={Printer} onClick={() => printRx(visit.id, 'clinic')}>
                      Print
                    </Button>
                  </div>
                </div>
                <div className="rx-print-card rx-print-card--store">
                  <Store size={22} />
                  <strong>{state.settings.prescription.storeTitle}</strong>
                  <span>{visit.storeRx.items.length} item(s) · buy from medical store</span>
                  <div className="flex gap-8 mt-8">
                    <Button size="sm" variant="secondary" icon={Eye} onClick={() => setPreview('store')}>
                      Preview
                    </Button>
                    <Button size="sm" variant="gold" icon={Printer} onClick={() => printRx(visit.id, 'store')}>
                      Print
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex gap-8 wrap mt-24" style={{ justifyContent: 'center' }}>
                <Button variant="secondary" to={`/visits/${visit.id}`}>
                  View visit record
                </Button>
                <Button variant="secondary" to="/consultations">
                  Back to consultations
                </Button>
                {nextWaiting && can('consultation.perform') && (
                  <Button icon={PhoneCall} onClick={callNext}>
                    Call next · Token #{nextWaiting.tokenNo}
                  </Button>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
        <PrescriptionPreviewModal open={!!preview} onClose={() => setPreview(null)} visitId={visit.id} type={preview} />
      </>
    );
  }

  /* ---------------- Editable consultation ---------------- */
  return (
    <>
      <PageHeader
        title={`Consultation · Token #${visit.tokenNo}`}
        subtitle={`${formatDate(visit.date, { withDay: true })} · ${doctor?.name || 'Unassigned'}${doctor?.room ? ` · ${doctor.room}` : ''}`}
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Consultations', to: '/consultations' }, { label: `Token #${visit.tokenNo}` }]}
      />

      {/* Patient banner */}
      <Card className="patient-banner mb-16">
        <div className="patient-banner__main">
          <span className="token-chip token-chip--lg token-chip--gold">{padToken(visit.tokenNo)}</span>
          <Avatar name={patient.name} size="lg" />
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="patient-banner__name">{patient.name}</div>
            <div className="patient-banner__meta">
              <span className="mono">{patient.id}</span> · {patient.age} yrs · {patient.gender} · {patient.phone}
              {patient.bloodGroup ? ` · ${patient.bloodGroup}` : ''}
            </div>
            <div className="tag-list mt-8">
              <CategoryTag id={visit.category} size="lg" />
              <CategoryTag id={visit.session} size="lg" />
              <TagList ids={patient.tags.filter((t) => t !== visit.category && t !== 'regular')} size="lg" />
            </div>
          </div>
          <div className="patient-banner__status">
            <VisitStatusBadge status={visit.status} />
            <span className="text-xs muted">Token issued {formatTime(visit.registeredAt)}</span>
          </div>
        </div>
        <div className="patient-banner__stepper">
          <VisitStepper status={visit.status} />
        </div>
      </Card>

      {notStarted ? (
        <Card>
          <EmptyState
            icon={PhoneCall}
            title="Patient is still in the waiting queue"
            text="Call the patient in to start the consultation."
            action={
              <Button
                icon={PhoneCall}
                onClick={() => api.startConsultation(visit.id, user.role === 'doctor' ? user.id : visit.doctorId, user.id)}
              >
                Call in & start consultation
              </Button>
            }
          />
        </Card>
      ) : (
        <Formik
          initialValues={toFormValues(visit)}
          validationSchema={schema}
          onSubmit={(values) => {
            api.saveConsultation(visit.id, values, { complete: true }, user.id);
            toast.success('Consultation completed', values.clinicItems.length ? 'Patient sent to dispensing, then billing.' : 'Patient sent to the billing desk.');
            setDone(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          {({ values, setFieldValue, setValues, submitCount, isValid, errors }) => {
            const fee = computeConsultationFee(values.category, state.settings);
            const saveDraft = (silent) => {
              api.saveConsultation(visit.id, values, { complete: false }, user.id);
              if (!silent) toast.success('Draft saved', 'You can continue this consultation any time.');
            };
            const openPreview = (type) => {
              saveDraft(true);
              setPreview(type);
            };
            const repeatFrom = (v) => {
              setValues({
                ...values,
                clinicItems: v.clinicRx.items.map((i) => ({ medicineId: i.medicineId, dosage: i.dosage, quantity: i.quantity, instructions: i.instructions })),
                storeItems: v.storeRx.items.map((i) => ({ name: i.name, dosage: i.dosage, quantity: i.quantity, instructions: i.instructions })),
              });
              toast.info('Prescription copied', `Medicines from ${formatDate(v.date)} added — review before completing.`);
            };
            return (
              <Form noValidate>
                <div className="grid grid-main-side">
                  <div style={{ minWidth: 0, display: 'grid', gap: 18 }}>
                    {/* Clinical assessment */}
                    <Card>
                      <CardHeader title="Clinical assessment" icon={HeartPulse} />
                      <CardBody>
                        <div className="form-grid">
                          <TextAreaField name="complaint" label="Presenting complaint" rows={2} placeholder="Symptoms, duration…" />
                          <TextAreaField name="diagnosis" label="Diagnosis" required rows={2} placeholder="e.g. Acute viral fever" />
                        </div>
                        <div className="vitals-grid mt-16">
                          <TextField name="vitals.bp" label="BP (mmHg)" placeholder="120/80" />
                          <TextField name="vitals.pulse" label="Pulse (/min)" placeholder="78" />
                          <TextField name="vitals.temp" label="Temp (°F)" placeholder="98.6" />
                          <TextField name="vitals.weight" label="Weight (kg)" placeholder="70" />
                          <TextField name="vitals.spo2" label="SpO₂ (%)" placeholder="98" />
                        </div>
                        <div className="form-grid mt-16">
                          <TextAreaField name="notes" label="Clinical notes & advice" rows={2} placeholder="Examination findings, advice, red flags…" className="full" />
                          <div className="field">
                            <TextField name="followUpDate" label="Follow-up date" type="date" min={dateKey(new Date())} />
                            <div className="flex gap-4 wrap">
                              {[
                                ['Tomorrow', 1],
                                ['3 days', 3],
                                ['1 week', 7],
                                ['2 weeks', 14],
                              ].map(([l, d]) => (
                                <button key={l} type="button" className="chip-btn" onClick={() => setFieldValue('followUpDate', dateKey(addDays(new Date(), d)))}>
                                  {l}
                                </button>
                              ))}
                              {values.followUpDate && (
                                <button type="button" className="chip-btn" onClick={() => setFieldValue('followUpDate', '')}>
                                  Clear
                                </button>
                              )}
                            </div>
                          </div>
                          <SelectField
                            name="category"
                            label="Patient category (billing)"
                            hint={fee.isFree ? 'No consultation charge' : `Consultation fee ${formatCurrency(fee.fee, cur)}${fee.waived ? ` (${formatCurrency(fee.waived, cur)} waived)` : ''}`}
                            options={BILLING_CATEGORY_IDS.map((id) => ({ value: id, label: CATEGORIES[id].label }))}
                          />
                        </div>
                      </CardBody>
                    </Card>

                    {/* Prescription 1: Clinic */}
                    <Card className="rx-card rx-card--clinic">
                      <CardHeader
                        icon={Pill}
                        title={<span>Prescription 1 · {state.settings.prescription.clinicTitle}</span>}
                        subtitle="Medicines administered or provided directly by the clinic (from clinic inventory)"
                        actions={
                          <>
                            <Button size="sm" variant="ghost" icon={Eye} onClick={() => openPreview('clinic')}>
                              Preview
                            </Button>
                            <Button size="sm" variant="secondary" icon={Printer} onClick={() => { saveDraft(true); printRx(visit.id, 'clinic'); }}>
                              Print
                            </Button>
                          </>
                        }
                      />
                      <FieldArray name="clinicItems">
                        {({ push, remove }) => (
                          <>
                            <div className="table-wrap">
                              <table className="table table--compact rx-table">
                                <thead>
                                  <tr>
                                    <th style={{ width: 34 }}>#</th>
                                    <th style={{ minWidth: 230 }}>Medicine (inventory)</th>
                                    <th style={{ minWidth: 150 }}>Dosage</th>
                                    <th style={{ width: 86 }}>Qty</th>
                                    <th style={{ minWidth: 170 }}>Instructions</th>
                                    <th style={{ width: 44 }} />
                                  </tr>
                                </thead>
                                <tbody>
                                  {values.clinicItems.map((item, i) => {
                                    const med = lookup.medicine[item.medicineId];
                                    const over = med && Number(item.quantity) > med.currentStock;
                                    return (
                                      <tr key={item.id || i}>
                                        <td className="muted">{i + 1}</td>
                                        <td>
                                          <CellSelect name={`clinicItems.${i}.medicineId`} options={medOptions} placeholder="Select medicine…" />
                                          {over && (
                                            <div className="field__error mt-4">
                                              <AlertTriangle size={11} /> Only {med.currentStock} in stock
                                            </div>
                                          )}
                                        </td>
                                        <td>
                                          <CellInput name={`clinicItems.${i}.dosage`} placeholder="e.g. 30mg IM — stat" />
                                        </td>
                                        <td>
                                          <CellInput name={`clinicItems.${i}.quantity`} type="number" min={1} />
                                        </td>
                                        <td>
                                          <CellInput name={`clinicItems.${i}.instructions`} placeholder="Instructions" list="instr-list" />
                                        </td>
                                        <td>
                                          <button type="button" className="icon-btn icon-btn--plain" onClick={() => remove(i)} aria-label="Remove medicine">
                                            <Trash2 size={15} />
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                            {values.clinicItems.length === 0 && <div className="rx-empty">No clinic medicines — add injections, IV fluids, nebulisation or medicines given at the clinic.</div>}
                            <CardBody>
                              <div className="flex gap-12 wrap items-center">
                                <Button size="sm" variant="soft" icon={Plus} onClick={() => push({ ...emptyClinic })}>
                                  Add clinic medicine
                                </Button>
                                <span className="text-xs muted flex items-center gap-4">
                                  <Info size={13} /> Stock is deducted only when the medicine is dispensed / administered — not when prescribed.
                                </span>
                              </div>
                              <div className="mt-12">
                                <TextAreaField name="clinicNotes" label="Clinic prescription notes" rows={2} placeholder="e.g. Observe for 30 minutes after injection" />
                              </div>
                            </CardBody>
                          </>
                        )}
                      </FieldArray>
                    </Card>

                    {/* Prescription 2: Medical store */}
                    <Card className="rx-card rx-card--store">
                      <CardHeader
                        icon={Store}
                        title={<span>Prescription 2 · {state.settings.prescription.storeTitle}</span>}
                        subtitle="Medicines the patient will purchase from a medical store outside the clinic"
                        actions={
                          <>
                            <Button size="sm" variant="ghost" icon={Eye} onClick={() => openPreview('store')}>
                              Preview
                            </Button>
                            <Button size="sm" variant="secondary" icon={Printer} onClick={() => { saveDraft(true); printRx(visit.id, 'store'); }}>
                              Print
                            </Button>
                          </>
                        }
                      />
                      <FieldArray name="storeItems">
                        {({ push, remove }) => (
                          <>
                            <div className="table-wrap">
                              <table className="table table--compact rx-table">
                                <thead>
                                  <tr>
                                    <th style={{ width: 34 }}>#</th>
                                    <th style={{ minWidth: 230 }}>Medicine name</th>
                                    <th style={{ minWidth: 150 }}>Dosage</th>
                                    <th style={{ width: 86 }}>Qty</th>
                                    <th style={{ minWidth: 170 }}>Instructions</th>
                                    <th style={{ width: 44 }} />
                                  </tr>
                                </thead>
                                <tbody>
                                  {values.storeItems.map((item, i) => (
                                    <tr key={item.id || i}>
                                      <td className="muted">{i + 1}</td>
                                      <td>
                                        <CellInput name={`storeItems.${i}.name`} placeholder="Type medicine name…" list="store-med-list" />
                                      </td>
                                      <td>
                                        <CellInput name={`storeItems.${i}.dosage`} placeholder="1 tab — twice a day" />
                                      </td>
                                      <td>
                                        <CellInput name={`storeItems.${i}.quantity`} type="number" min={1} />
                                      </td>
                                      <td>
                                        <CellInput name={`storeItems.${i}.instructions`} placeholder="Instructions" list="instr-list" />
                                      </td>
                                      <td>
                                        <button type="button" className="icon-btn icon-btn--plain" onClick={() => remove(i)} aria-label="Remove medicine">
                                          <Trash2 size={15} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            {values.storeItems.length === 0 && <div className="rx-empty">No medical-store medicines added yet.</div>}
                            <CardBody>
                              <Button size="sm" variant="soft" icon={Plus} onClick={() => push({ ...emptyStore })}>
                                Add store medicine
                              </Button>
                              <div className="mt-12">
                                <TextAreaField name="storeNotes" label="Store prescription notes" rows={2} placeholder="e.g. Complete the full antibiotic course" />
                              </div>
                            </CardBody>
                          </>
                        )}
                      </FieldArray>
                    </Card>

                    <datalist id="instr-list">
                      {COMMON_INSTRUCTIONS.map((i) => (
                        <option key={i} value={i} />
                      ))}
                    </datalist>
                    <datalist id="store-med-list">
                      {[...state.medicines.map((m) => m.name), ...STORE_ONLY_MEDICINES].map((n) => (
                        <option key={n} value={n} />
                      ))}
                    </datalist>
                  </div>

                  {/* Side panel */}
                  <div style={{ minWidth: 0, display: 'grid', gap: 18, alignContent: 'start' }}>
                    <Card>
                      <CardHeader title="Billing preview" subtitle="Charged at the end of the visit" />
                      <CardBody>
                        <div className="kv-row">
                          <span>Category</span>
                          <span>
                            <CategoryTag id={values.category} size="sm" />
                          </span>
                        </div>
                        <div className="kv-row">
                          <span>Consultation fee</span>
                          <span>{formatCurrency(fee.base, cur)}</span>
                        </div>
                        {fee.waived > 0 && (
                          <div className="kv-row">
                            <span>Category waiver</span>
                            <span className="text-green">- {formatCurrency(fee.waived, cur)}</span>
                          </div>
                        )}
                        <div className="kv-row">
                          <span>Clinic medicines</span>
                          <span className="muted text-sm">added when dispensed</span>
                        </div>
                        <div className="kv-row kv-row--total">
                          <span>Consultation payable</span>
                          <span>{formatCurrency(fee.fee, cur)}</span>
                        </div>
                      </CardBody>
                    </Card>

                    <Card>
                      <CardHeader title="Previous visits" subtitle={`${history.length ? 'Tap to repeat a prescription' : 'First consultation'}`} icon={History} />
                      {history.length === 0 ? (
                        <EmptyState icon={History} title="No previous visits" />
                      ) : (
                        <div className="list">
                          {history.map((h) => (
                            <div key={h.id} className="list__item" style={{ alignItems: 'flex-start' }}>
                              <div className="grow" style={{ minWidth: 0 }}>
                                <div className="flex items-center gap-8">
                                  <strong className="text-sm">{formatDate(h.date)}</strong>
                                  <CategoryTag id={h.category} size="sm" short />
                                </div>
                                <div className="text-sm mt-4">{h.consultation?.diagnosis}</div>
                                <div className="text-xs muted mt-4">
                                  {h.clinicRx.items.length} clinic · {h.storeRx.items.length} store · {lookup.staff[h.doctorId]?.name}
                                </div>
                              </div>
                              <Button size="sm" variant="ghost" iconOnly icon={ClipboardCopy} title="Repeat this prescription" aria-label="Repeat this prescription" onClick={() => repeatFrom(h)} />
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  </div>
                </div>

                {/* Sticky action bar */}
                <div className="action-bar">
                  <div className="action-bar__info">
                    {submitCount > 0 && !isValid ? (
                      <span className="text-red flex items-center gap-4">
                        <AlertTriangle size={15} /> {typeof errors.diagnosis === 'string' ? errors.diagnosis : 'Please fix the highlighted fields.'}
                      </span>
                    ) : (
                      <span className="muted text-sm">
                        <strong>{values.clinicItems.length}</strong> clinic · <strong>{values.storeItems.length}</strong> store medicine(s) · next:{' '}
                        {values.clinicItems.length ? 'Dispensing → Billing' : 'Billing'}
                      </span>
                    )}
                  </div>
                  <Button variant="secondary" icon={Save} onClick={() => saveDraft(false)}>
                    Save draft
                  </Button>
                  <Button type="submit" icon={CheckCircle2}>
                    Complete consultation
                  </Button>
                </div>
              </Form>
            );
          }}
        </Formik>
      )}
      <PrescriptionPreviewModal open={!!preview} onClose={() => setPreview(null)} visitId={visit.id} type={preview} />
    </>
  );
}
