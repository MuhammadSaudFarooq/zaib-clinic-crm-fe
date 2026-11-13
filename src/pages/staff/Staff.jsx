import { useMemo, useState } from 'react';
import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { KeyRound, Mail, Pencil, Phone, ShieldCheck, Stethoscope, UserCheck, UserPlus, Users, UserX } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Tabs from '@/components/ui/Tabs';
import SearchInput from '@/components/ui/SearchInput';
import StatCard from '@/components/ui/StatCard';
import Modal, { ConfirmDialog } from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import Switch from '@/components/ui/Switch';
import { Person } from '@/components/ui/Avatar';
import EmptyState from '@/components/ui/EmptyState';
import { SelectField, TextField } from '@/components/form/Fields';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { formatDate, todayKey } from '@/utils/format';
import PermissionMatrix from './PermissionMatrix';

const ROLE_TONES = { admin: 'brand', doctor: 'blue', receptionist: 'gold', pharmacist: 'violet', cashier: 'green' };

function StaffFormModal({ open, onClose, member }) {
  const { state, api } = useData();
  const { user } = useAuth();
  const toast = useToast();
  if (!open) return null;
  const isEdit = !!member;
  const others = state.staff.filter((s) => s.id !== member?.id).map((s) => s.email.toLowerCase());

  const schema = Yup.object({
    name: Yup.string().trim().min(3, 'Too short').required('Full name is required'),
    email: Yup.string()
      .trim()
      .email('Enter a valid email')
      .test('unique', 'This email is already used by another staff member', (v) => !others.includes((v || '').toLowerCase()))
      .required('Email is required'),
    phone: Yup.string().matches(/^(\+92|0)3\d{2}-?\d{7}$/, 'Use a valid mobile number, e.g. 0300-1234567').required('Phone is required'),
    role: Yup.string().required('Assign a role'),
    designation: Yup.string().trim().required('Designation is required'),
    room: Yup.string(),
    password: isEdit
      ? Yup.string().matches(/^$|^(?=.*[A-Z])(?=.*\d).{8,}$/, 'Min 8 chars with a capital letter and a number')
      : Yup.string().matches(/^(?=.*[A-Z])(?=.*\d).{8,}$/, 'Min 8 chars with a capital letter and a number').required('Password is required'),
    confirm: Yup.string().oneOf([Yup.ref('password'), ''], 'Passwords do not match'),
    joinedAt: Yup.date().typeError('Select a date').required('Joining date is required'),
  });

  return (
    <Modal open onClose={onClose} size="lg" title={isEdit ? 'Edit staff member' : 'Add staff member'} subtitle={isEdit ? member.id : 'Create a login and assign a role.'}>
      <Formik
        initialValues={
          isEdit
            ? { ...member, room: member.room || '', password: '', confirm: '' }
            : { name: '', email: '', phone: '', role: '', designation: '', room: '', password: '', confirm: '', status: 'active', joinedAt: todayKey() }
        }
        validationSchema={schema}
        onSubmit={(values) => {
          const payload = { ...values };
          delete payload.confirm;
          if (isEdit) {
            if (member.id === user.id && values.role !== 'admin' && member.role === 'admin') {
              toast.error('Not allowed', 'You cannot remove your own administrator role.');
              return;
            }
            api.updateStaff(member.id, payload, user.id);
            toast.success('Staff updated', values.name);
          } else {
            api.addStaff(payload, user.id);
            toast.success('Staff member added', `${values.name} can now sign in with ${values.email}`);
          }
          onClose();
        }}
      >
        {({ values }) => (
          <Form noValidate>
            <div className="form-grid">
              <TextField name="name" label="Full name" required placeholder="e.g. Dr. Ali Raza" autoFocus />
              <TextField name="email" type="email" label="Email (login)" required icon={Mail} placeholder="name@zaibclinic.com" />
              <TextField name="phone" label="Phone" required icon={Phone} placeholder="0300-1234567" />
              <SelectField
                name="role"
                label="Role"
                required
                placeholder="Select role"
                options={Object.values(state.roles).map((r) => ({ value: r.id, label: r.label }))}
                hint={state.roles[values.role]?.description}
              />
              <TextField name="designation" label="Designation" required placeholder="e.g. General Physician · MBBS" />
              {values.role === 'doctor' ? (
                <TextField name="room" label="Consultation room" placeholder="e.g. Room 3" />
              ) : (
                <TextField name="joinedAt" type="date" label="Joining date" required />
              )}
              {values.role === 'doctor' && <TextField name="joinedAt" type="date" label="Joining date" required />}
              <TextField name="password" type="password" label={isEdit ? 'New password (optional)' : 'Password'} required={!isEdit} icon={KeyRound} autoComplete="new-password" />
              <TextField name="confirm" type="password" label="Confirm password" icon={KeyRound} autoComplete="new-password" />
            </div>
            <div className="modal__footer" style={{ margin: '20px -22px -20px' }}>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" icon={isEdit ? Pencil : UserPlus}>
                {isEdit ? 'Save changes' : 'Add staff'}
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </Modal>
  );
}

export default function Staff() {
  const { state, api } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('members');
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [form, setForm] = useState({ open: false, member: null });
  const [toggle, setToggle] = useState(null);

  const rows = useMemo(() => {
    const t = q.toLowerCase();
    return state.staff.filter((s) => (!role || s.role === role) && (!t || s.name.toLowerCase().includes(t) || s.email.includes(t) || s.designation.toLowerCase().includes(t)));
  }, [state.staff, q, role]);

  const activeAdmins = state.staff.filter((s) => s.role === 'admin' && s.status === 'active').length;

  const requestToggle = (m) => {
    if (m.id === user.id) {
      toast.error('Not allowed', 'You cannot deactivate your own account.');
      return;
    }
    if (m.role === 'admin' && m.status === 'active' && activeAdmins <= 1) {
      toast.error('Not allowed', 'At least one active administrator is required.');
      return;
    }
    setToggle(m);
  };

  return (
    <>
      <PageHeader
        title="Staff & Roles"
        subtitle="Add staff, assign roles, manage access and activate or deactivate accounts."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Staff & Roles' }]}
        actions={
          <Button icon={UserPlus} onClick={() => setForm({ open: true, member: null })}>
            Add Staff
          </Button>
        }
      />

      <div className="grid grid-4 mb-16">
        <StatCard label="Total staff" value={state.staff.length} icon={Users} tone="brand" />
        <StatCard label="Active accounts" value={state.staff.filter((s) => s.status === 'active').length} icon={UserCheck} tone="green" />
        <StatCard label="Doctors" value={state.staff.filter((s) => s.role === 'doctor').length} icon={Stethoscope} tone="blue" />
        <StatCard label="Inactive" value={state.staff.filter((s) => s.status !== 'active').length} icon={UserX} tone="gray" />
      </div>

      <Card>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'members', label: 'Staff members', icon: Users, count: state.staff.length },
            { id: 'roles', label: 'Roles & permissions', icon: ShieldCheck },
          ]}
        />
        {tab === 'members' ? (
          <>
            <div className="table-toolbar">
              <SearchInput value={q} onChange={setQ} placeholder="Search name, email, designation" />
              <select className="select select--sm" style={{ width: 'auto' }} value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role">
                <option value="">All roles</option>
                {Object.values(state.roles).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            {rows.length === 0 ? (
              <EmptyState icon={Users} title="No staff found" />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Staff member</th>
                      <th>Role</th>
                      <th>Designation</th>
                      <th>Phone</th>
                      <th>Joined</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <Person name={m.name} meta={m.email} />
                        </td>
                        <td>
                          <Badge tone={ROLE_TONES[m.role] || 'gray'}>
                            <ShieldCheck size={12} /> {state.roles[m.role]?.label}
                          </Badge>
                        </td>
                        <td className="text-sm">
                          {m.designation}
                          {m.room && <div className="text-xs muted">{m.room}</div>}
                        </td>
                        <td className="nowrap text-sm">{m.phone}</td>
                        <td className="nowrap text-sm muted">{formatDate(m.joinedAt)}</td>
                        <td>
                          <div className="flex items-center gap-8">
                            <Switch checked={m.status === 'active'} onChange={() => requestToggle(m)} />
                            <span className={m.status === 'active' ? 'text-green text-sm fw-600' : 'muted text-sm'}>{m.status === 'active' ? 'Active' : 'Inactive'}</span>
                          </div>
                        </td>
                        <td className="text-right">
                          <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setForm({ open: true, member: m })}>
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <>
            <CardHeader title="Role permissions" subtitle="Staff only see the modules and actions their role allows." plain />
            <div className="role-cards">
              {Object.values(state.roles).map((r) => (
                <div key={r.id} className="role-card">
                  <Badge tone={ROLE_TONES[r.id] || 'gray'}>
                    <ShieldCheck size={12} /> {r.label}
                  </Badge>
                  <p className="text-sm muted mt-8">{r.description}</p>
                  <div className="text-xs mt-8">
                    <strong>{r.permissions.length}</strong> permissions · <strong>{state.staff.filter((s) => s.role === r.id).length}</strong> member(s)
                  </div>
                </div>
              ))}
            </div>
            <PermissionMatrix />
          </>
        )}
      </Card>

      <StaffFormModal open={form.open} member={form.member} onClose={() => setForm({ open: false, member: null })} />
      <ConfirmDialog
        open={!!toggle}
        onClose={() => setToggle(null)}
        title={toggle?.status === 'active' ? 'Deactivate account?' : 'Activate account?'}
        message={
          toggle?.status === 'active'
            ? `${toggle?.name} will no longer be able to sign in. Their records are kept.`
            : `${toggle?.name} will be able to sign in again with their existing credentials.`
        }
        confirmLabel={toggle?.status === 'active' ? 'Deactivate' : 'Activate'}
        tone={toggle?.status === 'active' ? 'danger' : 'primary'}
        onConfirm={() => {
          api.setStaffStatus(toggle.id, toggle.status === 'active' ? 'inactive' : 'active', user.id);
          toast.success(toggle.status === 'active' ? 'Account deactivated' : 'Account activated', toggle.name);
        }}
      />
    </>
  );
}
