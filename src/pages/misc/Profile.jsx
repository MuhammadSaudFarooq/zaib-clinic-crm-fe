import { Check, Lock, Mail, Phone, ShieldCheck, X } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import { PERMISSION_GROUPS } from '@/data/constants';
import { useAuth } from '@/context/AuthContext';
import { formatDate } from '@/utils/format';

export default function Profile() {
  const { user, role, can } = useAuth();
  return (
    <>
      <PageHeader title="My profile & access" subtitle="Your account details and what your role allows." crumbs={[{ label: 'Home', to: '/' }, { label: 'Profile' }]} />
      <div className="grid grid-side-main">
        <Card>
          <div className="profile-card__top">
            <Avatar name={user.name} size="xl" />
            <div className="profile-card__name">{user.name}</div>
            <div className="muted text-sm">{user.designation}</div>
            <Badge tone="brand" className="mt-8">
              <ShieldCheck size={12} /> {role?.label}
            </Badge>
          </div>
          <CardBody>
            <div className="info-line">
              <Mail size={15} /> <span>{user.email}</span>
            </div>
            <div className="info-line mt-8">
              <Phone size={15} /> <span>{user.phone}</span>
            </div>
            <div className="info-line mt-8">
              <Lock size={15} /> <span>Member since {formatDate(user.joinedAt)}</span>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Your permissions" subtitle={role?.description} icon={ShieldCheck} />
          <CardBody>
            <div className="perm-list">
              {PERMISSION_GROUPS.map((g) => (
                <div key={g.module} className="perm-list__group">
                  <div className="section-title" style={{ marginBottom: 6 }}>
                    {g.module}
                  </div>
                  {g.items.map((p) => {
                    const ok = can(p.key);
                    return (
                      <div key={p.key} className={`perm-list__item ${ok ? 'is-on' : ''}`}>
                        {ok ? <Check size={15} /> : <X size={15} />}
                        <span>{p.label}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
