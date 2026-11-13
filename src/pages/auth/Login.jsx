import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { AlertCircle, ArrowRight, Eye, EyeOff, HeartPulse, Lock, Mail, Receipt, ShieldCheck, Stethoscope } from 'lucide-react';
import Logo, { LogoMark } from '@/components/brand/Logo';
import Button from '@/components/ui/Button';
import { CheckboxField, TextField } from '@/components/form/Fields';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import config from '@/config';

const schema = Yup.object({
  email: Yup.string().trim().email('Enter a valid email address').required('Email is required'),
  password: Yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
});

const DEMO = [
  { label: 'Admin', email: 'admin@zaibclinic.com', password: 'Admin@1234' },
  { label: 'Doctor', email: 'doctor@zaibclinic.com', password: 'Doctor@1234' },
  { label: 'Reception', email: 'reception@zaibclinic.com', password: 'Staff@1234' },
  { label: 'Pharmacy', email: 'pharmacy@zaibclinic.com', password: 'Staff@1234' },
  { label: 'Cashier', email: 'billing@zaibclinic.com', password: 'Staff@1234' },
];

const FEATURES = [
  { icon: Stethoscope, title: 'Seamless patient journey', text: 'Registration, tokens, consultation and billing in one flow.' },
  { icon: HeartPulse, title: 'Dual prescriptions', text: 'Separate clinic and medical-store prescriptions, print-ready.' },
  { icon: Receipt, title: 'Thermal receipts', text: 'Crisp 80mm receipts with category-aware billing.' },
];

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  return (
    <div className="auth">
      <section className="auth__brand">
        <div className="auth__brand-inner">
          <Logo tone="light" size={46} />
          <div className="auth__hero">
            <span className="auth__eyebrow">Clinic Management System</span>
            <h1>
              Compassionate care,
              <br />
              <span>beautifully organised.</span>
            </h1>
            <p>Everything your front desk, doctors, pharmacy and accounts need — calm, fast and reliable.</p>
          </div>
          <ul className="auth__features">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <li key={f.title}>
                  <span className="auth__feature-icon">
                    <Icon size={18} />
                  </span>
                  <div>
                    <strong>{f.title}</strong>
                    <p>{f.text}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="auth__brand-foot">© {new Date().getFullYear()} Zaib Clinic · Care · Trust · Hospitality</div>
        </div>
        <div className="auth__mark" aria-hidden>
          <LogoMark size={420} tone="light" />
        </div>
      </section>

      <section className="auth__panel">
        <div className="auth__card">
          <div className="auth__mobile-logo">
            <Logo size={40} />
          </div>
          <h2>Welcome back</h2>
          <p className="muted">Sign in to continue to your Zaib Clinic workspace.</p>

          <Formik
            initialValues={{ email: '', password: '', remember: true }}
            validationSchema={schema}
            onSubmit={async (values, { setSubmitting }) => {
              setError('');
              const res = await login(values.email, values.password, values.remember);
              setSubmitting(false);
              if (!res.ok) {
                setError(res.error);
                return;
              }
              toast.success(`Welcome, ${res.user.name.split(' ').slice(0, 2).join(' ')}`, 'You are signed in.');
              navigate(location.state?.from || '/', { replace: true });
            }}
          >
            {({ isSubmitting, setValues, values }) => (
              <Form className="auth__form" noValidate>
                {error && (
                  <div className="callout callout--danger">
                    <AlertCircle size={17} />
                    <span>{error}</span>
                  </div>
                )}
                <TextField name="email" type="email" label="Email address" placeholder="you@zaibclinic.com" icon={Mail} autoComplete="username" />
                <div className="auth__pw">
                  <TextField
                    name="password"
                    type={showPw ? 'text' : 'password'}
                    label="Password"
                    placeholder="Enter your password"
                    icon={Lock}
                    autoComplete="current-password"
                  />
                  <button type="button" className="auth__pw-toggle" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                    {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <CheckboxField name="remember" label="Remember me" />
                  <button
                    type="button"
                    className="auth__link"
                    onClick={() => toast.info('Password reset', 'Please contact your clinic administrator to reset your password.')}
                  >
                    Forgot password?
                  </button>
                </div>
                <Button type="submit" size="lg" block loading={isSubmitting} iconRight={ArrowRight}>
                  {isSubmitting ? 'Signing in…' : 'Sign in'}
                </Button>

                {config.showDemoAccounts && (
                  <div className="auth__demo">
                    <div className="auth__demo-title">
                      <ShieldCheck size={14} /> Demo accounts — click to fill
                    </div>
                    <div className="auth__demo-list">
                      {DEMO.map((d) => (
                        <button
                          key={d.label}
                          type="button"
                          className={`auth__demo-chip${values.email === d.email ? ' is-active' : ''}`}
                          onClick={() => {
                            setError('');
                            setValues({ ...values, email: d.email, password: d.password });
                          }}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                    <div className="auth__demo-creds">
                      Admin: <code>admin@zaibclinic.com</code> / <code>Admin@1234</code>
                    </div>
                  </div>
                )}
              </Form>
            )}
          </Formik>
        </div>
      </section>
    </div>
  );
}
