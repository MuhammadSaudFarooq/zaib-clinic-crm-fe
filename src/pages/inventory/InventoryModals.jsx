import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { PackageMinus, PackagePlus, Save } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { SelectField, TextAreaField, TextField } from '@/components/form/Fields';
import { MEDICINE_CATEGORIES, MEDICINE_UNITS, STOCK_REASONS, SUPPLIERS } from '@/data/constants';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { formatCurrency, todayKey } from '@/utils/format';
import { optionalNumber, requiredNumber } from '@/utils/validation';

const footerStyle = { margin: '20px -22px -20px' };

/* ---------------- Add / edit medicine ---------------- */
const medicineSchema = (isEdit) =>
  Yup.object({
    name: Yup.string().trim().min(2, 'Too short').required('Medicine name is required'),
    genericName: Yup.string().trim(),
    category: Yup.string().required('Select a category'),
    unit: Yup.string().required('Select a unit'),
    currentStock: isEdit ? Yup.mixed() : requiredNumber('Opening stock is required').integer('Whole units').min(0, 'Cannot be negative'),
    minStock: requiredNumber('Minimum level is required').integer('Whole units').min(0, 'Cannot be negative'),
    purchasePrice: requiredNumber('Purchase price is required', 'Enter a price').min(0, 'Cannot be negative'),
    sellingPrice: optionalNumber('Enter a price')
      .min(0, 'Cannot be negative')
      .test('gte', 'Selling price is below purchase price', function check(v) {
        return !v || v >= Number(this.parent.purchasePrice || 0);
      }),
    supplier: Yup.string().required('Select a supplier'),
    batchNo: Yup.string().trim().required('Batch number is required'),
    expiryDate: Yup.date().typeError('Select a date').required('Expiry date is required'),
    entryDate: Yup.date().typeError('Select a date').required('Entry date is required'),
  });

export function MedicineFormModal({ open, onClose, medicine }) {
  const { api } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const isEdit = !!medicine;
  if (!open) return null;

  return (
    <Modal open onClose={onClose} size="lg" title={isEdit ? 'Edit medicine' : 'Add new medicine'} subtitle={isEdit ? `${medicine.id} · stock changes only through stock-in / adjustments` : 'Opening stock is recorded as a stock-in entry.'}>
      <Formik
        initialValues={
          isEdit
            ? { ...medicine }
            : {
                name: '',
                genericName: '',
                category: '',
                unit: '',
                currentStock: '',
                minStock: '',
                purchasePrice: '',
                sellingPrice: '',
                supplier: '',
                batchNo: '',
                expiryDate: '',
                entryDate: todayKey(),
                notes: '',
              }
        }
        validationSchema={medicineSchema(isEdit)}
        onSubmit={(values) => {
          if (isEdit) {
            api.updateMedicine(medicine.id, values, user.id);
            toast.success('Medicine updated', values.name);
          } else {
            const m = api.addMedicine(values, user.id);
            toast.success('Medicine added', `${m.name} · ${m.id}`);
          }
          onClose();
        }}
      >
        <Form noValidate>
          <div className="form-grid">
            <TextField name="name" label="Medicine name" required placeholder="e.g. Panadol 500mg" autoFocus />
            <TextField name="genericName" label="Generic name" placeholder="e.g. Paracetamol" />
            <SelectField name="category" label="Category" required placeholder="Select category" options={MEDICINE_CATEGORIES} />
            <SelectField name="unit" label="Unit" required placeholder="Select unit" options={MEDICINE_UNITS} />
            {!isEdit && <TextField name="currentStock" type="number" min={0} label="Opening stock" required placeholder="0" />}
            <TextField name="minStock" type="number" min={0} label="Minimum stock level" required placeholder="Alert below…" />
            <TextField name="purchasePrice" type="number" min={0} label="Purchase price (per unit)" required prefix="Rs." />
            <TextField name="sellingPrice" type="number" min={0} label="Selling price (per unit)" prefix="Rs." hint="Charged on the bill when dispensed" />
            <SelectField name="supplier" label="Supplier" required placeholder="Select supplier" options={SUPPLIERS} />
            <TextField name="batchNo" label="Batch number" required placeholder="e.g. B261234" />
            <TextField name="expiryDate" type="date" label="Expiry date" required />
            <TextField name="entryDate" type="date" label="Entry date" required />
            <TextAreaField name="notes" label="Notes" rows={2} className="full" placeholder="Storage, handling…" />
          </div>
          <div className="modal__footer" style={footerStyle}>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" icon={Save}>
              {isEdit ? 'Save changes' : 'Add medicine'}
            </Button>
          </div>
        </Form>
      </Formik>
    </Modal>
  );
}

