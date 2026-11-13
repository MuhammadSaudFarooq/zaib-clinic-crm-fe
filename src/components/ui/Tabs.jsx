import { cx } from '@/utils/format';

export default function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cx('tabs', className)} role="tablist">
      {tabs.map((t) => {
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={value === t.id}
            className={cx('tab', value === t.id && 'is-active')}
            onClick={() => onChange(t.id)}
          >
            {Icon && <Icon size={16} />}
            {t.label}
            {t.count != null && <span className="tab__count">{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Segmented({ options, value, onChange, className }) {
  return (
    <div className={cx('segmented', className)} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          className={cx(value === o.id && 'is-active')}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
