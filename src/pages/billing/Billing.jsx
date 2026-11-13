import { useMemo, useState } from 'react';
import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { ArrowRight, Banknote, Download, Eye, HandCoins, Printer, Receipt, ReceiptText, Wallet } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Tabs from '@/components/ui/Tabs';
import SearchInput from '@/components/ui/SearchInput';
import StatCard from '@/components/ui/StatCard';
import Modal from '@/components/ui/Modal';
import { Person } from '@/components/ui/Avatar';
import CategoryTag from '@/components/ui/CategoryTag';
import { PaymentBadge } from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import Pagination, { usePagination } from '@/components/ui/Pagination';
import { SelectField, TextField } from '@/components/form/Fields';
import { ReceiptPreviewModal, usePrintReceipt } from '@/components/print/PrintPreviews';
import { CATEGORIES, PAYMENT_METHODS } from '@/data/constants';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { medicineChargesForVisit, computeConsultationFee } from '@/utils/billing';
import { addDays, dateKey, downloadFile, formatCurrency, formatDate, formatTime, padToken, toCSV } from '@/utils/format';
import { requiredNumber } from '@/utils/validation';

function CollectPaymentModal({ bill, onClose }) {
  const { state, api, lookup } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const cur = state.settings.fees.currency;
  if (!bill) return null;
  return (
    <Modal open onClose={onClose} size="sm" title="Collect pending payment" subtitle={`${bill.receiptNo} · ${lookup.patient[bill.patientId]?.name}`}>
      <Formik
        initialValues={{ amount: bill.balance, method: bill.paymentMethod || 'cash' }}
        validationSchema={Yup.object({
          amount: requiredNumber('Enter an amount').min(1, 'Minimum 1').max(bill.balance, `Balance is ${bill.balance}`),
          method: Yup.string().required(),
        })}
        onSubmit={(v) => {
          api.recordPayment(bill.id, v, user.id);
          toast.success('Payment recorded', `${formatCurrency(v.amount, cur)} collected on ${bill.receiptNo}`);
          onClose();
        }}
      >
        <Form noValidate>
          <div className="kv-row">
            <span>Bill total</span>
            <span>{formatCurrency(bill.total, cur)}</span>
          </div>
          <div className="kv-row">
            <span>Already paid</span>
            <span>{formatCurrency(bill.amountPaid, cur)}</span>
          </div>
          <div className="kv-row kv-row--total">
            <span>Balance due</span>
            <span>{formatCurrency(bill.balance, cur)}</span>
          </div>
          <div className="form-grid mt-16">
            <TextField name="amount" type="number" label="Amount" prefix={cur} />
            <SelectField name="method" label="Method" options={PAYMENT_METHODS.map((m) => ({ value: m.id, label: m.label }))} />
          </div>
          <div className="modal__footer" style={{ margin: '20px -22px -20px' }}>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" icon={HandCoins}>
              Record payment
            </Button>
          </div>
        </Form>
      </Formik>
    </Modal>
  );
}

