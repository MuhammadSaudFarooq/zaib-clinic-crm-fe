import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
  CircleDot,
  ClipboardList,
  Eye,
  HeartPulse,
  Pill,
  Printer,
  Receipt,
  Stethoscope,
  Store,
  Ticket,
  User,
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import CategoryTag, { TagList } from '@/components/ui/CategoryTag';
import Badge, { PaymentBadge, VisitStatusBadge } from '@/components/ui/Badge';
import VisitStepper from '@/components/ui/VisitStepper';
import EmptyState from '@/components/ui/EmptyState';
import { PrescriptionPreviewModal, ReceiptPreviewModal, usePrintPrescription, usePrintReceipt } from '@/components/print/PrintPreviews';
import { PAYMENT_METHODS } from '@/data/constants';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { formatCurrency, formatDate, formatDateTime, formatTime, padToken } from '@/utils/format';

function RxItems({ items, clinic }) {
  if (!items.length) return <div className="rx-empty">No medicines on this prescription.</div>;
  return (
    <div className="table-wrap">
      <table className="table table--compact">
        <thead>
          <tr>
            <th>Medicine</th>
            <th>Dosage</th>
            <th className="num">Qty</th>
            {clinic && <th>Status</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td>
                <div className="fw-600">{i.name}</div>
                {i.instructions && <div className="text-xs muted">{i.instructions}</div>}
              </td>
              <td className="text-sm">{i.dosage}</td>
              <td className="num">{i.quantity}</td>
              {clinic && (
                <td>
                  {i.dispensed ? (
                    <Badge tone="green" dot>
                      Given ({i.dispensedQty})
                    </Badge>
                  ) : i.declined ? (
                    <Badge tone="gray">Not given</Badge>
                  ) : (
                    <Badge tone="amber" dot>
                      Pending
                    </Badge>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function VisitDetail() {
  const { visitId } = useParams();
  const { state, lookup } = useData();
  const { can } = useAuth();
  const printRx = usePrintPrescription();
  const printReceipt = usePrintReceipt();
  const [rxPreview, setRxPreview] = useState(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const cur = state.settings.fees.currency;

  const visit = lookup.visit[visitId];
  if (!visit) {
    return (
      <Card>
        <EmptyState icon={ClipboardList} title="Visit not found" action={<Button to="/visits">All visits</Button>} />
      </Card>
    );
  }
  const patient = lookup.patient[visit.patientId];
  const doctor = lookup.staff[visit.doctorId];
  const bill = visit.billId ? lookup.bill[visit.billId] : null;
  const c = visit.consultation;
  const v = visit.vitals || {};

  const events = [
    { label: 'Token issued & added to queue', at: visit.registeredAt, by: lookup.staff[visit.createdBy]?.name, icon: Ticket },
    c?.startedAt && { label: `Called in by ${doctor?.name || 'doctor'}`, at: c.startedAt, icon: Stethoscope },
    c?.completedAt && { label: 'Consultation completed · prescriptions written', at: c.completedAt, icon: CheckCircle2 },
    visit.clinicRx.dispensedAt && { label: 'Clinic medicines dispensed', at: visit.clinicRx.dispensedAt, by: lookup.staff[visit.clinicRx.dispensedBy]?.name, icon: Pill },
    bill && { label: `Billed · ${bill.receiptNo}`, at: bill.createdAt, by: lookup.staff[bill.createdBy]?.name, icon: Receipt },
  ].filter(Boolean);

  return (
    <>
      <PageHeader
        title={`Visit · Token #${visit.tokenNo}`}
        subtitle={`${visit.id} · ${formatDate(visit.date, { withDay: true })}`}
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Visit Records', to: '/visits' }, { label: visit.id }]}
        actions={
          <>
            {['waiting', 'in_consultation', 'pharmacy'].includes(visit.status) && can('consultation.perform') && (
              <Button variant="secondary" icon={Stethoscope} to={`/consultations/${visit.id}`}>
                Consultation
              </Button>
            )}
            {visit.status === 'pharmacy' && can('pharmacy.dispense') && (
              <Button variant="soft" icon={Pill} to="/pharmacy">
                Dispense
              </Button>
            )}
            {visit.status === 'billing' && can('billing.create') && (
              <Button variant="gold" icon={Receipt} to={`/billing/checkout/${visit.id}`}>
                Checkout
              </Button>
            )}
            {bill && (
              <Button icon={Printer} onClick={() => printReceipt(bill.id)}>
                Print receipt
              </Button>
            )}
          </>
        }
      />

      <Card className="mb-16">
        <CardBody>
          <div className="flex items-center justify-between gap-12 wrap mb-16">
            <div className="flex items-center gap-12">
              <span className="token-chip token-chip--lg">{padToken(visit.tokenNo)}</span>
              <div>
                <div className="fw-700">Patient journey</div>
                <div className="text-sm muted">Registration → Token → Queue → Consultation → Prescriptions → Dispensing → Billing → Receipt</div>
              </div>
            </div>
            <VisitStatusBadge status={visit.status} />
          </div>
          <VisitStepper status={visit.status} hasClinicMeds={visit.clinicRx.items.length > 0} />
        </CardBody>
      </Card>

      <div className="grid grid-side-main">
        <div style={{ display: 'grid', gap: 18, alignContent: 'start', minWidth: 0 }}>
          <Card>
            <CardHeader title="Patient" icon={User} actions={<Button size="sm" variant="ghost" to={`/patients/${patient?.id}`}>Profile</Button>} />
            <CardBody>
              <div className="flex items-center gap-12">
                <Avatar name={patient?.name} size="lg" />
                <div style={{ minWidth: 0 }}>
                  <div className="fw-700">{patient?.name}</div>
                  <div className="text-sm muted mono">{patient?.id}</div>
                  <div className="text-sm muted">
                    {patient?.age} yrs · {patient?.gender} · {patient?.phone}
                  </div>
                </div>
              </div>
              <div className="mt-12">
                <TagList ids={[visit.category, visit.session, ...(patient?.tags || []).filter((t) => t !== 'regular')]} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Visit details" icon={CalendarDays} />
            <CardBody>
              <div className="kv-row">
                <span>Visit date</span>
                <span>{formatDate(visit.date)}</span>
              </div>
              <div className="kv-row">
                <span>Registered</span>
                <span>{formatTime(visit.registeredAt)}</span>
              </div>
              <div className="kv-row">
                <span>Session</span>
                <span>
                  <CategoryTag id={visit.session} size="sm" short />
                </span>
              </div>
              <div className="kv-row">
                <span>Category</span>
                <span>
                  <CategoryTag id={visit.category} size="sm" />
                </span>
              </div>
              <div className="kv-row">
                <span>Doctor</span>
                <span>{doctor?.name || '—'}</span>
              </div>
              <div className="kv-row">
                <span>Follow-up</span>
                <span>{c?.followUpDate ? formatDate(c.followUpDate) : '—'}</span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Timeline" icon={CircleDot} />
            <CardBody>
              <ul className="feed">
                {events.map((e) => {
                  const Icon = e.icon;
                  return (
                    <li key={e.label} className="feed__item">
                      <span className="feed__icon tone-brand">
                        <Icon size={15} />
                      </span>
                      <div>
                        <div className="feed__text">{e.label}</div>
                        <div className="feed__time">
                          {formatDateTime(e.at)}
                          {e.by ? ` · ${e.by}` : ''}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardBody>
          </Card>
        </div>

        <div style={{ display: 'grid', gap: 18, alignContent: 'start', minWidth: 0 }}>
          <Card>
            <CardHeader title="Consultation" icon={HeartPulse} />
            <CardBody>
              {!c ? (
                <div className="muted">The patient has not been seen by the doctor yet.</div>
              ) : (
                <>
                  <div className="kv">
                    <div>
                      <div className="kv__label">Presenting complaint</div>
                      <div className="kv__value">{visit.complaint || '—'}</div>
                    </div>
                    <div>
                      <div className="kv__label">Diagnosis</div>
                      <div className="kv__value">{c.diagnosis || '—'}</div>
                    </div>
                  </div>
                  <div className="vitals-strip mt-16">
                    {[
                      ['BP', v.bp, 'mmHg'],
                      ['Pulse', v.pulse, '/min'],
                      ['Temp', v.temp, '°F'],
                      ['Weight', v.weight, 'kg'],
                      ['SpO₂', v.spo2, '%'],
                    ].map(([l, val, u]) => (
                      <div key={l}>
                        <span>{l}</span>
                        <strong>
                          {val || '—'} {val ? <small>{u}</small> : null}
                        </strong>
                      </div>
                    ))}
                  </div>
                  {c.notes && <p className="mt-16 text-sm">{c.notes}</p>}
                </>
              )}
            </CardBody>
          </Card>

          <div className="grid grid-2">
            <Card className="rx-card rx-card--clinic">
              <CardHeader
                title={state.settings.prescription.clinicTitle}
                subtitle="Given / administered by the clinic"
                icon={Pill}
                actions={
                  <>
                    <Button size="sm" variant="ghost" iconOnly icon={Eye} onClick={() => setRxPreview('clinic')} aria-label="Preview" title="Preview" />
                    <Button size="sm" variant="secondary" icon={Printer} onClick={() => printRx(visit.id, 'clinic')}>
                      Print
                    </Button>
                  </>
                }
              />
              <RxItems items={visit.clinicRx.items} clinic />
            </Card>
            <Card className="rx-card rx-card--store">
              <CardHeader
                title={state.settings.prescription.storeTitle}
                subtitle="Purchase from a medical store"
                icon={Store}
                actions={
                  <>
                    <Button size="sm" variant="ghost" iconOnly icon={Eye} onClick={() => setRxPreview('store')} aria-label="Preview" title="Preview" />
                    <Button size="sm" variant="secondary" icon={Printer} onClick={() => printRx(visit.id, 'store')}>
                      Print
                    </Button>
                  </>
                }
              />
              <RxItems items={visit.storeRx.items} />
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Billing"
              icon={Receipt}
              actions={
                bill && (
                  <>
                    <Button size="sm" variant="ghost" icon={Eye} onClick={() => setReceiptOpen(true)}>
                      Receipt preview
                    </Button>
                    <Button size="sm" icon={Printer} onClick={() => printReceipt(bill.id)}>
                      Print
                    </Button>
                  </>
                )
              }
            />
            <CardBody>
              {!bill ? (
                <div className="callout callout--info">
                  <Receipt size={16} />
                  <span>Not billed yet. Billing happens at the end of the visit, after consultation and dispensing.</span>
                </div>
              ) : (
                <div className="grid grid-2" style={{ gap: 24 }}>
                  <div>
                    <div className="kv-row">
                      <span>Receipt no.</span>
                      <span className="mono">{bill.receiptNo}</span>
                    </div>
                    <div className="kv-row">
                      <span>Date</span>
                      <span>{formatDateTime(bill.createdAt)}</span>
                    </div>
                    <div className="kv-row">
                      <span>Method</span>
                      <span>{PAYMENT_METHODS.find((m) => m.id === bill.paymentMethod)?.label}</span>
                    </div>
                    <div className="kv-row">
                      <span>Status</span>
                      <span>
                        <PaymentBadge status={bill.paymentStatus} />
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="kv-row">
                      <span>Consultation</span>
                      <span>{formatCurrency(bill.consultationFee, cur)}</span>
                    </div>
                    <div className="kv-row">
                      <span>Medicines</span>
                      <span>{formatCurrency(bill.medicineCharges, cur)}</span>
                    </div>
                    <div className="kv-row">
                      <span>Additional</span>
                      <span>{formatCurrency(bill.additionalTotal, cur)}</span>
                    </div>
                    <div className="kv-row">
                      <span>Discounts</span>
                      <span className="text-green">- {formatCurrency(bill.totalDiscount, cur)}</span>
                    </div>
                    <div className="kv-row kv-row--total">
                      <span>Total</span>
                      <span>{formatCurrency(bill.total, cur)}</span>
                    </div>
                    <div className="kv-row">
                      <span>Paid</span>
                      <span>{formatCurrency(bill.amountPaid, cur)}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <PrescriptionPreviewModal open={!!rxPreview} onClose={() => setRxPreview(null)} visitId={visit.id} type={rxPreview} />
      <ReceiptPreviewModal open={receiptOpen} onClose={() => setReceiptOpen(false)} billId={bill?.id} />
    </>
  );
}
