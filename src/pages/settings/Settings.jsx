import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import {
  Building2,
  Database,
  FileText,
  ImageIcon,
  Phone,
  Receipt,
  RefreshCcw,
  Repeat,
  Save,
  ShieldCheck,
  Upload,
  Wallet,
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import CategoryTag from '@/components/ui/CategoryTag';
import { ConfirmDialog } from '@/components/ui/Modal';
import Logo, { LogoMark } from '@/components/brand/Logo';
import { SelectField, SwitchField, TextAreaField, TextField } from '@/components/form/Fields';
import ThermalReceipt from '@/components/print/ThermalReceipt';
import PrescriptionDocument from '@/components/print/PrescriptionDocument';
import PermissionMatrix from '@/pages/staff/PermissionMatrix';
import { BILLING_CATEGORY_IDS } from '@/data/constants';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { computeConsultationFee, FEE_RULE_TYPES } from '@/utils/billing';
import { cx, formatCurrency } from '@/utils/format';
import { requiredNumber } from '@/utils/validation';
import config from '@/config';

const SECTIONS = [
  { id: 'clinic', label: 'Clinic information', icon: Building2 },
  { id: 'logo', label: 'Clinic logo', icon: ImageIcon },
  { id: 'contact', label: 'Contact information', icon: Phone },
  { id: 'fees', label: 'Consultation fees', icon: Wallet },
  { id: 'followup', label: 'Follow-up & category charges', icon: Repeat },
  { id: 'receipt', label: 'Receipt settings', icon: Receipt },
  { id: 'prescription', label: 'Prescription settings', icon: FileText },
  { id: 'roles', label: 'User roles & permissions', icon: ShieldCheck },
  { id: 'data', label: 'Demo data', icon: Database },
];

function SaveBar({ dirty, isSubmitting, onReset }) {
  return (
    <div className="card__footer">
      <Button variant="secondary" disabled={!dirty} onClick={onReset}>
        Discard
      </Button>
      <Button type="submit" icon={Save} disabled={!dirty} loading={isSubmitting}>
        Save changes
      </Button>
    </div>
  );
}

function useSaver(section) {
  const { api } = useData();
  const { user } = useAuth();
  const toast = useToast();
  return (values, { resetForm }) => {
    api.updateSettings(section, values, user.id);
    toast.success('Settings saved', 'Changes are applied across the app, receipts and prescriptions.');
    resetForm({ values });
  };
}

/* ------------------------------------------------------------------ */

function ClinicSection() {
  const { state } = useData();
  const save = useSaver('clinic');
  return (
    <Card>
      <CardHeader title="Clinic information" subtitle="Shown on the sidebar, login, prescriptions and receipts" icon={Building2} />
      <Formik
        initialValues={state.settings.clinic}
        validationSchema={Yup.object({
          name: Yup.string().trim().min(3).required('Clinic name is required'),
          tagline: Yup.string().max(60),
          registrationNo: Yup.string().required('Registration number is required'),
          timings: Yup.string().required('Clinic timings are required'),
        })}
        onSubmit={save}
      >
        {({ dirty, isSubmitting, resetForm }) => (
          <Form noValidate>
            <CardBody>
              <div className="form-grid">
                <TextField name="name" label="Clinic name" required />
                <TextField name="tagline" label="Tagline" />
                <TextField name="registrationNo" label="Registration / licence no." required />
                <TextField name="timings" label="Clinic timings" required />
              </div>
            </CardBody>
            <SaveBar dirty={dirty} isSubmitting={isSubmitting} onReset={() => resetForm()} />
          </Form>
        )}
      </Formik>
    </Card>
  );
}

function LogoSection() {
  const { state, api } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const input = useRef(null);

  const onFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(png|jpe?g|svg\+xml|webp)$/.test(file.type)) {
      toast.error('Unsupported file', 'Upload a PNG, JPG, SVG or WEBP image.');
      return;
    }
    if (file.size > 400 * 1024) {
      toast.error('File too large', 'Please use an image under 400 KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      api.setLogo(reader.result, user.id);
      toast.success('Logo updated', 'Your logo now appears on the sidebar, login, prescriptions and receipts.');
    };
    reader.readAsDataURL(file);
  };

  return (
    <Card>
      <CardHeader title="Clinic logo" subtitle="Used on the sidebar, login screen, prescriptions and thermal receipts" icon={ImageIcon} />
      <CardBody>
        <div className="logo-previews">
          <div className="logo-preview">
            <Logo size={44} />
            <span>Light background</span>
          </div>
          <div className="logo-preview logo-preview--dark">
            <Logo size={44} tone="light" />
            <span>Sidebar</span>
          </div>
          <div className="logo-preview">
            <Logo size={44} tone="mono" variant="mark" />
            <span>Thermal receipt (mono)</span>
          </div>
        </div>
        <div className="callout callout--brand mt-16">
          <LogoMark size={28} />
          <span>
            The default Zaib Clinic mark combines a <strong>medical cross</strong> (healthcare & trust) cradled by a <strong>warm gold arc</strong> (care & hospitality).
          </span>
        </div>
        <input ref={input} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden onChange={onFile} />
      </CardBody>
      <div className="card__footer">
        {state.settings.logo && (
          <Button variant="secondary" icon={RefreshCcw} onClick={() => api.setLogo(null, user.id)}>
            Reset to default logo
          </Button>
        )}
        <Button icon={Upload} onClick={() => input.current?.click()}>
          Upload logo
        </Button>
      </div>
    </Card>
  );
}

