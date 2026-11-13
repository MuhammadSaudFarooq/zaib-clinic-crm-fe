import { cx, initials } from '@/utils/format';

const PALETTE = [
  ['#d9f1f0', '#0a4f52'],
  ['#f7eddb', '#7a5a1c'],
  ['#e0ebfd', '#1d4ea3'],
  ['#ede5fd', '#5b21b6'],
  ['#fde4f0', '#9d1c55'],
  ['#dcf5e3', '#166534'],
  ['#ffe6d5', '#9a3412'],
  ['#e2e5fb', '#33378f'],
];

function hash(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export default function Avatar({ name = '', size, className, style }) {
  const [bg, fg] = PALETTE[hash(name) % PALETTE.length];
  return (
    <span className={cx('avatar', size && `avatar--${size}`, className)} style={{ background: bg, color: fg, ...style }} aria-hidden>
      {initials(name) || '?'}
    </span>
  );
}

export function Person({ name, meta, size = 'sm', children }) {
  return (
    <div className="person">
      <Avatar name={name} size={size} />
      <div style={{ minWidth: 0 }}>
        <div className="person__name truncate">{name}</div>
        {meta && <div className="person__meta truncate">{meta}</div>}
        {children}
      </div>
    </div>
  );
}
