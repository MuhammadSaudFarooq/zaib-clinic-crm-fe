/* Formatting & date helpers (all local-time based). */

const pad = (n) => String(n).padStart(2, '0');

export const cx = (...classes) => classes.filter(Boolean).join(' ');

export function formatCurrency(value, currency = 'Rs.') {
  const n = Number(value) || 0;
  const sign = n < 0 ? '-' : '';
  return `${sign}${currency} ${Math.abs(Math.round(n)).toLocaleString('en-US')}`;
}

export function formatNumber(value) {
  return (Number(value) || 0).toLocaleString('en-US');
}

/** Compact number, e.g. 125400 -> "125.4k" */
export function formatCompact(value) {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

/** Local date key: YYYY-MM-DD */
export function dateKey(input = new Date()) {
  const d = input instanceof Date ? input : new Date(input);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const todayKey = () => dateKey(new Date());

/** Parse a YYYY-MM-DD key into a local Date at 00:00 */
export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function daysBetween(a, b) {
  const da = parseKey(dateKey(a));
  const db = parseKey(dateKey(b));
  return Math.round((db - da) / 86_400_000);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatDate(input, { withDay = false } = {}) {
  if (!input) return '—';
  const d = typeof input === 'string' && input.length === 10 ? parseKey(input) : new Date(input);
  if (Number.isNaN(d.getTime())) return '—';
  const base = `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  return withDay ? `${DAYS[d.getDay()]}, ${base}` : base;
}

export function formatShortDate(input) {
  const d = typeof input === 'string' && input.length === 10 ? parseKey(input) : new Date(input);
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]}`;
}

export function formatMonth(input) {
  const d = typeof input === 'string' && input.length === 7 ? parseKey(`${input}-01`) : new Date(input);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatTime(input) {
  if (!input) return '—';
  const d = new Date(input);
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${pad(h)}:${pad(d.getMinutes())} ${ampm}`;
}

export function formatDateTime(input) {
  if (!input) return '—';
  return `${formatDate(input)}, ${formatTime(input)}`;
}

export function relativeTime(input) {
  const diff = Date.now() - new Date(input).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  return formatDate(input);
}

/** Minutes elapsed since a timestamp */
export function minutesSince(input) {
  return Math.max(0, Math.round((Date.now() - new Date(input).getTime()) / 60_000));
}

export function formatDuration(mins) {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function initials(name = '') {
  const clean = name.replace(/^(dr\.?|mr\.?|mrs\.?|ms\.?)\s+/i, '');
  return clean
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

export function sessionFor(input) {
  const h = new Date(input).getHours();
  return h < 15 ? 'morning' : 'evening';
}

export function padToken(n) {
  return String(n).padStart(3, '0');
}

export function sum(list, fn = (x) => x) {
  return list.reduce((acc, item) => acc + (Number(fn(item)) || 0), 0);
}

export function groupBy(list, fn) {
  return list.reduce((acc, item) => {
    const k = fn(item);
    (acc[k] ||= []).push(item);
    return acc;
  }, {});
}

export function ageLabel(age) {
  return age === '' || age == null ? '—' : `${age} yrs`;
}

/** Download a string as a file (used for CSV export). */
export function downloadFile(filename, content, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

export function toCSV(rows, columns) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = columns.map((c) => esc(c.label)).join(',');
  const body = rows.map((r) => columns.map((c) => esc(c.value(r))).join(',')).join('\n');
  return `${head}\n${body}`;
}
