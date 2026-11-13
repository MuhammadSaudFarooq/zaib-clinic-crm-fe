import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Banknote,
  CalendarClock,
  ClipboardList,
  Droplet,
  Eye,
  FileText,
  MapPin,
  Pencil,
  Phone,
  Pill,
  Printer,
  Receipt,
  Stethoscope,
  Store,
  Ticket,
  UserX,
  Wallet,
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Tabs from '@/components/ui/Tabs';
import CategoryTag, { TagList } from '@/components/ui/CategoryTag';
import { PaymentBadge, VisitStatusBadge } from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import StatCard from '@/components/ui/StatCard';
import { PrescriptionPreviewModal, ReceiptPreviewModal, usePrintPrescription, usePrintReceipt } from '@/components/print/PrintPreviews';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { formatCurrency, formatDate, formatTime, padToken } from '@/utils/format';
import PatientFormModal from './PatientFormModal';
import IssueTokenModal from '@/pages/queue/IssueTokenModal';

export default function PatientDetail() {
  const { id } = useParams();
  const { state, lookup } = useData();
  const { can } = useAuth();
  const [tab, setTab] = useState('visits');
  const [editOpen, setEditOpen] = useState(false);
  const [tokenOpen, setTokenOpen] = useState(false);
  const [rxPreview, setRxPreview] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const printRx = usePrintPrescription();
  const printReceipt = usePrintReceipt();
  const cur = state.settings.fees.currency;

  const patient = lookup.patient[id];
  const visits = useMemo(
    () => state.visits.filter((v) => v.patientId === id).sort((a, b) => b.registeredAt.localeCompare(a.registeredAt)),
    [state.visits, id],
  );
  const bills = useMemo(
    () => state.bills.filter((b) => b.patientId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.bills, id],
  );
  const rxVisits = visits.filter((v) => v.clinicRx.items.length || v.storeRx.items.length);

  if (!patient) {
    return (
      <Card>
        <EmptyState icon={UserX} title="Patient not found" text="This record does not exist or was removed." action={<Button to="/patients">Back to patients</Button>} />
      </Card>
    );
  }

  const active = visits.filter((v) => v.status !== 'cancelled');
  const totalBilled = bills.reduce((a, b) => a + b.total, 0);
  const totalPaid = bills.reduce((a, b) => a + b.amountPaid, 0);
  const outstanding = bills.reduce((a, b) => a + b.balance, 0);
  const lastVisit = active[0];
  const openVisit = visits.find((v) => !['completed', 'cancelled'].includes(v.status));

  return (
    <>
      <PageHeader
        title={patient.name}
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Patients', to: '/patients' }, { label: patient.id }]}
        actions={
          <>
            {can('patients.edit') && (
              <Button variant="secondary" icon={Pencil} onClick={() => setEditOpen(true)}>
                Edit
              </Button>
            )}
            {can('queue.manage') && !openVisit && (
              <Button icon={Ticket} onClick={() => setTokenOpen(true)}>
                Issue Token
              </Button>
            )}
            {openVisit && (
              <Button variant="gold" icon={ClipboardList} to={`/visits/${openVisit.id}`}>
                Open active visit · Token #{openVisit.tokenNo}
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-side-main">
        <Card className="profile-card">
          <div className="profile-card__top">
            <Avatar name={patient.name} size="xl" />
            <div className="profile-card__name">{patient.name}</div>
            <div className="mono muted">{patient.id}</div>
            <div className="mt-12">
              <TagList ids={[...patient.tags, lastVisit?.category !== 'regular' ? lastVisit?.category : null]} />
            </div>
          </div>
          <CardBody>
            <div className="kv kv--1">
              <div className="info-line">
                <Phone size={15} /> <span>{patient.phone}</span>
              </div>
              <div className="info-line">
                <MapPin size={15} /> <span>{patient.address}</span>
              </div>
              <div className="info-line">
                <CalendarClock size={15} /> <span>Registered {formatDate(patient.registeredAt)} · {formatTime(patient.registeredAt)}</span>
              </div>
              {patient.bloodGroup && (
                <div className="info-line">
                  <Droplet size={15} /> <span>Blood group {patient.bloodGroup}</span>
                </div>
              )}
            </div>
            <div className="divider" />
            <div className="kv">
              <div>
                <div className="kv__label">Age</div>
                <div className="kv__value">{patient.age} years</div>
              </div>
              <div>
                <div className="kv__label">Gender</div>
                <div className="kv__value">{patient.gender}</div>
              </div>
              <div>
                <div className="kv__label">Last visit</div>
                <div className="kv__value">{lastVisit ? formatDate(lastVisit.date) : '—'}</div>
              </div>
              <div>
                <div className="kv__label">Follow-up due</div>
                <div className="kv__value">{lastVisit?.consultation?.followUpDate ? formatDate(lastVisit.consultation.followUpDate) : '—'}</div>
              </div>
            </div>
            {patient.notes && (
              <div className="callout callout--brand mt-16">
                <FileText size={16} />
                <span>{patient.notes}</span>
              </div>
            )}
          </CardBody>
        </Card>

        <div style={{ minWidth: 0 }}>
          <div className="grid grid-4 mb-16">
            <StatCard label="Total visits" value={active.length} icon={Stethoscope} tone="brand" />
            <StatCard label="Prescriptions" value={rxVisits.length * 2} icon={FileText} tone="violet" foot={<span>clinic + store</span>} />
            <StatCard label="Total paid" value={formatCurrency(totalPaid, cur)} icon={Banknote} tone="green" foot={<span>of {formatCurrency(totalBilled, cur)} billed</span>} />
            <StatCard label="Outstanding" value={formatCurrency(outstanding, cur)} icon={Wallet} tone={outstanding ? 'red' : 'gray'} />
          </div>

          <Card>
            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { id: 'visits', label: 'Visit history', icon: ClipboardList, count: visits.length },
                { id: 'rx', label: 'Prescriptions', icon: Pill, count: rxVisits.length },
                { id: 'bills', label: 'Bills', icon: Receipt, count: bills.length },
              ]}
            />

            {tab === 'visits' &&
              (visits.length === 0 ? (
                <EmptyState icon={ClipboardList} title="No visits yet" text="Issue a token to start this patient’s first visit." />
              ) : (
                <div className="timeline">
                  {visits.map((v) => (
                    <Link to={`/visits/${v.id}`} key={v.id} className="timeline__item">
                      <div className="timeline__date">
                        <strong>{formatDate(v.date).slice(0, 6)}</strong>
                        <span>{v.date.slice(0, 4)}</span>
                      </div>
                      <div className="timeline__card">
                        <div className="flex items-center gap-8 wrap">
                          <span className="token-chip token-chip--sm">{padToken(v.tokenNo)}</span>
                          <strong className="grow">{v.consultation?.diagnosis || v.complaint || 'Awaiting consultation'}</strong>
                          <VisitStatusBadge status={v.status} />
                        </div>
                        <div className="flex items-center gap-8 wrap mt-8 text-sm muted">
                          <CategoryTag id={v.category} size="sm" short />
                          <CategoryTag id={v.session} size="sm" short />
                          <span>· {formatTime(v.registeredAt)}</span>
                          <span>· {lookup.staff[v.doctorId]?.name || 'Unassigned'}</span>
                          {v.billId && <span>· {formatCurrency(lookup.bill[v.billId]?.total, cur)}</span>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ))}

            {tab === 'rx' &&
              (rxVisits.length === 0 ? (
                <EmptyState icon={Pill} title="No prescriptions yet" />
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Visit</th>
                        <th>Diagnosis</th>
                        <th>Clinic Prescription</th>
                        <th>Medical Store Prescription</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rxVisits.map((v) => (
                        <tr key={v.id}>
                          <td className="nowrap">
                            <div className="fw-600">{formatDate(v.date)}</div>
                            <div className="text-xs muted">Token #{v.tokenNo} · {lookup.staff[v.doctorId]?.name}</div>
                          </td>
                          <td style={{ minWidth: 180 }}>{v.consultation?.diagnosis || '—'}</td>
                          <td>
                            <div className="rx-cell">
                              <span className="text-sm">
                                <Pill size={13} /> {v.clinicRx.items.length} item(s)
                              </span>
                              <div className="flex gap-4">
                                <Button size="sm" variant="ghost" iconOnly icon={Eye} onClick={() => setRxPreview({ id: v.id, type: 'clinic' })} aria-label="Preview clinic prescription" />
                                <Button size="sm" variant="soft" icon={Printer} onClick={() => printRx(v.id, 'clinic')}>
                                  Print
                                </Button>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="rx-cell">
                              <span className="text-sm">
                                <Store size={13} /> {v.storeRx.items.length} item(s)
                              </span>
                              <div className="flex gap-4">
                                <Button size="sm" variant="ghost" iconOnly icon={Eye} onClick={() => setRxPreview({ id: v.id, type: 'store' })} aria-label="Preview store prescription" />
                                <Button size="sm" variant="soft" icon={Printer} onClick={() => printRx(v.id, 'store')}>
                                  Print
                                </Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

            {tab === 'bills' &&
              (bills.length === 0 ? (
                <EmptyState icon={Receipt} title="No bills yet" text="Bills are created at the end of each visit." />
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Receipt</th>
                        <th>Date</th>
                        <th>Category</th>
                        <th className="num">Total</th>
                        <th className="num">Paid</th>
                        <th>Status</th>
                        <th className="text-right">Receipt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bills.map((b) => (
                        <tr key={b.id}>
                          <td className="mono nowrap">{b.receiptNo}</td>
                          <td className="nowrap">
                            {formatDate(b.createdAt)}
                            <div className="text-xs muted">Token #{b.tokenNo}</div>
                          </td>
                          <td>
                            <CategoryTag id={b.category} short />
                          </td>
                          <td className="num fw-600">{formatCurrency(b.total, cur)}</td>
                          <td className="num">{formatCurrency(b.amountPaid, cur)}</td>
                          <td>
                            <PaymentBadge status={b.paymentStatus} />
                          </td>
                          <td className="text-right nowrap">
                            <Button size="sm" variant="ghost" icon={Eye} onClick={() => setReceipt(b.id)}>
                              Preview
                            </Button>
                            <Button size="sm" variant="soft" icon={Printer} onClick={() => printReceipt(b.id)}>
                              Print
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
          </Card>
        </div>
      </div>

      <PatientFormModal open={editOpen} onClose={() => setEditOpen(false)} patient={patient} />
      {tokenOpen && <IssueTokenModal open onClose={() => setTokenOpen(false)} initialPatientId={patient.id} />}
      <PrescriptionPreviewModal open={!!rxPreview} onClose={() => setRxPreview(null)} visitId={rxPreview?.id} type={rxPreview?.type} />
      <ReceiptPreviewModal open={!!receipt} onClose={() => setReceipt(null)} billId={receipt} />
    </>
  );
}

