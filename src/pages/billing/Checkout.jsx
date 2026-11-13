import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FieldArray, Form, Formik } from 'formik';
import * as Yup from 'yup';
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  CreditCard,
  Info,
  Lock,
  Pill,
  Plus,
  Printer,
  Receipt,
  Trash2,
  Wallet,
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import CategoryTag from '@/components/ui/CategoryTag';
import { PaymentBadge } from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import Switch from '@/components/ui/Switch';
import VisitStepper from '@/components/ui/VisitStepper';
import { CellInput, SelectField, TextField } from '@/components/form/Fields';
import ThermalReceipt from '@/components/print/ThermalReceipt';
import { usePrintReceipt } from '@/components/print/PrintPreviews';
import { BILLING_CATEGORY_IDS, CATEGORIES, PAYMENT_METHODS } from '@/data/constants';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { computeBillTotals, computeConsultationFee, describeRule, medicineChargesForVisit } from '@/utils/billing';
import { cx, formatCurrency, formatDate, formatTime, padToken } from '@/utils/format';
import { optionalNumber, requiredNumber } from '@/utils/validation';

const METHOD_ICONS = { cash: Banknote, card: CreditCard, other: Wallet };

export default function Checkout() {
  const { visitId } = useParams();
  const { state, api, lookup } = useData();
  const { user, can } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const printReceipt = usePrintReceipt();
  const [billId, setBillId] = useState(null);
  const cur = state.settings.fees.currency;
  const fees = state.settings.fees;

  const visit = lookup.visit[visitId];
  const patient = visit && lookup.patient[visit.patientId];
  const doctor = visit && lookup.staff[visit.doctorId];
  const medicines = useMemo(() => (visit ? medicineChargesForVisit(visit, state.medicines) : []), [visit, state.medicines]);
  const canDiscount = can('billing.discount') && fees.allowManualDiscount;

  const schema = useMemo(
    () =>
      Yup.object({
        category: Yup.string().oneOf(BILLING_CATEGORY_IDS).required(),
        additionalCharges: Yup.array().of(
          Yup.object({
            label: Yup.string().trim().required('Description required'),
            amount: requiredNumber('Amount', 'Amount').min(0, 'Min 0'),
          }),
        ),
        discountType: Yup.string().oneOf(['amount', 'percent']),
        discountValue: optionalNumber('Enter a number')
          .min(0, 'Cannot be negative')
          .when('discountType', {
            is: 'percent',
            then: (s) => s.max(fees.maxDiscountPercent, `Max ${fees.maxDiscountPercent}% allowed`),
          }),
        discountReason: Yup.string().when('discountValue', {
          is: (v) => Number(v) > 0,
          then: (s) => s.trim().required('Give a reason for the discount'),
        }),
        paymentMethod: Yup.string().oneOf(['cash', 'card', 'other']).required('Select a payment method'),
        amountPaid: optionalNumber('Enter a valid amount').min(0, 'Cannot be negative'),
        paymentRef: Yup.string().when('paymentMethod', {
          is: (m) => m === 'card' || m === 'other',
          then: (s) => s.trim().required('Transaction / reference no. required'),
        }),
      }),
    [fees.maxDiscountPercent],
  );

  if (!visit || !patient) {
    return (
      <Card>
        <EmptyState icon={Receipt} title="Visit not found" action={<Button to="/billing">Back to billing</Button>} />
      </Card>
    );
  }

  /* ---------- After billing: receipt ---------- */
  const bill = billId ? lookup.bill[billId] : visit.billId ? lookup.bill[visit.billId] : null;
  if (bill) {
    return (
      <>
        <PageHeader
          title="Payment complete"
          subtitle={`${bill.receiptNo} · ${patient.name}`}
          crumbs={[{ label: 'Home', to: '/' }, { label: 'Billing', to: '/billing' }, { label: bill.receiptNo }]}
        />
        <div className="grid grid-main-side">
          <Card>
            <CardBody>
              <div className="complete-hero">
                <span className="complete-hero__icon">
                  <CheckCircle2 size={34} />
                </span>
                <h2>{formatCurrency(bill.amountPaid, cur)} received</h2>
                <p className="muted">
                  {PAYMENT_METHODS.find((m) => m.id === bill.paymentMethod)?.label} · <PaymentBadge status={bill.paymentStatus} />
                </p>
                <div className="mt-16" style={{ width: '100%' }}>
                  <VisitStepper status="completed" hasClinicMeds={visit.clinicRx.items.length > 0} />
                </div>
                <div className="flex gap-8 wrap mt-24" style={{ justifyContent: 'center' }}>
                  <Button size="lg" icon={Printer} onClick={() => printReceipt(bill.id)}>
                    Print Receipt
                  </Button>
                  <Button size="lg" variant="secondary" to={`/visits/${visit.id}`}>
                    View visit record
                  </Button>
                  <Button size="lg" variant="ghost" onClick={() => navigate('/billing')}>
                    Back to billing
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Receipt preview" subtitle="80mm thermal printer" icon={Receipt} />
            <div className="paper-preview paper-preview--thermal" style={{ borderRadius: 0, maxHeight: 'none' }}>
              <div className="paper-preview__sheet paper-preview__sheet--thermal">
                <ThermalReceipt bill={bill} patient={patient} visit={visit} doctor={doctor} cashier={lookup.staff[bill.createdBy]} settings={state.settings} />
              </div>
            </div>
          </Card>
        </div>
      </>
    );
  }

  if (visit.status !== 'billing') {
    return (
      <Card>
        <EmptyState
          icon={Lock}
          title="This visit is not ready for billing"
          text={
            visit.status === 'pharmacy'
              ? 'Clinic medicines must be dispensed (or skipped) before billing.'
              : 'Billing happens at the end of the visit — after consultation and prescriptions.'
          }
          action={<Button to={`/visits/${visit.id}`} variant="secondary">Open visit</Button>}
        />
      </Card>
    );
  }

  const initialFee = computeConsultationFee(visit.category, state.settings);

  return (
    <>
      <PageHeader
        title={`Checkout · Token #${visit.tokenNo}`}
        subtitle="Final billing at the end of the visit"
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Billing', to: '/billing' }, { label: `Token #${visit.tokenNo}` }]}
      />
      <Formik
        initialValues={{
          category: visit.category,
          waiveConsultation: false,
          additionalCharges: [],
          discountType: 'amount',
          discountValue: 0,
          discountReason: '',
          paymentMethod: 'cash',
          amountPaid: '',
          paymentRef: '',
        }}
        validationSchema={schema}
        onSubmit={(values) => {
          const fee = computeConsultationFee(values.category, state.settings);
          const totals = computeBillTotals({
            consultationBase: fee.base,
            categoryWaiver: values.waiveConsultation ? fee.base : fee.waived,
            medicines,
            additionalCharges: values.additionalCharges,
            discountType: values.discountType,
            discountValue: canDiscount ? values.discountValue : 0,
          });
          const paid = values.amountPaid === '' ? totals.total : Number(values.amountPaid);
          const created = api.createBill(
            visit.id,
            {
              ...values,
              discountValue: canDiscount ? values.discountValue : 0,
              medicines,
              amountPaid: paid,
            },
            user.id,
          );
          toast.success('Bill completed', `${created.receiptNo} · ${formatCurrency(created.amountPaid, cur)} received`);
          setBillId(created.id);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      >
        {({ values, setFieldValue, errors, touched }) => {
          const fee = computeConsultationFee(values.category, state.settings);
          const categoryWaiver = values.waiveConsultation ? fee.base : fee.waived;
          const preview = computeBillTotals({
            consultationBase: fee.base,
            categoryWaiver,
            medicines,
            additionalCharges: values.additionalCharges,
            discountType: values.discountType,
            discountValue: canDiscount ? values.discountValue : 0,
          });
          const paidNum = values.amountPaid === '' ? preview.total : Number(values.amountPaid) || 0;
          const totals = computeBillTotals({
            consultationBase: fee.base,
            categoryWaiver,
            medicines,
            additionalCharges: values.additionalCharges,
            discountType: values.discountType,
            discountValue: canDiscount ? values.discountValue : 0,
            amountPaid: paidNum,
          });

          return (
            <Form noValidate>
              <div className="grid grid-main-side">
                <div style={{ display: 'grid', gap: 18, minWidth: 0 }}>
                  {/* Patient */}
                  <Card>
                    <div className="dispense-head">
                      <span className="token-chip token-chip--lg">{padToken(visit.tokenNo)}</span>
                      <Avatar name={patient.name} size="lg" />
                      <div className="grow" style={{ minWidth: 0 }}>
                        <div className="fw-700" style={{ fontSize: 17 }}>{patient.name}</div>
                        <div className="text-sm muted">
                          <span className="mono">{patient.id}</span> · Visit {formatDate(visit.date)} {formatTime(visit.registeredAt)} · {doctor?.name}
                        </div>
                        <div className="text-sm mt-4">{visit.consultation?.diagnosis}</div>
                      </div>
                      <CategoryTag id={values.category} size="lg" />
                    </div>
                  </Card>

                  {/* Consultation */}
                  <Card>
                    <CardHeader title="Consultation fee" subtitle="Calculated from the patient category" />
                    <CardBody>
                      <div className="form-grid">
                        <SelectField
                          name="category"
                          label="Patient category"
                          options={BILLING_CATEGORY_IDS.map((id) => ({ value: id, label: CATEGORIES[id].label }))}
                          hint={describeRule(fee.rule, fee.base, cur)}
                        />
                        <div className="fee-box">
                          <div className="kv-row">
                            <span>Standard fee</span>
                            <span>{formatCurrency(fee.base, cur)}</span>
                          </div>
                          <div className="kv-row">
                            <span>{values.waiveConsultation ? 'Fully waived' : `${CATEGORIES[values.category]?.short} waiver`}</span>
                            <span className="text-green">- {formatCurrency(categoryWaiver, cur)}</span>
                          </div>
                          <div className="kv-row fw-700">
                            <span>Consultation payable</span>
                            <span>{formatCurrency(fee.base - categoryWaiver, cur)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-12">
                        <Switch
                          checked={values.waiveConsultation}
                          disabled={!canDiscount}
                          onChange={(v) => setFieldValue('waiveConsultation', v)}
                          label="Waive consultation fee completely (free / no-charge)"
                        />
                        {!canDiscount && <div className="field__hint mt-4">Requires the “Apply manual discounts” permission.</div>}
                      </div>
                      {visit.category !== values.category && (
                        <div className="callout callout--warning mt-12">
                          <AlertTriangle size={16} />
                          <span>
                            Category changed from <strong>{CATEGORIES[visit.category].label}</strong> (set at registration/consultation). Initial fee was{' '}
                            {formatCurrency(initialFee.fee, cur)}.
                          </span>
                        </div>
                      )}
                    </CardBody>
                  </Card>

                  {/* Medicines */}
                  <Card>
                    <CardHeader title="Clinic medicine charges" subtitle="Only medicines actually dispensed / administered" icon={Pill} />
                    {medicines.length === 0 ? (
                      <div className="rx-empty">No clinic medicines were dispensed for this visit.</div>
                    ) : (
                      <div className="table-wrap">
                        <table className="table table--compact">
                          <thead>
                            <tr>
                              <th>Medicine</th>
                              <th className="num">Qty</th>
                              <th className="num">Unit price</th>
                              <th className="num">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {medicines.map((m) => (
                              <tr key={m.medicineId}>
                                <td className="fw-600">{m.name}</td>
                                <td className="num">
                                  {m.qty} <span className="muted text-xs">{m.unit}</span>
                                </td>
                                <td className="num">{formatCurrency(m.unitPrice, cur)}</td>
                                <td className="num fw-600">{formatCurrency(m.total, cur)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colSpan={3}>Medicine charges</td>
                              <td className="num">{formatCurrency(totals.medicineCharges, cur)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </Card>

                  {/* Additional charges */}
                  <Card>
                    <CardHeader title="Additional charges" subtitle="Procedures, dressing, tests, etc." />
                    <FieldArray name="additionalCharges">
                      {({ push, remove }) => (
                        <CardBody>
                          {values.additionalCharges.map((c, i) => (
                            <div key={i} className="charge-row">
                              <CellInput name={`additionalCharges.${i}.label`} placeholder="Description e.g. Dressing charges" list="charge-list" />
                              <CellInput name={`additionalCharges.${i}.amount`} type="number" min={0} placeholder="Amount" style={{ maxWidth: 140 }} />
                              <button type="button" className="icon-btn icon-btn--plain" onClick={() => remove(i)} aria-label="Remove charge">
                                <Trash2 size={15} />
                              </button>
                            </div>
                          ))}
                          <datalist id="charge-list">
                            {['Dressing charges', 'Nebulization charges', 'Injection charges', 'BP & sugar check', 'ECG', 'Drip / IV set charges', 'Stitches'].map((x) => (
                              <option key={x} value={x} />
                            ))}
                          </datalist>
                          <Button size="sm" variant="soft" icon={Plus} onClick={() => push({ label: '', amount: '' })}>
                            Add charge
                          </Button>
                        </CardBody>
                      )}
                    </FieldArray>
                  </Card>

                  {/* Discount */}
                  <Card>
                    <CardHeader
                      title="Discount"
                      subtitle={canDiscount ? `Up to ${fees.maxDiscountPercent}% allowed` : 'You do not have permission to apply manual discounts'}
                      actions={!canDiscount && <span className="badge badge--gray"><Lock size={12} /> Locked</span>}
                    />
                    <CardBody>
                      <div className="form-grid form-grid--3">
                        <div className="field">
                          <span className="field__label">Discount type</span>
                          <div className="segmented" style={{ alignSelf: 'flex-start' }}>
                            {[
                              ['amount', `Amount (${cur})`],
                              ['percent', 'Percent (%)'],
                            ].map(([id, l]) => (
                              <button key={id} type="button" disabled={!canDiscount} className={cx(values.discountType === id && 'is-active')} onClick={() => setFieldValue('discountType', id)}>
                                {l}
                              </button>
                            ))}
                          </div>
                        </div>
                        <TextField name="discountValue" type="number" min={0} label="Discount value" disabled={!canDiscount} />
                        <TextField name="discountReason" label="Reason" placeholder="e.g. Senior citizen" disabled={!canDiscount} />
                      </div>
                    </CardBody>
                  </Card>

                  {/* Payment */}
                  <Card>
                    <CardHeader title="Payment" />
                    <CardBody>
                      <div className="method-grid">
                        {PAYMENT_METHODS.map((m) => {
                          const Icon = METHOD_ICONS[m.id];
                          return (
                            <button key={m.id} type="button" className={cx('method-card', values.paymentMethod === m.id && 'is-selected')} onClick={() => setFieldValue('paymentMethod', m.id)}>
                              <Icon size={22} />
                              <span>{m.label}</span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="form-grid mt-16">
                        <TextField
                          name="amountPaid"
                          type="number"
                          min={0}
                          label={values.paymentMethod === 'cash' ? 'Cash received' : 'Amount received'}
                          prefix={cur}
                          placeholder={String(preview.total)}
                          hint={`Leave empty to receive the full ${formatCurrency(preview.total, cur)}`}
                        />
                        {values.paymentMethod !== 'cash' && (
                          <TextField name="paymentRef" label={values.paymentMethod === 'card' ? 'Card transaction no.' : 'Reference (bank / wallet)'} required placeholder="e.g. TXN-458812" />
                        )}
                      </div>
                      {values.paymentMethod === 'cash' && preview.total > 0 && (
                        <div className="flex gap-4 wrap mt-8">
                          {[preview.total, Math.ceil(preview.total / 500) * 500, Math.ceil(preview.total / 1000) * 1000, 5000]
                            .filter((v, i, a) => v >= preview.total && a.indexOf(v) === i)
                            .map((v) => (
                              <button key={v} type="button" className="chip-btn" onClick={() => setFieldValue('amountPaid', v)}>
                                {formatCurrency(v, cur)}
                              </button>
                            ))}
                        </div>
                      )}
                    </CardBody>
                  </Card>
                </div>

                {/* Summary */}
                <div className="sticky-side">
                  <Card className="bill-summary">
                    <CardHeader title="Bill summary" subtitle={`Token #${visit.tokenNo} · ${patient.name}`} icon={Receipt} />
                    <CardBody>
                      <div className="kv-row">
                        <span>Consultation fee</span>
                        <span>{formatCurrency(fee.base, cur)}</span>
                      </div>
                      <div className="kv-row">
                        <span>Medicine charges</span>
                        <span>{formatCurrency(totals.medicineCharges, cur)}</span>
                      </div>
                      <div className="kv-row">
                        <span>Additional charges</span>
                        <span>{formatCurrency(totals.additionalTotal, cur)}</span>
                      </div>
                      <div className="kv-row fw-700">
                        <span>Subtotal</span>
                        <span>{formatCurrency(totals.subtotal, cur)}</span>
                      </div>
                      <div className="kv-row">
                        <span>
                          Free / waived <CategoryTag id={values.category} size="sm" short />
                        </span>
                        <span className="text-green">- {formatCurrency(categoryWaiver, cur)}</span>
                      </div>
                      <div className="kv-row">
                        <span>Manual discount</span>
                        <span className="text-green">- {formatCurrency(totals.manualDiscount, cur)}</span>
                      </div>
                      <div className="kv-row">
                        <span>Total discount</span>
                        <span className="text-green">- {formatCurrency(totals.totalDiscount, cur)}</span>
                      </div>
                      <div className="kv-row kv-row--total">
                        <span>Final payable</span>
                        <span>{formatCurrency(totals.total, cur)}</span>
                      </div>
                      <div className="kv-row">
                        <span>Amount received</span>
                        <span>{formatCurrency(paidNum, cur)}</span>
                      </div>
                      {totals.change > 0 && (
                        <div className="kv-row">
                          <span>Change to return</span>
                          <span className="fw-700">{formatCurrency(totals.change, cur)}</span>
                        </div>
                      )}
                      {totals.balance > 0 && (
                        <div className="kv-row">
                          <span>Balance due</span>
                          <span className="text-red fw-700">{formatCurrency(totals.balance, cur)}</span>
                        </div>
                      )}
                      <div className="kv-row">
                        <span>Payment status</span>
                        <span>
                          <PaymentBadge status={totals.paymentStatus} />
                        </span>
                      </div>
                      {totals.balance > 0 && (
                        <div className="callout callout--warning mt-12">
                          <AlertTriangle size={16} />
                          <span>The bill will be saved as {totals.paymentStatus === 'unpaid' ? 'unpaid' : 'partially paid'} and appear under pending bills.</span>
                        </div>
                      )}
                      {Object.keys(errors).length > 0 && Object.keys(touched).length > 0 && (
                        <div className="callout callout--danger mt-12">
                          <Info size={16} />
                          <span>Please fix the highlighted fields before completing the bill.</span>
                        </div>
                      )}
                      <Button type="submit" size="lg" block icon={CheckCircle2} className="mt-16">
                        Complete billing · {formatCurrency(totals.total, cur)}
                      </Button>
                      <p className="text-xs muted mt-8 text-center">A thermal receipt preview opens after billing.</p>
                    </CardBody>
                  </Card>
                </div>
              </div>
            </Form>
          );
        }}
      </Formik>
    </>
  );
}
