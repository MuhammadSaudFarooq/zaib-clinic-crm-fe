import { Fragment } from 'react';
import { Form, Formik } from 'formik';
import { Lock, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import Button from '@/components/ui/Button';
import { DEFAULT_ROLES, PERMISSION_GROUPS } from '@/data/constants';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';

/** Role × permission matrix (Admin is always full access). */
export default function PermissionMatrix() {
  const { state, api } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const roles = Object.values(state.roles);
  const initialValues = Object.fromEntries(roles.map((r) => [r.id, [...r.permissions]]));

  return (
    <Formik
      enableReinitialize
      initialValues={initialValues}
      onSubmit={(values, { resetForm }) => {
        roles.filter((r) => !r.locked).forEach((r) => {
          const before = [...r.permissions].sort().join();
          const after = [...values[r.id]].sort().join();
          if (before !== after) api.updateRolePermissions(r.id, values[r.id], user.id);
        });
        toast.success('Permissions saved', 'Staff will see the updated modules immediately.');
        resetForm({ values });
      }}
    >
      {({ values, setFieldValue, dirty, resetForm }) => (
        <Form>
          <div className="table-wrap">
            <table className="table perm-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 240 }}>Module / permission</th>
                  {roles.map((r) => (
                    <th key={r.id} className="text-center" style={{ minWidth: 112 }}>
                      <div className="flex items-center gap-4" style={{ justifyContent: 'center' }}>
                        {r.locked ? <Lock size={12} /> : <ShieldCheck size={12} />}
                        {r.label}
                      </div>
                      <div className="text-xs muted" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>
                        {state.staff.filter((s) => s.role === r.id).length} member(s)
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSION_GROUPS.map((g) => (
                  <Fragment key={g.module}>
                    <tr className="perm-table__group">
                      <td colSpan={roles.length + 1}>{g.module}</td>
                    </tr>
                    {g.items.map((p) => (
                      <tr key={p.key}>
                        <td>
                          <div className="fw-600 text-sm">{p.label}</div>
                          <div className="text-xs muted mono">{p.key}</div>
                        </td>
                        {roles.map((r) => {
                          const checked = values[r.id]?.includes(p.key);
                          return (
                            <td key={r.id} className="text-center">
                              <input
                                type="checkbox"
                                className="big-check"
                                checked={!!checked}
                                disabled={r.locked}
                                aria-label={`${r.label}: ${p.label}`}
                                onChange={(e) => {
                                  const list = values[r.id] || [];
                                  setFieldValue(r.id, e.target.checked ? [...list, p.key] : list.filter((x) => x !== p.key));
                                }}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card__footer">
            <span className="grow text-sm muted">Administrator always has full access and cannot be restricted.</span>
            <Button
              variant="ghost"
              icon={RotateCcw}
              onClick={() => {
                const defaults = Object.fromEntries(roles.map((r) => [r.id, [...(DEFAULT_ROLES[r.id]?.permissions || r.permissions)]]));
                resetForm({ values: initialValues });
                Object.entries(defaults).forEach(([k, v]) => setFieldValue(k, v));
              }}
            >
              Restore defaults
            </Button>
            <Button variant="secondary" disabled={!dirty} onClick={() => resetForm()}>
              Discard
            </Button>
            <Button type="submit" icon={Save} disabled={!dirty}>
              Save permissions
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
}
