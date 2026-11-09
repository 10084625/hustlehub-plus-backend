const rand = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 });
const day = new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
const monthFmt = new Intl.DateTimeFormat('en-ZA', { month: 'short', year: 'numeric' });

export const formatRand = (n) => rand.format(Number(n) || 0);
export const formatDate = (iso) => (iso ? day.format(new Date(iso)) : '');
export const formatMonth = (yyyyMm) => monthFmt.format(new Date(`${yyyyMm}-01T00:00:00`));

export const CATEGORIES = [
  { value: 'design', label: 'Design' },
  { value: 'development', label: 'Development' },
  { value: 'writing', label: 'Writing' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'video', label: 'Video' },
  { value: 'music', label: 'Music' },
  { value: 'tutoring', label: 'Tutoring' },
  { value: 'admin-support', label: 'Admin support' },
  { value: 'other', label: 'Other' },
];
export const categoryLabel = (v) => CATEGORIES.find((c) => c.value === v)?.label ?? v;


const rand0 = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 });
const dateTime = new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Whole rand, for chart axes and big headline numbers. */
export const formatRandShort = (n) => rand0.format(Number(n) || 0);
/** 0.1393 -> "13.9%" */
export const formatPercent = (rate, digits = 1) => `${((Number(rate) || 0) * 100).toFixed(digits)}%`;
export const formatDateTime = (iso) => (iso ? dateTime.format(new Date(iso)) : '');
/** "2026-09" -> "Sep" */
export const formatMonthShort = (yyyyMm) =>
  new Intl.DateTimeFormat('en-ZA', { month: 'short' }).format(new Date(`${yyyyMm}-01T00:00:00`));
