import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function PageHeader({ title, subtitle, crumbs, actions, children }) {
  return (
    <div className="page-header">
      <div style={{ minWidth: 0 }}>
        {crumbs && (
          <nav className="page-header__crumbs" aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
              <Fragment key={c.label}>
                {i > 0 && <ChevronRight size={13} />}
                {c.to ? <Link to={c.to}>{c.label}</Link> : <span>{c.label}</span>}
              </Fragment>
            ))}
          </nav>
        )}
        <h1>{title}</h1>
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </div>
  );
}
