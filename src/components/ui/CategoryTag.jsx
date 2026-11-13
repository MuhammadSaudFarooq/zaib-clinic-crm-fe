import { Ban, CalendarClock, Clock, HeartHandshake, Moon, Percent, Repeat, Sun, User } from 'lucide-react';
import { CATEGORIES } from '@/data/constants';
import { cx } from '@/utils/format';

const ICONS = {
  user: User,
  heart: HeartHandshake,
  repeat: Repeat,
  clock: Clock,
  calendar: CalendarClock,
  percent: Percent,
  ban: Ban,
  sun: Sun,
  moon: Moon,
};

export function CategoryIcon({ id, size = 13 }) {
  const c = CATEGORIES[id];
  const Icon = ICONS[c?.icon] || User;
  return <Icon size={size} />;
}

/** Colour-coded patient category / visit tag (colour + icon + label, never colour alone). */
export default function CategoryTag({ id, size, short = false, className }) {
  const c = CATEGORIES[id];
  if (!c) return null;
  const Icon = ICONS[c.icon] || User;
  const iconSize = size === 'lg' ? 15 : size === 'sm' ? 11 : 13;
  return (
    <span
      className={cx('tag', size && `tag--${size}`, className)}
      style={{ background: c.bg, color: c.fg, borderColor: `${c.dot}33` }}
      title={c.label}
    >
      <Icon size={iconSize} strokeWidth={2.4} />
      {short ? c.short : c.label}
    </span>
  );
}

export function TagList({ ids = [], size, short }) {
  const unique = [...new Set(ids.filter(Boolean))];
  return (
    <span className="tag-list">
      {unique.map((id) => (
        <CategoryTag key={id} id={id} size={size} short={short} />
      ))}
    </span>
  );
}
