import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { Check, IdCard, Phone, UserPlus } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { CategoryIcon } from '@/components/ui/CategoryTag';
import { CheckboxField, SelectField, TextAreaField, TextField } from '@/components/form/Fields';
import { CATEGORIES, GENDERS } from '@/data/constants';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { cx, todayKey } from '@/utils/format';
import { requiredNumber } from '@/utils/validation';

const PATIENT_TAGS = ['regular', 'free', 'discounted', 'follow_up'];

export const patientSchema = Yup.object({
  name: Yup.string().trim().min(3, 'Name must be at least 3 characters').max(60, 'Name is too long').required('Patient name is required'),
  phone: Yup.string()
    .trim()
    .matches(/^(\+92|0)3\d{2}-?\d{7}$/, 'Use a valid mobile number, e.g. 0300-1234567')
    .required('Phone number is required'),
  age: requiredNumber('Age is required', 'Age must be a number')
    .integer('Age must be a whole number')
    .min(0, 'Age cannot be negative')
    .max(120, 'Please enter a realistic age'),
  gender: Yup.string().oneOf(GENDERS, 'Select a gender').required('Gender is required'),
  address: Yup.string().trim().min(5, 'Address is too short').required('Address is required'),
  registeredAt: Yup.date().typeError('Select a valid date').max(new Date(Date.now() + 86_400_000), 'Date cannot be in the future').required('Registration date is required'),
  tags: Yup.array().min(1, 'Select at least one category'),
  bloodGroup: Yup.string(),
  notes: Yup.string().max(300, 'Keep notes under 300 characters'),
});

function TagPicker({ values, setFieldValue, error }) {
  const toggle = (id) => {
    let next = values.tags.includes(id) ? values.tags.filter((t) => t !== id) : [...values.tags, id];
    // Regular / Free / Discounted are mutually exclusive billing defaults
    const exclusive = ['regular', 'free', 'discounted'];
    if (exclusive.includes(id) && !values.tags.includes(id)) next = next.filter((t) => !exclusive.includes(t) || t === id);
    setFieldValue('tags', next);
  };
  return (
    <div className="field full">
      <span className="field__label">
        <span>
          Patient category<span className="req">*</span>
        </span>
      </span>
      <div className="option-grid">
        {PATIENT_TAGS.map((id) => {
          const c = CATEGORIES[id];
          const selected = values.tags.includes(id);
          return (
            <button key={id} type="button" className={cx('option-card', selected && 'is-selected')} onClick={() => toggle(id)}>
              {selected && <Check size={15} className="option-card__check" />}
              <span className="option-card__title">
                <span className="tag tag--sm" style={{ background: c.bg, color: c.fg, padding: '0 5px' }}>
                  <CategoryIcon id={id} size={11} />
                </span>
                {c.label}
              </span>
              <span className="option-card__desc">
                {id === 'regular' && 'Pays the standard consultation fee'}
                {id === 'free' && 'Approved for free consultations'}
                {id === 'discounted' && 'Eligible for discounted fee'}
                {id === 'follow_up' && 'Under ongoing follow-up care'}
              </span>
            </button>
          );
        })}
      </div>
      {error && <span className="field__error">{error}</span>}
    </div>
  );
}

export default function PatientFormModal({ open, onClose, patient, onSaved, allowIssueToken = true }) {
  const { state, api } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const isEdit = !!patient;
  const nextId = `ZC-${state.counters.patient + 1}`;

  const initialValues = isEdit
    ? {
        ...patient,
        registeredAt: patient.registeredAt.slice(0, 10),
        bloodGroup: patient.bloodGroup || '',
        notes: patient.notes || '',
        issueToken: false,
      }
    : {
        name: '',
        phone: '',
        age: '',
        gender: '',
        address: '',
        bloodGroup: '',
        registeredAt: todayKey(),
        tags: ['regular'],
        notes: '',
        issueToken: allowIssueToken,
      };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Edit patient record' : 'Register new patient'}
      subtitle={isEdit ? `${patient.id} · ${patient.name}` : 'Create a unique patient record. Billing happens at the end of the visit.'}
    >
      <Formik
        initialValues={initialValues}
        validationSchema={patientSchema}
        enableReinitialize
        onSubmit={(values, { setSubmitting }) => {
          const payload = {
            ...values,
            registeredAt:
              values.registeredAt === todayKey() && !isEdit
                ? new Date().toISOString()
                : new Date(`${values.registeredAt}T${new Date().toTimeString().slice(0, 8)}`).toISOString(),
          };
          delete payload.issueToken;
          if (isEdit) {
            api.updatePatient(patient.id, payload, user.id);
            toast.success('Patient updated', `${values.name}'s record was saved.`);
            onSaved?.(patient, { issueToken: false });
          } else {
            const created = api.addPatient(payload, user.id);
            toast.success('Patient registered', `${created.name} · ${created.id}`);
            onSaved?.(created, { issueToken: values.issueToken });
          }
          setSubmitting(false);
          onClose();
        }}
      >
        {({ values, setFieldValue, errors, touched, isSubmitting }) => (
          <Form noValidate>
            {!isEdit && (
              <div className="id-preview">
                <IdCard size={18} />
                <span>
                  Unique patient ID will be <strong className="mono">{nextId}</strong>
                </span>
              </div>
            )}
            <div className="form-grid">
              <TextField name="name" label="Patient name" required placeholder="e.g. Ayesha Khan" className="full" autoFocus />
              <TextField name="phone" label="Phone number" required placeholder="0300-1234567" icon={Phone} />
              <div className="form-grid" style={{ gap: 12 }}>
                <TextField name="age" label="Age" type="number" required placeholder="Years" min={0} max={120} />
                <SelectField name="gender" label="Gender" required placeholder="Select" options={GENDERS} />
              </div>
              <TextField name="address" label="Address" required placeholder="House, street, area, city" className="full" />
              <TextField name="registeredAt" label="Registration date" type="date" required />
              <SelectField
                name="bloodGroup"
                label="Blood group"
                placeholder="Unknown"
                options={['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']}
              />
              <TagPicker values={values} setFieldValue={setFieldValue} error={touched.tags && errors.tags} />
              <TextAreaField name="notes" label="Notes" placeholder="Allergies, welfare approval, special instructions…" rows={2} className="full" />
            </div>
            <div className="modal__footer" style={{ margin: '20px -22px -20px' }}>
              {!isEdit && allowIssueToken && (
                <CheckboxField name="issueToken" label="Issue a token right after registration" className="grow" />
              )}
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" icon={isEdit ? Check : UserPlus} loading={isSubmitting}>
                {isEdit ? 'Save changes' : 'Register patient'}
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </Modal>
  );
}
