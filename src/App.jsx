import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { HomeRedirect, RequireAuth, RequirePermission } from '@/components/layout/Guards';
import { useAuth } from '@/context/AuthContext';

const Login = lazy(() => import('@/pages/auth/Login'));
const Dashboard = lazy(() => import('@/pages/dashboard/Dashboard'));
const PatientList = lazy(() => import('@/pages/patients/PatientList'));
const PatientDetail = lazy(() => import('@/pages/patients/PatientDetail'));
const Queue = lazy(() => import('@/pages/queue/Queue'));
const TokenDisplay = lazy(() => import('@/pages/queue/TokenDisplay'));
const ConsultationQueue = lazy(() => import('@/pages/consultation/ConsultationQueue'));
const Consultation = lazy(() => import('@/pages/consultation/Consultation'));
const Pharmacy = lazy(() => import('@/pages/pharmacy/Pharmacy'));
const Billing = lazy(() => import('@/pages/billing/Billing'));
const Checkout = lazy(() => import('@/pages/billing/Checkout'));
const VisitList = lazy(() => import('@/pages/patients/VisitList'));
const VisitDetail = lazy(() => import('@/pages/patients/VisitDetail'));
const Inventory = lazy(() => import('@/pages/inventory/Inventory'));
const MedicineDetail = lazy(() => import('@/pages/inventory/MedicineDetail'));
const Staff = lazy(() => import('@/pages/staff/Staff'));
const Reports = lazy(() => import('@/pages/reports/Reports'));
const Settings = lazy(() => import('@/pages/settings/Settings'));
const Profile = lazy(() => import('@/pages/misc/Profile'));
const NotFound = lazy(() => import('@/pages/misc/NotFound'));

function Loader() {
  return (
    <div className="loader-screen">
      <span className="spinner-lg" aria-label="Loading" />
    </div>
  );
}

const guard = (perm, el) => <RequirePermission perm={perm}>{el}</RequirePermission>;

export default function App() {
  const { user } = useAuth();

  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

        <Route element={<RequireAuth />}>
          <Route path="/display" element={<TokenDisplay />} />

          <Route element={<AppLayout />}>
            <Route index element={<HomeRedirect />} />
            <Route path="dashboard" element={guard('dashboard.view', <Dashboard />)} />

            <Route path="patients" element={guard('patients.view', <PatientList />)} />
            <Route path="patients/:id" element={guard('patients.view', <PatientDetail />)} />

            <Route path="queue" element={guard('queue.view', <Queue />)} />

            <Route path="consultations" element={guard('consultation.perform', <ConsultationQueue />)} />
            <Route path="consultations/:visitId" element={guard('consultation.perform', <Consultation />)} />

            <Route path="pharmacy" element={guard('pharmacy.dispense', <Pharmacy />)} />

            <Route path="billing" element={guard('billing.view', <Billing />)} />
            <Route path="billing/checkout/:visitId" element={guard('billing.create', <Checkout />)} />

            <Route path="visits" element={guard('patients.view', <VisitList />)} />
            <Route path="visits/:visitId" element={guard('patients.view', <VisitDetail />)} />

            <Route path="inventory" element={guard('inventory.view', <Inventory />)} />
            <Route path="inventory/:id" element={guard('inventory.view', <MedicineDetail />)} />

            <Route path="staff" element={guard('staff.manage', <Staff />)} />
            <Route path="reports" element={guard('reports.view', <Reports />)} />
            <Route path="settings" element={guard('settings.manage', <Settings />)} />
            <Route path="profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
