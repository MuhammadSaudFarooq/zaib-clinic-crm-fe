import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { useAuth } from '@/context/AuthContext';

export function RequireAuth() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export function RequirePermission({ perm, children }) {
  const { can } = useAuth();
  if (!can(perm)) {
    return (
      <div className="card" style={{ marginTop: 20 }}>
        <EmptyState
          icon={ShieldAlert}
          title="You don’t have access to this module"
          text="Your role does not include permission for this page. Ask an administrator to update your role permissions."
          action={<Button to="/" variant="secondary">Back to home</Button>}
        />
      </div>
    );
  }
  return children;
}

/** Sends each role to the first module it can use. */
export function HomeRedirect() {
  const { can } = useAuth();
  const order = [
    ['dashboard.view', '/dashboard'],
    ['queue.view', '/queue'],
    ['consultation.perform', '/consultations'],
    ['pharmacy.dispense', '/pharmacy'],
    ['billing.view', '/billing'],
    ['patients.view', '/patients'],
    ['inventory.view', '/inventory'],
    ['reports.view', '/reports'],
  ];
  const target = order.find(([p]) => can(p))?.[1] || '/profile';
  return <Navigate to={target} replace />;
}
