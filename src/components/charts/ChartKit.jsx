/**
 * Shared chart styling for Recharts.
 * Series colours follow a validated, colour-blind-safe categorical order
 * (teal, orange, blue, amber, pink, violet) — assigned in fixed order.
 */

export const SERIES = ['#0a9396', '#eb6834', '#2a78d6', '#eda100', '#e87ba4', '#6250d6'];
export const SINGLE = '#0a9396';

export const axisProps = {
  tick: { fill: '#8a9ca3', fontSize: 11.5 },
  axisLine: { stroke: '#d2dcdf' },
  tickLine: false,
};

export const yAxisProps = {
  tick: { fill: '#8a9ca3', fontSize: 11.5 },
  axisLine: false,
  tickLine: false,
  width: 44,
};

export const gridProps = {
  stroke: '#edf1f2',
  vertical: false,
};

export function ChartTooltip({ active, payload, label, formatter, labelFormatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__title">{labelFormatter ? labelFormatter(label, payload) : label}</div>
      {payload.map((p) => (
        <div key={p.dataKey || p.name} className="chart-tooltip__row">
          <span className="chart-tooltip__key">
            <span className="legend__swatch" style={{ background: p.color || p.payload?.fill }} />
            {p.name}
          </span>
          <strong>{formatter ? formatter(p.value, p.name) : p.value}</strong>
        </div>
      ))}
      {payload.length > 1 && (
        <div className="chart-tooltip__row" style={{ borderTop: '1px solid #e4eaec', marginTop: 4, paddingTop: 4 }}>
          <span>Total</span>
          <strong>{formatter ? formatter(payload.reduce((a, p) => a + (Number(p.value) || 0), 0)) : payload.reduce((a, p) => a + (Number(p.value) || 0), 0)}</strong>
        </div>
      )}
    </div>
  );
}

export function ChartLegend({ items }) {
  return (
    <div className="legend">
      {items.map((it) => (
        <span key={it.label} className="legend__item">
          <span className="legend__swatch" style={{ background: it.color }} />
          {it.label}
          {it.value != null && <strong style={{ color: '#0f2a35' }}>{it.value}</strong>}
        </span>
      ))}
    </div>
  );
}