/* ---------------- Stock in (purchase received) ---------------- */
export function StockInModal({ medicine, onClose }) {
  const { api, state } = useData();
  const { user } = useAuth();
  const toast = useToast();
  if (!medicine) return null;
  const cur = state.settings.fees.currency;

  return (
    <Modal open onClose={onClose} title="Stock in — receive purchase" subtitle={`${medicine.name} · current stock ${medicine.currentStock} ${medicine.unit.toLowerCase()}(s)`}>
      <Formik
        initialValues={{
          quantity: '',
          unitCost: medicine.purchasePrice,
          batchNo: medicine.batchNo,
          expiryDate: medicine.expiryDate,
          supplier: medicine.supplier,
          reference: '',
          date: todayKey(),
          note: '',
        }}
        validationSchema={Yup.object({
          quantity: requiredNumber('Quantity is required', 'Enter a quantity').integer('Whole units').min(1, 'At least 1'),
          unitCost: requiredNumber('Required', 'Enter a price').min(0),
          batchNo: Yup.string().trim().required('Batch number is required'),
          expiryDate: Yup.date().typeError('Select a date').min(new Date(), 'Expiry must be in the future').required('Expiry date is required'),
          supplier: Yup.string().required('Required'),
          reference: Yup.string().trim().required('Invoice / reference is required'),
          date: Yup.date().required(),
        })}
        onSubmit={(v) => {
          api.stockIn(medicine.id, v, user.id);
          toast.success('Stock received', `${medicine.name} +${v.quantity}`);
          onClose();
        }}
      >
        {({ values }) => (
          <Form noValidate>
            <div className="form-grid">
              <TextField name="quantity" type="number" min={1} label={`Quantity (${medicine.unit}s)`} required autoFocus />
              <TextField name="unitCost" type="number" min={0} label="Unit cost" prefix={cur} required />
              <TextField name="batchNo" label="Batch number" required />
              <TextField name="expiryDate" type="date" label="Expiry date" required />
              <SelectField name="supplier" label="Supplier" options={SUPPLIERS} required />
              <TextField name="reference" label="Invoice / reference" placeholder="INV-1234" required />
              <TextField name="date" type="date" label="Received on" required />
              <TextField name="note" label="Note" placeholder="Optional" />
            </div>
            <div className="callout callout--success mt-16">
              <PackagePlus size={16} />
              <span>
                New balance: <strong>{medicine.currentStock + (Number(values.quantity) || 0)}</strong> · Purchase value{' '}
                <strong>{formatCurrency((Number(values.quantity) || 0) * (Number(values.unitCost) || 0), cur)}</strong>
              </span>
            </div>
            <div className="modal__footer" style={footerStyle}>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="success" icon={PackagePlus}>
                Add to stock
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </Modal>
  );
}

/* ---------------- Stock adjustment ---------------- */
export function StockAdjustModal({ medicine, onClose }) {
  const { api } = useData();
  const { user } = useAuth();
  const toast = useToast();
  if (!medicine) return null;

  return (
    <Modal open onClose={onClose} title="Stock adjustment" subtitle={`${medicine.name} · current stock ${medicine.currentStock}`}>
      <Formik
        initialValues={{ direction: 'out', reason: 'expired', quantity: '', note: '' }}
        validationSchema={Yup.object({
          direction: Yup.string().oneOf(['in', 'out']),
          reason: Yup.string().required('Select a reason'),
          quantity: requiredNumber('Quantity is required', 'Enter a quantity')
            .integer('Whole units')
            .min(1, 'At least 1')
            .when('direction', { is: 'out', then: (s) => s.max(medicine.currentStock, `Only ${medicine.currentStock} in stock`) }),
          note: Yup.string().trim().required('Add a short note for the audit trail'),
        })}
        onSubmit={(v) => {
          api.stockAdjust(medicine.id, v, user.id);
          toast.success('Stock adjusted', `${medicine.name} ${v.direction === 'out' ? '-' : '+'}${v.quantity} (${STOCK_REASONS[v.reason]})`);
          onClose();
        }}
      >
        {({ values, setFieldValue }) => (
          <Form noValidate>
            <div className="field">
              <span className="field__label">Adjustment type</span>
              <div className="segmented" style={{ alignSelf: 'flex-start' }}>
                <button
                  type="button"
                  className={values.direction === 'out' ? 'is-active' : ''}
                  onClick={() => {
                    setFieldValue('direction', 'out');
                    setFieldValue('reason', 'expired');
                  }}
                >
                  Remove stock (−)
                </button>
                <button
                  type="button"
                  className={values.direction === 'in' ? 'is-active' : ''}
                  onClick={() => {
                    setFieldValue('direction', 'in');
                    setFieldValue('reason', 'correction');
                  }}
                >
                  Add stock (+)
                </button>
              </div>
            </div>
            <div className="form-grid mt-16">
              <SelectField
                name="reason"
                label="Reason"
                options={(values.direction === 'out' ? ['expired', 'damaged', 'returned', 'correction'] : ['correction']).map((r) => ({ value: r, label: STOCK_REASONS[r] }))}
              />
              <TextField name="quantity" type="number" min={1} label="Quantity" required />
              <TextAreaField name="note" label="Note" rows={2} className="full" placeholder="e.g. Batch B26xxxx expired on shelf" required />
            </div>
            <div className={`callout mt-16 ${values.direction === 'out' ? 'callout--warning' : 'callout--success'}`}>
              <PackageMinus size={16} />
              <span>
                New balance:{' '}
                <strong>{medicine.currentStock + (values.direction === 'out' ? -1 : 1) * (Number(values.quantity) || 0)}</strong>
              </span>
            </div>
            <div className="modal__footer" style={footerStyle}>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant={values.direction === 'out' ? 'danger' : 'success'}>
                Save adjustment
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </Modal>
  );
}
