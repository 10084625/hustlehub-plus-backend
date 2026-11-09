import { formatPercent, formatRand, formatRandShort } from '../../utils/format';

/**
 * Donut chart: how every rand clients paid this tax year is split between
 * the freelancer's take-home pay, estimated tax and the platform fee.
 * Pure SVG (stroke-dasharray on circles), so it is CSP-safe.
 */
const PARTS = [
  { key: 'takeHome', label: 'Take-home', className: 'seg-takehome' },
  { key: 'tax', label: 'Estimated tax', className: 'seg-tax' },
  { key: 'fees', label: 'Platform fee', className: 'seg-fee' },
];

const R = 54;
const C = 2 * Math.PI * R;

export default function MoneySplit({ takeHome, tax, fees }) {
  const values = { takeHome, tax, fees };
  const total = takeHome + tax + fees;
  let offset = 0;

  return (
    <figure className="split">
      <svg viewBox="0 0 140 140" className="split-svg" role="img" aria-labelledby="split-title">
        <title id="split-title">{`Of ${formatRand(total)} paid by clients this tax year: take-home ${formatRand(takeHome)}, estimated tax ${formatRand(tax)}, platform fees ${formatRand(fees)}`}</title>
        <circle cx="70" cy="70" r={R} className="split-track" />
        {total > 0 &&
          PARTS.map((p) => {
            const len = (values[p.key] / total) * C;
            const seg = (
              <circle
                key={p.key}
                cx="70"
                cy="70"
                r={R}
                className={`split-seg ${p.className}`}
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 70 70)"
              />
            );
            offset += len;
            return seg;
          })}
        <text x="70" y="66" textAnchor="middle" className="split-total">
          {formatRandShort(total)}
        </text>
        <text x="70" y="84" textAnchor="middle" className="split-caption">
          paid by clients
        </text>
      </svg>
      <figcaption>
        <ul className="split-legend">
          {PARTS.map((p) => (
            <li key={p.key}>
              <span className={`swatch ${p.className}`} aria-hidden="true" />
              <span>{p.label}</span>
              <span className="mono-num">{formatRand(values[p.key])}</span>
              <span className="split-pct mono-num">{total > 0 ? formatPercent(values[p.key] / total, 0) : '0%'}</span>
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
