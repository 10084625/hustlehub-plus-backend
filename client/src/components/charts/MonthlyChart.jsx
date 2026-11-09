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
}