import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Bell, CalendarX2, ChevronDown, LogOut, Menu, Plus, Receipt, Settings, ShieldCheck, UserCircle2 } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import IssueTokenModal from '@/pages/queue/IssueTokenModal';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { formatDate, formatTime } from '@/utils/format';
import GlobalSearch from './GlobalSearch';

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="topbar__date">
      <strong>{formatTime(now)}</strong>
      <span>{formatDate(now, { withDay: true })}</span>
    </div>
  );
}

export default function Topbar({ onMenu }) {
  const { user, role, can, logout } = useAuth();
  const { state, today } = useData();
  const navigate = useNavigate();
  const [tokenOpen, setTokenOpen] = useState(false);

  const lowStock = state.medicines.filter((m) => m.currentStock <= m.minStock);
  const expired = state.medicines.filter((m) => m.expiryDate < today);
  const awaitingBilling = state.visits.filter((v) => v.status === 'billing');
  const alerts = [
    ...(can('inventory.view')
      ? lowStock.map((m) => ({
          id: `low-${m.id}`,
          icon: AlertTriangle,
          tone: 'tone-amber',
          text: `${m.name} is low on stock (${m.currentStock} ${m.unit.toLowerCase()}s left)`,
          to: `/inventory/${m.id}`,
        }))
      : []),
    ...(can('inventory.view')
      ? expired.map((m) => ({
          id: `exp-${m.id}`,
          icon: CalendarX2,
          tone: 'tone-red',
          text: `${m.name} batch ${m.batchNo} has expired`,
          to: `/inventory/${m.id}`,
        }))
      : []),
    ...(can('billing.view')
      ? awaitingBilling.map((v) => ({
          id: `bill-${v.id}`,
          icon: Receipt,
          tone: 'tone-pink',
          text: `Token #${v.tokenNo} is waiting at the billing desk`,
          to: `/billing/checkout/${v.id}`,
        }))
      : []),
  ];

  return (
    <header className="topbar">
      <button type="button" className="icon-btn topbar__menu" onClick={onMenu} aria-label="Open menu">
        <Menu size={19} />
      </button>

      <GlobalSearch />

      <div className="topbar__right">
        {can('queue.manage') && (
          <Button icon={Plus} onClick={() => setTokenOpen(true)} className="topbar__quick">
            <span className="topbar__quick-label">New Token</span>
          </Button>
        )}

        <Dropdown
          wide
          trigger={({ toggle }) => (
            <button type="button" className="icon-btn" onClick={toggle} aria-label="Notifications">
              <Bell size={18} />
              {alerts.length > 0 && <span className="icon-btn__dot" />}
            </button>
          )}
        >
          {(close) => (
            <>
              <div className="dropdown__header flex items-center justify-between">
                <strong>Notifications</strong>
                <span className="badge badge--brand">{alerts.length}</span>
              </div>
              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {alerts.length === 0 && <div className="empty__text" style={{ padding: 16 }}>You’re all caught up.</div>}
                {alerts.map((a) => {
                  const Icon = a.icon;
                  return (
                    <Link key={a.id} to={a.to} className="dropdown__item" onClick={close}>
                      <span className={`feed__icon ${a.tone}`}>
                        <Icon size={15} />
                      </span>
                      <span className="text-sm">{a.text}</span>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </Dropdown>

        <span className="topbar__divider" />
        <Clock />
        <span className="topbar__divider" />

        <Dropdown
          trigger={({ toggle }) => (
            <button type="button" className="user-chip" onClick={toggle}>
              <Avatar name={user?.name} />
              <span className="user-chip__meta">
                <span className="user-chip__name">{user?.name}</span>
                <span className="user-chip__role">{role?.label}</span>
              </span>
              <ChevronDown size={15} className="muted" />
            </button>
          )}
        >
          {(close) => (
            <>
              <div className="dropdown__header">
                <div className="fw-700">{user?.name}</div>
                <div className="text-xs muted">{user?.email}</div>
                <span className="badge badge--brand mt-8">
                  <ShieldCheck size={12} /> {role?.label}
                </span>
              </div>
              <button type="button" className="dropdown__item" onClick={() => { close(); navigate('/profile'); }}>
                <UserCircle2 size={16} /> My profile & access
              </button>
              {can('settings.manage') && (
                <button type="button" className="dropdown__item" onClick={() => { close(); navigate('/settings'); }}>
                  <Settings size={16} /> Clinic settings
                </button>
              )}
              <div className="dropdown__divider" />
              <button
                type="button"
                className="dropdown__item dropdown__item--danger"
                onClick={() => {
                  close();
                  logout();
                  navigate('/login', { replace: true });
                }}
              >
                <LogOut size={16} /> Sign out
              </button>
            </>
          )}
        </Dropdown>
      </div>

      <IssueTokenModal open={tokenOpen} onClose={() => setTokenOpen(false)} />
    </header>
  );
}