function ContactSection() {
  const { state } = useData();
  const save = useSaver('clinic');
  const c = state.settings.clinic;
  return (
    <Card>
      <CardHeader title="Contact information" subtitle="Printed on every prescription and receipt" icon={Phone} />
      <Formik
        initialValues={{ address: c.address, city: c.city, phone: c.phone, mobile: c.mobile, email: c.email, website: c.website }}
        validationSchema={Yup.object({
          address: Yup.string().required('Address is required'),
          city: Yup.string().required('City is required'),
          phone: Yup.string().required('Phone is required'),
          mobile: Yup.string(),
          email: Yup.string().email('Enter a valid email').required('Email is required'),
          website: Yup.string(),
        })}
        onSubmit={save}
      >
        {({ dirty, isSubmitting, resetForm }) => (
          <Form noValidate>
            <CardBody>
              <div className="form-grid">
                <TextField name="address" label="Street address" required className="full" />
                <TextField name="city" label="City / country" required />
                <TextField name="phone" label="Landline" required />
                <TextField name="mobile" label="Mobile / WhatsApp" />
                <TextField name="email" label="Email" required />
                <TextField name="website" label="Website" />
              </div>
            </CardBody>
            <SaveBar dirty={dirty} isSubmitting={isSubmitting} onReset={() => resetForm()} />
          </Form>
        )}
      </Formik>
    </Card>
  );
}

function FeesSection() {
  const { state } = useData();
  const save = useSaver('fees');
  return (
    <Card>
      <CardHeader title="Consultation fees" subtitle="Standard fee charged to Regular patients at the end of the visit" icon={Wallet} />
      <Formik
        initialValues={state.settings.fees}
        validationSchema={Yup.object({
          currency: Yup.string().required('Currency is required'),
          consultationFee: requiredNumber('Fee is required', 'Enter an amount').min(0),
          maxDiscountPercent: requiredNumber('Required', 'Enter a %').min(0).max(100, 'Max 100'),
        })}
        onSubmit={save}
      >
        {({ dirty, isSubmitting, resetForm, values }) => (
          <Form noValidate>
            <CardBody>
              <div className="form-grid">
                <TextField name="consultationFee" type="number" min={0} label="Standard consultation fee" prefix={values.currency} required />
                <TextField name="currency" label="Currency symbol" required />
                <TextField name="maxDiscountPercent" type="number" min={0} max={100} label="Maximum manual discount (%)" required />
                <div className="field" style={{ justifyContent: 'flex-end' }}>
                  <SwitchField name="allowManualDiscount" label="Allow manual discounts at billing" hint="Only roles with the discount permission can apply them." />
                </div>
              </div>
            </CardBody>
            <SaveBar dirty={dirty} isSubmitting={isSubmitting} onReset={() => resetForm()} />
          </Form>
        )}
      </Formik>
    </Card>
  );
}

