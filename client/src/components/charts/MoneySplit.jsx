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
}