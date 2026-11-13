import { PAYMENT_STATUS, VISIT_STATUS } from '@/data/constants';
import { cx } from '@/utils/format';

export default function Badge({ tone = 'gray', dot = false, live = false, className, children }) {
  return (
    <span className={cx('badge', `badge--${tone}`, live && 'badge--live', className)}>
      {(dot || live) && <span className="badge__dot" />}
      {children}
    </span>
  );
}

export function VisitStatusBadge({ status }) {
  const s = VISIT_STATUS[status] || VISIT_STATUS.waiting;
  return (
    <Badge tone={s.tone} dot live={status === 'in_consultation'}>
      {s.label}
    </Badge>
  );
}

export function PaymentBadge({ status }) {
  const s = PAYMENT_STATUS[status] || PAYMENT_STATUS.unpaid;
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}
