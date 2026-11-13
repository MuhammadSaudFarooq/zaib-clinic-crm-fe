import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cx } from '@/utils/format';

export default function StatCard({ label, value, icon: Icon, tone = 'brand', trend, foot, to, delay = 0 }) {
  const body = (
    <>
      <div className="stat-card__top">
        <span className="stat-card__label">{label}</span>
        {Icon && (
          <span className={cx('stat-card__icon', `tone-${tone}`)}>
            <Icon size={19} />
          </span>
        )}
      </div>
      <div className="stat-card__value">{value}</div>
      <div className="stat-card__foot">
        {typeof trend === 'number' && (
          <span className={cx('trend', trend >= 0 ? 'trend--up' : 'trend--down')}>
            {trend >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(trend)}%
          </span>
        )}
        {foot}
      </div>
    </>
  );
  const style = { animation: `fade-up 0.45s var(--ease) ${delay}ms both` };
  if (to) {
    return (
      <Link to={to} className="card stat-card" style={{ ...style, color: 'inherit' }}>
        {body}
      </Link>
    );
  }
  return (
    <div className="card stat-card" style={style}>
      {body}
    </div>
  );
}
