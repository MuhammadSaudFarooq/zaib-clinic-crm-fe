import { useData } from '@/context/DataContext';

/**
 * Zaib Clinic logo.
 * Mark: a soft rounded emblem with a medical cross (healthcare & trust)
 * cradled by a warm gold arc (care & hospitality).
 *
 * tone:  "dark"  → for light backgrounds (default)
 *        "light" → for dark backgrounds (sidebar)
 *        "mono"  → pure black, for thermal printers
 */
export function LogoMark({ size = 40, tone = 'dark', title = 'Zaib Clinic' }) {
  const mono = tone === 'mono';
  const plate = mono ? '#000' : '#0b6e70';
  const arc = mono ? '#000' : '#e0b25b';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={title}>
      {mono ? (
        <rect x="3" y="3" width="58" height="58" rx="17" fill="none" stroke={plate} strokeWidth="4" />
      ) : (
        <rect x="2" y="2" width="60" height="60" rx="18" fill={plate} />
      )}
      <rect x="27" y="12" width="10" height="31" rx="3.2" fill={mono ? '#000' : '#fff'} />
      <rect x="16.5" y="22.5" width="31" height="10" rx="3.2" fill={mono ? '#000' : '#fff'} />
      <path
        d="M15 40c5.5 12.5 28.5 12.5 34 0"
        fill="none"
        stroke={arc}
        strokeWidth="4.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Logo({ size = 40, tone = 'dark', variant = 'full', tagline = true, className = '' }) {
  const { state } = useData();
  const custom = state.settings.logo;
  const name = state.settings.clinic.name || 'Zaib Clinic';
  const [first, ...rest] = name.split(' ');

  const mark = custom ? (
    <img
      src={custom}
      alt={name}
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        borderRadius: size * 0.22,
        filter: tone === 'mono' ? 'grayscale(1) contrast(1.4)' : undefined,
      }}
    />
  ) : (
    <LogoMark size={size} tone={tone} title={name} />
  );

  if (variant === 'mark') return <span className={className}>{mark}</span>;

  const colors = {
    dark: { name: '#0f2a35', accent: '#0b6e70', tag: '#8e6a24' },
    light: { name: '#ffffff', accent: '#e0b25b', tag: '#7fa7ab' },
    mono: { name: '#000', accent: '#000', tag: '#000' },
  }[tone];

  return (
    <span className={`logo ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.3 }}>
      {mark}
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
        <span
          style={{
            fontWeight: 800,
            fontSize: size * 0.48,
            letterSpacing: '-0.02em',
            color: colors.name,
            whiteSpace: 'nowrap',
          }}
        >
          {first} <span style={{ fontWeight: 500, color: colors.accent }}>{rest.join(' ')}</span>
        </span>
        {tagline && (
          <span
            style={{
              fontSize: Math.max(8.5, size * 0.2),
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: colors.tag,
              marginTop: size * 0.08,
              whiteSpace: 'nowrap',
            }}
          >
            {state.settings.clinic.tagline || 'Care · Trust · Hospitality'}
          </span>
        )}
      </span>
    </span>
  );
}
