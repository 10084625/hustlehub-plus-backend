import { formatMonthShort, formatRand, formatRandShort } from '../../utils/format';

/**
 * Stacked monthly bar chart for the tax year (March to February).
 * Each bar is split into take-home pay, estimated tax and the platform fee,
 * so a freelancer can see at a glance where each month's money goes.
 *
 * Drawn as plain SVG by React: no chart library, no inline scripts or
 * injected style tags, so it works under the app's strict CSP. Every bar has
 * a native tooltip (<title>) and the same numbers are in a hidden table for
 * screen readers.
 */
const SERIES = [
  { key: 'takeHome', label: 'Take-home', className: 'seg-takehome' },
  { key: 'estimatedTax', label: 'Estimated tax', className: 'seg-tax' },
  { key: 'platformFees', label: 'Platform fee', className: 'seg-fee' },
];

const W = 720;
const H = 260;
const PAD = { top: 16, right: 12, bottom: 34, left: 64 };

/** Rounds the axis maximum up to a tidy number (1, 2, 2.5 or 5 x 10^n). */
export const niceMax = (value) => {
  if (!value || value <= 0) return 1000;
  const exp = 10 ** Math.floor(Math.log10(value));
  const steps = [1, 2, 2.5, 5, 10];
  const step = steps.find((s) => s * exp >= value);
  return step * exp;
};

export default function MonthlyChart({ months, currentMonth }) {
  const totals = months.map((m) => m.takeHome + m.estimatedTax + m.platformFees);
  const max = niceMax(Math.max(...totals, 0));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / months.length;
  const barW = Math.min(36, slot * 0.62);
  const y = (v) => PAD.top + innerH - (v / max) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const hasData = totals.some((t) => t > 0);

  return (
    <figure className="chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="chart-svg"
        role="img"
        aria-labelledby="monthly-chart-title"
        preserveAspectRatio="xMidYMid meet"
      >
        <title id="monthly-chart-title">Earnings per month this tax year, split into take-home pay, estimated tax and platform fees</title>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="chart-grid" />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className="chart-axis">
              {formatRandShort(t)}
            </text>
          </g>
        ))}
        {months.map((m, i) => {
          const x = PAD.left + i * slot + (slot - barW) / 2;
          let base = 0;
          return (
            <g key={m.month} data-testid={`bar-${m.month}`}>
              {SERIES.map((s) => {
                const v = m[s.key];
                if (!v) return null;
                const rect = (
                  <rect
                    key={s.key}
                    x={x}
                    width={barW}
                    y={y(base + v)}
                    height={Math.max(1, y(base) - y(base + v))}
                    className={s.className}
                    rx="2"
                  >
                    <title>{`${formatMonthShort(m.month)}: ${s.label} ${formatRand(v)}`}</title>
                  </rect>
                );
                base += v;
                return rect;
              })}
              <text
                x={x + barW / 2}
                y={H - 12}
                textAnchor="middle"
                className={`chart-axis${m.month === currentMonth ? ' chart-axis-current' : ''}`}
              >
                {formatMonthShort(m.month)}
              </text>
            </g>
          );
        })}
        {!hasData && (
          <text x={W / 2} y={H / 2} textAnchor="middle" className="chart-empty">
            No bookings yet this tax year
          </text>
        )}
      </svg>
      <figcaption className="chart-legend">
        {SERIES.map((s) => (
          <span key={s.key}>
            <span className={`swatch ${s.className}`} aria-hidden="true" />
            {s.label}
          </span>
        ))}
      </figcaption>
      <table className="visually-hidden">
        <caption>Monthly earnings this tax year</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            {SERIES.map((s) => (
              <th scope="col" key={s.key}>
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {months.map((m) => (
            <tr key={m.month}>
              <th scope="row">{m.month}</th>
              {SERIES.map((s) => (
                <td key={s.key}>{formatRand(m[s.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