export default function Billing() {
  const { state, lookup, today } = useData();
  const { can } = useAuth();
  const printReceipt = usePrintReceipt();
  const cur = state.settings.fees.currency;
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [period, setPeriod] = useState('7');
  const [method, setMethod] = useState('');
  const [preview, setPreview] = useState(null);
  const [collect, setCollect] = useState(null);

  const awaiting = state.visits.filter((v) => v.status === 'billing').sort((a, b) => a.tokenNo - b.tokenNo);
  const atPharmacy = state.visits.filter((v) => v.status === 'pharmacy').length;

  const from = period === 'all' ? '0000-00-00' : period === 'today' ? today : dateKey(addDays(new Date(), -(Number(period) - 1)));
  const bills = useMemo(
    () =>
      state.bills
        .filter((b) => {
          const k = dateKey(b.createdAt);
          if (k < from) return false;
          if (tab !== 'all' && b.paymentStatus !== tab) return false;
          if (method && b.paymentMethod !== method) return false;
          if (q) {
            const p = lookup.patient[b.patientId];
            const t = q.toLowerCase();
            if (!(b.receiptNo.toLowerCase().includes(t) || p?.name.toLowerCase().includes(t) || p?.id.toLowerCase().includes(t))) return false;
          }
          return true;
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.bills, from, tab, method, q, lookup],
  );
  const pg = usePagination(bills, 12, `${tab}|${q}|${period}|${method}`);

  const todayBills = state.bills.filter((b) => dateKey(b.createdAt) === today);
  const collectedToday = todayBills.reduce((a, b) => a + b.amountPaid, 0);
  const pending = state.bills.filter((b) => b.balance > 0);
  const pendingAmount = pending.reduce((a, b) => a + b.balance, 0);
  const waivedToday = todayBills.reduce((a, b) => a + b.totalDiscount, 0);

  const counts = {
    all: state.bills.filter((b) => dateKey(b.createdAt) >= from).length,
    paid: state.bills.filter((b) => dateKey(b.createdAt) >= from && b.paymentStatus === 'paid').length,
    partial: state.bills.filter((b) => dateKey(b.createdAt) >= from && b.paymentStatus === 'partial').length,
    unpaid: state.bills.filter((b) => dateKey(b.createdAt) >= from && b.paymentStatus === 'unpaid').length,
  };

  const exportCSV = () => {
    const csv = toCSV(bills, [
      { label: 'Receipt', value: (b) => b.receiptNo },
      { label: 'Date', value: (b) => formatDate(b.createdAt) },
      { label: 'Patient ID', value: (b) => b.patientId },
      { label: 'Patient', value: (b) => lookup.patient[b.patientId]?.name },
      { label: 'Token', value: (b) => b.tokenNo },
      { label: 'Category', value: (b) => CATEGORIES[b.category]?.label },
      { label: 'Consultation', value: (b) => b.consultationFee },
      { label: 'Medicines', value: (b) => b.medicineCharges },
      { label: 'Additional', value: (b) => b.additionalTotal },
      { label: 'Discount', value: (b) => b.totalDiscount },
      { label: 'Total', value: (b) => b.total },
      { label: 'Paid', value: (b) => b.amountPaid },
      { label: 'Method', value: (b) => b.paymentMethod },
      { label: 'Status', value: (b) => b.paymentStatus },
    ]);
    downloadFile(`zaib-clinic-bills-${today}.csv`, csv);
  };

  return (
    <>
      <PageHeader
        title="Billing"
        subtitle="Billing is completed at the END of each visit — after consultation, prescriptions and dispensing."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Billing' }]}
        actions={
          <Button variant="secondary" icon={Download} onClick={exportCSV}>
            Export
          </Button>
        }
      />

      <div className="grid grid-4 mb-16">
        <StatCard label="Collected today" value={formatCurrency(collectedToday, cur)} icon={Banknote} tone="green" foot={<span>{todayBills.length} bills</span>} />
        <StatCard label="Awaiting checkout" value={awaiting.length} icon={ReceiptText} tone="pink" foot={<span>{atPharmacy} still at dispensing</span>} />
        <StatCard label="Pending balance" value={formatCurrency(pendingAmount, cur)} icon={Wallet} tone="red" foot={<span>{pending.length} unpaid / partial bills</span>} />
        <StatCard label="Waived & discounts today" value={formatCurrency(waivedToday, cur)} icon={HandCoins} tone="violet" foot={<span>free, follow-up & discounts</span>} />
      </div>

      {/* Awaiting checkout */}
      <Card className="mb-16">
        <CardHeader title="Ready for billing" subtitle="Consultation done · clinic medicines dispensed" icon={Receipt} actions={<span className="badge badge--pink">{awaiting.length} waiting</span>} />
        {awaiting.length === 0 ? (
          <EmptyState icon={Receipt} title="No patients at the billing desk" text="Patients appear here after consultation and dispensing." />
        ) : (
          <div className="checkout-grid">
            {awaiting.map((v) => {
              const p = lookup.patient[v.patientId];
              const fee = computeConsultationFee(v.category, state.settings);
              const meds = medicineChargesForVisit(v, state.medicines).reduce((a, m) => a + m.total, 0);
              return (
                <div key={v.id} className="checkout-card">
                  <div className="flex items-center gap-8">
                    <span className="token-chip token-chip--sm">{padToken(v.tokenNo)}</span>
                    <strong className="grow truncate">{p?.name}</strong>
                    <CategoryTag id={v.category} size="sm" short />
                  </div>
                  <div className="text-xs muted mt-4">
                    {p?.id} · {formatDate(v.date)} · {lookup.staff[v.doctorId]?.name}
                  </div>
                  <div className="checkout-card__amount">
                    <span>Estimated</span>
                    <strong>{formatCurrency(fee.fee + meds, cur)}</strong>
                  </div>
                  {can('billing.create') && (
                    <Button size="sm" block variant="gold" iconRight={ArrowRight} to={`/billing/checkout/${v.id}`}>
                      Checkout
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'all', label: 'All bills', count: counts.all },
            { id: 'paid', label: 'Paid', count: counts.paid },
            { id: 'partial', label: 'Partially paid', count: counts.partial },
            { id: 'unpaid', label: 'Unpaid', count: counts.unpaid },
          ]}
        />
        <div className="table-toolbar">
          <SearchInput value={q} onChange={setQ} placeholder="Receipt no., patient or ID" />
          <select className="select select--sm" style={{ width: 'auto' }} value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Period">
            <option value="today">Today</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All time</option>
          </select>
          <select className="select select--sm" style={{ width: 'auto' }} value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Payment method">
            <option value="">All methods</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        {bills.length === 0 ? (
          <EmptyState icon={Receipt} title="No bills found" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Patient</th>
                  <th>Date</th>
                  <th>Category</th>
                  <th className="num">Total</th>
                  <th className="num">Discount</th>
                  <th className="num">Paid</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pg.pageItems.map((b) => {
                  const p = lookup.patient[b.patientId];
                  return (
                    <tr key={b.id}>
                      <td className="mono nowrap">
                        {b.receiptNo}
                        <div className="text-xs muted">Token #{b.tokenNo}</div>
                      </td>
                      <td>
                        <Person name={p?.name} meta={p?.id} />
                      </td>
                      <td className="nowrap">
                        {formatDate(b.createdAt)}
                        <div className="text-xs muted">{formatTime(b.createdAt)}</div>
                      </td>
                      <td>
                        <CategoryTag id={b.category} short />
                      </td>
                      <td className="num fw-700">{formatCurrency(b.total, cur)}</td>
                      <td className="num text-green">{b.totalDiscount ? `- ${formatCurrency(b.totalDiscount, cur)}` : '—'}</td>
                      <td className="num">{formatCurrency(b.amountPaid, cur)}</td>
                      <td className="nowrap text-sm">{PAYMENT_METHODS.find((m) => m.id === b.paymentMethod)?.label.split(' ')[0]}</td>
                      <td>
                        <PaymentBadge status={b.paymentStatus} />
                      </td>
                      <td className="text-right nowrap">
                        <div className="flex gap-4" style={{ justifyContent: 'flex-end' }}>
                          {b.balance > 0 && can('billing.create') && (
                            <Button size="sm" variant="gold" icon={HandCoins} onClick={() => setCollect(b)}>
                              Collect
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" iconOnly icon={Eye} onClick={() => setPreview(b.id)} aria-label="Preview receipt" title="Preview receipt" />
                          <Button size="sm" variant="ghost" iconOnly icon={Printer} onClick={() => printReceipt(b.id)} aria-label="Print receipt" title="Print receipt" />
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

      <ReceiptPreviewModal open={!!preview} onClose={() => setPreview(null)} billId={preview} />
      <CollectPaymentModal bill={collect} onClose={() => setCollect(null)} />
    </>
  );
}