function FollowUpSection() {
  const { state, api } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const cur = state.settings.fees.currency;
  return (
    <Card>
      <CardHeader title="Follow-up & category charges" subtitle="How each patient category affects the consultation fee" icon={Repeat} />
      <Formik
        initialValues={{ rules: state.settings.feeRules, followUp: state.settings.followUp }}
        validationSchema={Yup.object({
          followUp: Yup.object({
            sameDayWindowHours: requiredNumber('Required').min(1, 'Min 1').max(24, 'Max 24'),
            nextDayWindowDays: requiredNumber('Required').min(1, 'Min 1').max(3, 'Max 3'),
            standardFollowUpDays: requiredNumber('Required').min(1, 'Min 1').max(60, 'Max 60'),
          }),
        })}
        onSubmit={(values, { resetForm }) => {
          const rules = Object.fromEntries(Object.entries(values.rules).map(([k, r]) => [k, { type: r.type, value: Number(r.value) || 0 }]));
          api.updateSettings('feeRules', rules, user.id);
          api.updateSettings('followUp', values.followUp, user.id);
          toast.success('Charges updated', 'New fees apply to upcoming bills.');
          resetForm({ values: { ...values, rules } });
        }}
      >
        {({ values, dirty, isSubmitting, resetForm }) => (
          <Form noValidate>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th style={{ minWidth: 190 }}>Fee rule</th>
                    <th style={{ width: 150 }}>Value</th>
                    <th className="num">Resulting fee</th>
                  </tr>
                </thead>
                <tbody>
                  {BILLING_CATEGORY_IDS.map((id) => {
                    const rule = values.rules[id] || { type: 'full', value: 0 };
                    const preview = computeConsultationFee(id, { ...state.settings, feeRules: { ...values.rules, [id]: { ...rule, value: Number(rule.value) || 0 } } });
                    return (
                      <tr key={id}>
                        <td>
                          <CategoryTag id={id} />
                        </td>
                        <td>
                          <SelectField name={`rules.${id}.type`} options={FEE_RULE_TYPES.map((t) => ({ value: t.id, label: t.label }))} />
                        </td>
                        <td>
                          {rule.type === 'fixed' || rule.type === 'percent' ? (
                            <TextField name={`rules.${id}.value`} type="number" min={0} prefix={rule.type === 'percent' ? '%' : cur} />
                          ) : (
                            <span className="muted text-sm">—</span>
                          )}
                        </td>
                        <td className="num fw-700">{preview.isFree ? <span className="text-green">Free</span> : formatCurrency(preview.fee, cur)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <CardBody>
              <div className="section-title">Follow-up windows (used for automatic suggestions at token issue)</div>
              <div className="form-grid form-grid--3">
                <TextField name="followUp.sameDayWindowHours" type="number" label="Same-day window (hours)" />
                <TextField name="followUp.nextDayWindowDays" type="number" label="Next-day window (days)" />
                <TextField name="followUp.standardFollowUpDays" type="number" label="Standard follow-up (days)" />
              </div>
            </CardBody>
            <SaveBar dirty={dirty} isSubmitting={isSubmitting} onReset={() => resetForm()} />
          </Form>
        )}
      </Formik>
    </Card>
  );
}

function ReceiptSection() {
  const { state, lookup } = useData();
  const save = useSaver('receipt');
  const sample = [...state.bills].reverse().find((b) => b.medicines.length > 0) || state.bills[state.bills.length - 1];
  return (
    <Formik
      initialValues={state.settings.receipt}
      validationSchema={Yup.object({ header: Yup.string().max(40), footer: Yup.string().max(140).required('Thank-you message is required'), note: Yup.string().max(140) })}
      onSubmit={save}
    >
      {({ values, dirty, isSubmitting, resetForm }) => (
        <Form noValidate>
          <div className="grid grid-main-side">
            <Card>
              <CardHeader title="Receipt settings" subtitle="80mm thermal printer receipt" icon={Receipt} />
              <CardBody>
                <div className="form-grid">
                  <TextField name="header" label="Receipt title" />
                  <TextField name="paperWidth" label="Paper width" disabled hint="Optimised for standard 80mm rolls" />
                  <TextAreaField name="footer" label="Thank-you message" rows={2} className="full" required />
                  <TextAreaField name="note" label="Additional note" rows={2} className="full" />
                </div>
                <div className="grid grid-3 mt-16" style={{ gap: 12 }}>
                  <SwitchField name="showLogo" label="Show logo" />
                  <SwitchField name="showContact" label="Show contact details" />
                  <SwitchField name="showMedicineDetails" label="Itemise medicines" />
                </div>
              </CardBody>
              <SaveBar dirty={dirty} isSubmitting={isSubmitting} onReset={() => resetForm()} />
            </Card>
            <Card>
              <CardHeader title="Live preview" subtitle="Unsaved changes shown" />
              {sample ? (
                <div className="paper-preview paper-preview--thermal" style={{ borderRadius: 0, maxHeight: 640 }}>
                  <div className="paper-preview__sheet paper-preview__sheet--thermal">
                    <ThermalReceipt
                      bill={sample}
                      patient={lookup.patient[sample.patientId]}
                      visit={lookup.visit[sample.visitId]}
                      doctor={lookup.staff[lookup.visit[sample.visitId]?.doctorId]}
                      cashier={lookup.staff[sample.createdBy]}
                      settings={{ ...state.settings, receipt: values }}
                    />
                  </div>
                </div>
              ) : (
                <CardBody>No bills yet.</CardBody>
              )}
            </Card>
          </div>
        </Form>
      )}
    </Formik>
  );
}

function PrescriptionSection() {
  const { state, lookup } = useData();
  const save = useSaver('prescription');
  const [which, setWhich] = useState('clinic');
  const sample = [...state.visits].reverse().find((v) => v.clinicRx.items.length && v.storeRx.items.length && v.consultation?.completedAt);
  return (
    <Formik
      initialValues={state.settings.prescription}
      validationSchema={Yup.object({
        clinicTitle: Yup.string().trim().required('Title is required'),
        storeTitle: Yup.string().trim().required('Title is required'),
        footerNote: Yup.string().max(220),
      })}
      onSubmit={save}
    >
      {({ values, dirty, isSubmitting, resetForm }) => (
        <Form noValidate>
          <Card className="mb-16">
            <CardHeader title="Prescription settings" subtitle="A4 layout for both the Clinic and Medical Store prescriptions" icon={FileText} />
            <CardBody>
              <div className="form-grid">
                <TextField name="clinicTitle" label="Prescription 1 title" required />
                <TextField name="storeTitle" label="Prescription 2 title" required />
                <TextAreaField name="footerNote" label="Footer note" rows={2} className="full" />
              </div>
              <div className="grid grid-3 mt-16" style={{ gap: 12 }}>
                <SwitchField name="showLogo" label="Show logo / letterhead" />
                <SwitchField name="showVitals" label="Print vitals" />
                <SwitchField name="showSignature" label="Doctor signature block" />
              </div>
            </CardBody>
            <SaveBar dirty={dirty} isSubmitting={isSubmitting} onReset={() => resetForm()} />
          </Card>
          {sample && (
            <Card>
              <CardHeader
                title="Live preview"
                subtitle="Unsaved changes shown"
                actions={
                  <div className="segmented">
                    {[
                      ['clinic', 'Clinic'],
                      ['store', 'Medical Store'],
                    ].map(([id, l]) => (
                      <button key={id} type="button" className={cx(which === id && 'is-active')} onClick={() => setWhich(id)}>
                        {l}
                      </button>
                    ))}
                  </div>
                }
              />
              <div className="paper-preview" style={{ borderRadius: 0 }}>
                <div className="paper-preview__sheet paper-preview__sheet--a4">
                  <PrescriptionDocument
                    type={which}
                    visit={sample}
                    patient={lookup.patient[sample.patientId]}
                    doctor={lookup.staff[sample.doctorId]}
                    settings={{ ...state.settings, prescription: values }}
                  />
                </div>
              </div>
            </Card>
          )}
        </Form>
      )}
    </Formik>
  );
}

function DataSection() {
  const { state, api } = useData();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  return (
    <Card>
      <CardHeader title="Demo data" subtitle="This build is frontend-only — all data lives in your browser (localStorage)" icon={Database} />
      <CardBody>
        <div className="kv kv--3">
          <div>
            <div className="kv__label">Patients</div>
            <div className="kv__value">{state.patients.length}</div>
          </div>
          <div>
            <div className="kv__label">Visits</div>
            <div className="kv__value">{state.visits.length}</div>
          </div>
          <div>
            <div className="kv__label">Bills</div>
            <div className="kv__value">{state.bills.length}</div>
          </div>
          <div>
            <div className="kv__label">Medicines</div>
            <div className="kv__value">{state.medicines.length}</div>
          </div>
          <div>
            <div className="kv__label">Stock movements</div>
            <div className="kv__value">{state.movements.length}</div>
          </div>
          <div>
            <div className="kv__label">Generated on</div>
            <div className="kv__value">{state.seededOn}</div>
          </div>
        </div>
        <div className="callout callout--warning mt-16">
          <RefreshCcw size={16} />
          <span>
            {config.demoAutoResetDaily
              ? 'Mock data is regenerated automatically each new day so “today” always looks live (VITE_DEMO_AUTO_RESET_DAILY). '
              : 'Daily auto-reset is off (VITE_DEMO_AUTO_RESET_DAILY=false), so your changes are kept. '}
            Resetting now discards every change you made.
          </span>
        </div>
      </CardBody>
      <div className="card__footer">
        <Button variant="danger-soft" icon={RefreshCcw} onClick={() => setConfirm(true)}>
          Reset demo data
        </Button>
      </div>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Reset all demo data?"
        message="Patients, visits, bills, inventory and settings return to the original mock data. Your current login stays active."
        confirmLabel="Reset data"
        tone="danger"
        onConfirm={() => {
          api.resetDemo();
          toast.success('Demo data reset');
        }}
      />
    </Card>
  );
}

export default function Settings() {
  const [params, setParams] = useSearchParams();
  const section = params.get('section') || 'clinic';

  return (
    <>
      <PageHeader title="Settings" subtitle="Clinic profile, fees, printing and access control." crumbs={[{ label: 'Home', to: '/' }, { label: 'Settings' }]} />
      <div className="settings">
        <nav className="settings__nav" aria-label="Settings sections">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <button key={s.id} type="button" className={cx('settings__link', section === s.id && 'is-active')} onClick={() => setParams({ section: s.id }, { replace: true })}>
                <Icon size={17} />
                <span>{s.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="settings__body">
          {section === 'clinic' && <ClinicSection />}
          {section === 'logo' && <LogoSection />}
          {section === 'contact' && <ContactSection />}
          {section === 'fees' && <FeesSection />}
          {section === 'followup' && <FollowUpSection />}
          {section === 'receipt' && <ReceiptSection />}
          {section === 'prescription' && <PrescriptionSection />}
          {section === 'roles' && (
            <Card>
              <CardHeader title="User roles & permissions" subtitle="Control which modules and actions each role can access" icon={ShieldCheck} />
              <PermissionMatrix />
            </Card>
          )}
          {section === 'data' && <DataSection />}
        </div>
      </div>
    </>
  );
}
