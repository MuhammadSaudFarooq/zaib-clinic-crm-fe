import { useMemo, useState } from 'react';
import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { AlertTriangle, ArrowRight, CheckCircle2, Info, PackageMinus, Pill, Printer, SkipForward, Syringe } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import CategoryTag from '@/components/ui/CategoryTag';
import EmptyState from '@/components/ui/EmptyState';
import StatCard from '@/components/ui/StatCard';
import { usePrintPrescription } from '@/components/print/PrintPreviews';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { cx, dateKey, formatCurrency, formatDate, formatTime, padToken } from '@/utils/format';
import { optionalNumber } from '@/utils/validation';

function DispenseForm({ visit, onDone }) {
  const { state, api, lookup } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const printRx = usePrintPrescription();
  const cur = state.settings.fees.currency;
  const patient = lookup.patient[visit.patientId];

  const items = visit.clinicRx.items;
  const schema = Yup.object({
    rows: Yup.array().of(
      Yup.object({
        give: Yup.boolean(),
        qty: optionalNumber('Enter a number')
          .when('give', {
            is: true,
            then: (s) =>
              s
                .integer('Whole units only')
                .min(1, 'At least 1')
                .test('stock', 'Exceeds available stock', function check(v) {
                  const med = lookup.medicine[this.parent.medicineId];
                  return !med || v <= med.currentStock;
                }),
          }),
      }),
    ),
  });

  return (
    <Formik
      enableReinitialize
      initialValues={{
        rows: items.map((i) => ({
          itemId: i.id,
          medicineId: i.medicineId,
          give: (lookup.medicine[i.medicineId]?.currentStock || 0) > 0,
          qty: Math.min(i.quantity, Math.max(0, lookup.medicine[i.medicineId]?.currentStock || 0)) || i.quantity,
        })),
      }}
      validationSchema={schema}
      onSubmit={(values) => {
        const res = api.dispense(visit.id, values.rows.map((r) => ({ itemId: r.itemId, give: r.give, qty: Number(r.qty) })), user.id);
        if (!res.ok) {
          toast.error('Could not dispense', res.error);
          return;
        }
        toast.success(
          res.count ? `${res.count} medicine(s) dispensed` : 'Sent to billing',
          `Token #${visit.tokenNo} · ${patient?.name} is now at the billing desk. Inventory updated.`,
        );
        onDone();
      }}
    >
      {({ values, setFieldValue, errors, submitForm }) => {
        const total = values.rows.reduce((a, r) => {
          const med = lookup.medicine[r.medicineId];
          return a + (r.give ? (Number(r.qty) || 0) * (med?.sellingPrice || 0) : 0);
        }, 0);
        const giving = values.rows.filter((r) => r.give).length;
        return (
          <Form noValidate>
            <Card>
              <div className="dispense-head">
                <span className="token-chip token-chip--lg">{padToken(visit.tokenNo)}</span>
                <Avatar name={patient?.name} size="lg" />
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="fw-700" style={{ fontSize: 17 }}>{patient?.name}</div>
                  <div className="text-sm muted">
                    {patient?.id} · {patient?.age} yrs · {lookup.staff[visit.doctorId]?.name} · consulted {formatTime(visit.consultation?.completedAt)}
                  </div>
                  <div className="tag-list mt-8">
                    <CategoryTag id={visit.category} />
                    <CategoryTag id={visit.session} />
                  </div>
                </div>
                <Button variant="secondary" size="sm" icon={Printer} onClick={() => printRx(visit.id, 'clinic')}>
                  Clinic Rx
                </Button>
              </div>
              <div className="callout callout--info" style={{ margin: '0 20px 16px' }}>
                <Info size={16} />
                <span>
                  Tick each medicine that is actually given or administered. <strong>Stock is deducted only for ticked items</strong>; un-ticked items are not
                  charged.
                </span>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 44 }}>Give</th>
                      <th>Medicine</th>
                      <th>Dosage / instructions</th>
                      <th className="num">Prescribed</th>
                      <th style={{ width: 110 }}>Dispense qty</th>
                      <th className="num">In stock</th>
                      <th className="num">After</th>
                      <th className="num">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => {
                      const med = lookup.medicine[item.medicineId];
                      const row = values.rows[i];
                      const err = errors.rows?.[i]?.qty;
                      const after = (med?.currentStock || 0) - (row.give ? Number(row.qty) || 0 : 0);
                      return (
                        <tr key={item.id} className={cx(!row.give && 'row-muted')}>
                          <td>
                            <input
                              type="checkbox"
                              className="big-check"
                              checked={row.give}
                              onChange={(e) => setFieldValue(`rows.${i}.give`, e.target.checked)}
                              aria-label={`Give ${item.name}`}
                            />
                          </td>
                          <td>
                            <div className="fw-600">{item.name}</div>
                            <div className="text-xs muted">
                              {med?.unit} · Batch {med?.batchNo} · Exp {formatDate(med?.expiryDate)}
                            </div>
                          </td>
                          <td className="text-sm">
                            {item.dosage}
                            <div className="text-xs muted">{item.instructions}</div>
                          </td>
                          <td className="num">{item.quantity}</td>
                          <td>
                            <input
                              className={cx('input input--sm', err && 'has-error')}
                              type="number"
                              min={1}
                              disabled={!row.give}
                              value={row.qty}
                              onChange={(e) => setFieldValue(`rows.${i}.qty`, e.target.value)}
                            />
                            {err && row.give && <div className="field__error mt-4">{err}</div>}
                          </td>
                          <td className={cx('num', (med?.currentStock || 0) <= (med?.minStock || 0) && 'text-amber fw-600')}>{med?.currentStock}</td>
                          <td className={cx('num', after < 0 && 'text-red')}>{after}</td>
                          <td className="num fw-600">{row.give ? formatCurrency((Number(row.qty) || 0) * (med?.sellingPrice || 0), cur) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={7}>Medicine charges added to the bill ({giving} item{giving === 1 ? '' : 's'})</td>
                      <td className="num">{formatCurrency(total, cur)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {visit.clinicRx.notes && (
                <CardBody>
                  <div className="callout callout--brand">
                    <Pill size={16} />
                    <span>{visit.clinicRx.notes}</span>
                  </div>
                </CardBody>
              )}
              <div className="card__footer">
                <Button
                  variant="secondary"
                  icon={SkipForward}
                  onClick={() => {
                    values.rows.forEach((_, i) => setFieldValue(`rows.${i}.give`, false));
                    setTimeout(submitForm, 0);
                  }}
                >
                  None given — send to billing
                </Button>
                <Button type="submit" icon={CheckCircle2} iconRight={ArrowRight}>
                  Dispense & send to billing
                </Button>
              </div>
            </Card>
          </Form>
        );
      }}
    </Formik>
  );
}

export default function Pharmacy() {
  const { state, lookup, today } = useData();
  const [selectedId, setSelectedId] = useState(null);

  const pending = useMemo(
    () => state.visits.filter((v) => v.status === 'pharmacy').sort((a, b) => (a.consultation?.completedAt || '').localeCompare(b.consultation?.completedAt || '')),
    [state.visits],
  );
  const selected = pending.find((v) => v.id === selectedId) || pending[0];

  const todayMoves = useMemo(
    () =>
      state.movements
        .filter((m) => m.type === 'out' && m.reason === 'dispensed' && dateKey(m.date) === today)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [state.movements, today],
  );
  const unitsToday = todayMoves.reduce((a, m) => a + m.quantity, 0);
  const lowStock = state.medicines.filter((m) => m.currentStock <= m.minStock).length;

  return (
    <>
      <PageHeader
        title="Medicine Dispensing"
        subtitle="Dispense or administer Clinic Prescription medicines. Inventory is deducted only here."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Dispensing' }]}
      />

      <div className="grid grid-4 mb-16">
        <StatCard label="Awaiting dispensing" value={pending.length} icon={Syringe} tone="violet" />
        <StatCard label="Dispense entries today" value={todayMoves.length} icon={PackageMinus} tone="brand" />
        <StatCard label="Units dispensed today" value={unitsToday} icon={Pill} tone="gold" />
        <StatCard label="Low-stock items" value={lowStock} icon={AlertTriangle} tone="red" to="/inventory?tab=low" />
      </div>

      <div className="grid grid-side-main">
        <Card>
          <CardHeader title="Pending patients" subtitle="Consulted — clinic medicines not yet given" />
          {pending.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="All caught up" text="No patients are waiting for clinic medicines." />
          ) : (
            <div className="list">
              {pending.map((v) => {
                const p = lookup.patient[v.patientId];
                return (
                  <button key={v.id} type="button" className={cx('list__item list__item--btn', selected?.id === v.id && 'is-active')} onClick={() => setSelectedId(v.id)}>
                    <span className="token-chip token-chip--sm">{padToken(v.tokenNo)}</span>
                    <span className="grow" style={{ minWidth: 0, textAlign: 'left' }}>
                      <span className="fw-600 truncate" style={{ display: 'block' }}>{p?.name}</span>
                      <span className="text-xs muted">
                        {v.clinicRx.items.length} item(s) · {formatTime(v.consultation?.completedAt)}
                      </span>
                    </span>
                    <CategoryTag id={v.category} size="sm" short />
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        <div style={{ minWidth: 0 }}>
          {selected ? (
            <DispenseForm key={selected.id} visit={selected} onDone={() => setSelectedId(null)} />
          ) : (
            <Card>
              <EmptyState icon={Syringe} title="Select a patient" text="Patients appear here after the doctor completes a Clinic Prescription." />
            </Card>
          )}

          <Card className="mt-16">
            <CardHeader title="Dispensed today" subtitle="Stock-out records created by dispensing" icon={PackageMinus} />
            {todayMoves.length === 0 ? (
              <EmptyState icon={PackageMinus} title="Nothing dispensed yet today" />
            ) : (
              <div className="table-wrap">
                <table className="table table--compact">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Medicine</th>
                      <th>Reference</th>
                      <th className="num">Qty</th>
                      <th className="num">Balance</th>
                      <th>By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayMoves.slice(0, 15).map((m) => (
                      <tr key={m.id}>
                        <td className="nowrap muted">{formatTime(m.date)}</td>
                        <td className="fw-600">{lookup.medicine[m.medicineId]?.name}</td>
                        <td className="text-sm">{m.reference}</td>
                        <td className="num text-red fw-600">-{m.quantity}</td>
                        <td className="num">{m.balanceAfter}</td>
                        <td className="nowrap text-sm">{lookup.staff[m.by]?.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
