import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  MonitorPlay,
  Package,
  Pill,
  Receipt,
  Settings,
  Stethoscope,
  Ticket,
  UserCog,
  Users,
} from 'lucide-react';
import Logo from '@/components/brand/Logo';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { cx } from '@/utils/format';

export default function Sidebar({ onNavigate }) {
  const { can, user } = useAuth();
  const { todayVisits, state, today } = useData();

  const waiting = todayVisits.filter((v) => v.status === 'waiting').length;
  const myQueue = todayVisits.filter(
    (v) => (v.status === 'waiting' || v.status === 'in_consultation') && (user?.role !== 'doctor' || v.doctorId === user.id),
  ).length;
  const pharmacy = state.visits.filter((v) => v.status === 'pharmacy').length;
  const billing = state.visits.filter((v) => v.status === 'billing').length;
  const lowStock = state.medicines.filter((m) => m.currentStock <= m.minStock || m.expiryDate < today).length;

  const sections = [
    {
      label: 'Overview',
      items: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: 'dashboard.view' }],
    },
    {
      label: 'Patient Journey',
      items: [
        { to: '/patients', label: 'Patients', icon: Users, perm: 'patients.view' },
        { to: '/queue', label: 'Tokens & Queue', icon: Ticket, perm: 'queue.view', badge: waiting },
        { to: '/consultations', label: 'Consultations', icon: Stethoscope, perm: 'consultation.perform', badge: myQueue },
        { to: '/pharmacy', label: 'Dispensing', icon: Pill, perm: 'pharmacy.dispense', badge: pharmacy, alert: pharmacy > 0 },
        { to: '/billing', label: 'Billing', icon: Receipt, perm: 'billing.view', badge: billing, alert: billing > 0 },
        { to: '/visits', label: 'Visit Records', icon: ClipboardList, perm: 'patients.view' },
      ],
    },
    {
      label: 'Management',
      items: [
        { to: '/inventory', label: 'Inventory', icon: Package, perm: 'inventory.view', badge: lowStock, alert: lowStock > 0 },
        { to: '/reports', label: 'Reports', icon: BarChart3, perm: 'reports.view' },
        { to: '/staff', label: 'Staff & Roles', icon: UserCog, perm: 'staff.manage' },
        { to: '/settings', label: 'Settings', icon: Settings, perm: 'settings.manage' },
      ],
    },
  ];

  return (
    <aside className="sidebar" aria-label="Main navigation">
      <div className="sidebar__brand">
        <Logo tone="light" size={38} />
      </div>
      <nav className="sidebar__nav">
        {sections.map((section) => {
          const items = section.items.filter((i) => can(i.perm));
          if (!items.length) return null;
          return (
            <div key={section.label} className="sidebar__section">
              <div className="sidebar__label">{section.label}</div>
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => cx('nav-link', isActive && 'active')}
                    onClick={onNavigate}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                    {item.badge > 0 && (
                      <span className={cx('nav-link__badge', item.alert && 'nav-link__badge--alert')}>{item.badge}</span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>
      {can('queue.view') && (
        <div className="sidebar__footer">
          <a className="sidebar-card" href="/display" target="_blank" rel="noreferrer" style={{ display: 'block' }}>
            <div className="flex items-center gap-8">
              <MonitorPlay size={18} color="#e0b25b" />
              <span className="sidebar-card__title">Token Display Board</span>
            </div>
            <div className="sidebar-card__text">Open the waiting-room “Now Serving” screen in a new tab.</div>
          </a>
        </div>
      )}
    </aside>
  );
}
