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
