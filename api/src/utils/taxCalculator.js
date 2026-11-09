// References: [18] SARS, "Rates of Tax for Individuals", [19] SARS,
// "Provisional tax". README section 22 (References) and section 4.4 (the tax logic).

/**
 * Tax estimation for freelancers (Part 3).
 *
 * In South Africa, a freelancer is taxed as an individual on their taxable
 * income for the "year of assessment", which runs from 1 March to the end of
 * February. Freelancers usually pay provisional tax twice a year, so knowing
 * roughly how much to put aside matters.
 *
 * HOW THE ESTIMATE IS WORKED OUT
 *   1. Taxable income so far = the freelancer's net earnings (after the 10%
 *      platform fee) from transactions dated in the current tax year. The
 *      platform fee is treated as a business expense.
 *   2. Annualise: earnings so far / months elapsed in the tax year x 12.
 *      Tax brackets are yearly, so a part-year figure must be scaled to a
 *      full year first, otherwise the rate would be far too low. This is the
 *      same idea SARS uses for provisional tax estimates.
 *   3. Apply the progressive brackets to the annual figure.
 *   4. Subtract the rebate for the person's age group (primary rebate for
 *      everyone, plus secondary from 65 and tertiary from 75). Tax cannot go
 *      below zero, which is why income under the tax threshold pays nothing.
 *   5. Effective rate = annual tax / annual income.
 *   6. Estimated tax on earnings so far = earnings so far x effective rate.
 *   7. Suggested monthly set-aside = annual tax / 12.
 *
 * LIMITS (also shown in the app): this is an estimate, not tax advice. It
 * ignores other income (such as a salary), deductions (retirement annuity,
 * home office), medical tax credits and any tax already paid.
 *
 * KEEPING IT UP TO DATE: SARS publishes new tables in the February budget.
 * Update TAX_TABLE below; every calculation and test uses this one object.
 */

const TAX_TABLE = Object.freeze({
  id: '2026/27',
  description: 'SARS individual income tax rates, year of assessment 1 March 2026 to 28 February 2027',
  // Each band: income up to and including `upTo` is taxed at `rate` for the
  // part of income that falls inside the band.
  brackets: Object.freeze([
    { upTo: 245100, rate: 0.18 },
    { upTo: 383100, rate: 0.26 },
    { upTo: 530200, rate: 0.31 },
    { upTo: 695800, rate: 0.36 },
    { upTo: 887000, rate: 0.39 },
    { upTo: 1878600, rate: 0.41 },
    { upTo: Infinity, rate: 0.45 },
  ]),
  rebates: Object.freeze({ primary: 17820, secondary: 9765, tertiary: 3249 }),
});

const AGE_GROUPS = Object.freeze(['under65', '65to74', '75plus']);

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Total rebate for an age group. */
const rebateFor = (ageGroup, table = TAX_TABLE) => {
  const { primary, secondary, tertiary } = table.rebates;
  if (ageGroup === '75plus') return primary + secondary + tertiary;
  if (ageGroup === '65to74') return primary + secondary;
  return primary;
};

/**
 * Income at which tax becomes payable (where bracket tax equals the rebate).
 * Worked out from the table, so it updates itself when the table changes.
 */
const taxThreshold = (ageGroup, table = TAX_TABLE) => {
  let rebate = rebateFor(ageGroup, table);
  let lower = 0;
  for (const band of table.brackets) {
    const bandTax = (band.upTo - lower) * band.rate;
    if (rebate <= bandTax) return Math.ceil(lower + rebate / band.rate);
    rebate -= bandTax;
    lower = band.upTo;
  }
  return Infinity;
};

/**
 * Applies the brackets to an annual income.
 * Returns the tax before rebate, the marginal rate and a band-by-band
 * breakdown (used by the dashboard to show the working).
 */
const bracketTax = (annualIncome, table = TAX_TABLE) => {
  const income = Math.max(0, Number(annualIncome) || 0);
  let lower = 0;
  let total = 0;
  let marginalRate = table.brackets[0].rate;
  const bands = [];

  for (const band of table.brackets) {
    if (income <= lower) break;
    const taxableInBand = Math.min(income, band.upTo) - lower;
    const taxInBand = taxableInBand * band.rate;
    bands.push({
      from: lower,
      to: Number.isFinite(band.upTo) ? band.upTo : null,
      rate: band.rate,
      taxableInBand: round2(taxableInBand),
      taxInBand: round2(taxInBand),
    });
    total += taxInBand;
    marginalRate = band.rate;
    lower = band.upTo;
  }
  return { taxBeforeRebate: round2(total), marginalRate, bands };
};

/** Annual tax payable after the age rebate (never negative). */
const annualTax = (annualIncome, ageGroup = 'under65', table = TAX_TABLE) => {
  const { taxBeforeRebate } = bracketTax(annualIncome, table);
  return round2(Math.max(0, taxBeforeRebate - rebateFor(ageGroup, table)));
};

/**
 * South African tax year containing `date`: 1 March to the last day of
 * February. Returns start/end dates, a label like "2026/27" and how many
 * months of the year have started (1 to 12).
 */
const taxYearFor = (date = new Date()) => {
  const d = new Date(date);
  const startYear = d.getUTCMonth() >= 2 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
  const start = new Date(Date.UTC(startYear, 2, 1));
  const endExclusive = new Date(Date.UTC(startYear + 1, 2, 1));
  const lastDay = new Date(endExclusive.getTime() - 1);
  const monthsElapsed = (d.getUTCFullYear() - startYear) * 12 + (d.getUTCMonth() - 2) + 1;
  return {
    label: `${startYear}/${String((startYear + 1) % 100).padStart(2, '0')}`,
    start,
    endExclusive,
    end: lastDay,
    monthsElapsed: Math.min(12, Math.max(1, monthsElapsed)),
  };
};

/** The 12 months of a tax year as "YYYY-MM" keys, March first. */
const taxYearMonths = (taxYear) =>
  Array.from({ length: 12 }, (_, i) => {
    const m = new Date(Date.UTC(taxYear.start.getUTCFullYear(), 2 + i, 1));
    return m.toISOString().slice(0, 7);
  });

/** Provisional tax due dates for a tax year: end of August and end of February. */
const provisionalDates = (taxYear, now = new Date()) => {
  const first = new Date(Date.UTC(taxYear.start.getUTCFullYear(), 7, 31));
  const second = new Date(Date.UTC(taxYear.end.getUTCFullYear(), taxYear.end.getUTCMonth(), taxYear.end.getUTCDate()));
  const iso = (d) => d.toISOString().slice(0, 10);
  const firstEndOfDay = new Date(first.getTime() + 24 * 60 * 60 * 1000 - 1);
  const next = now <= firstEndOfDay ? first : second;
  return { firstPeriodDue: iso(first), secondPeriodDue: iso(second), nextDue: iso(next) };
};

/**
 * Builds the full estimate shown on the freelancer dashboard.
 *
 * @param {Array<{amount:number, platformFee:number, freelancerEarnings:number, createdAt:Date}>} transactions
 *        the freelancer's transactions (any dates; filtered here)
 * @param {object} options { ageGroup, now }
 */
const estimateTax = (transactions, { ageGroup = 'under65', now = new Date(), table = TAX_TABLE } = {}) => {
  const year = taxYearFor(now);
  const months = taxYearMonths(year);
  const inYear = transactions.filter((t) => {
    const at = new Date(t.createdAt);
    return at >= year.start && at < year.endExclusive && at <= now;
  });

  // Step 1: earnings in this tax year
  const totals = inYear.reduce(
    (acc, t) => {
      acc.gross += t.amount;
      acc.fees += t.platformFee;
      acc.net += t.freelancerEarnings;
      return acc;
    },
    { gross: 0, fees: 0, net: 0 }
  );
  const taxableIncomeToDate = round2(totals.net);

  // Step 2: annualise
  const projectedAnnualIncome = round2((taxableIncomeToDate / year.monthsElapsed) * 12);

  // Steps 3 and 4: brackets, then rebate
  const brackets = bracketTax(projectedAnnualIncome, table);
  const rebate = rebateFor(ageGroup, table);
  const projectedAnnualTax = round2(Math.max(0, brackets.taxBeforeRebate - rebate));

  // Step 5: effective rate
  const effectiveRate = projectedAnnualIncome > 0 ? projectedAnnualTax / projectedAnnualIncome : 0;

  // Step 6: tax on what has been earned so far
  const estimatedTaxToDate = round2(taxableIncomeToDate * effectiveRate);

  // Monthly view: each month's earnings carry the same effective rate.
  const byMonthMap = new Map(months.map((m) => [m, { month: m, gross: 0, platformFees: 0, netIncome: 0, bookings: 0 }]));
  inYear.forEach((t) => {
    const entry = byMonthMap.get(new Date(t.createdAt).toISOString().slice(0, 7));
    if (!entry) return;
    entry.gross += t.amount;
    entry.platformFees += t.platformFee;
    entry.netIncome += t.freelancerEarnings;
    entry.bookings += 1;
  });
  const byMonth = [...byMonthMap.values()].map((m) => {
    const estimatedTax = round2(m.netIncome * effectiveRate);
    return {
      month: m.month,
      bookings: m.bookings,
      gross: round2(m.gross),
      platformFees: round2(m.platformFees),
      netIncome: round2(m.netIncome),
      estimatedTax,
      takeHome: round2(m.netIncome - estimatedTax),
    };
  });

  return {
    currency: 'ZAR',
    ageGroup,
    taxTable: { id: table.id, description: table.description },
    taxYear: {
      label: year.label,
      start: year.start.toISOString().slice(0, 10),
      end: year.end.toISOString().slice(0, 10),
      monthsElapsed: year.monthsElapsed,
    },
    bookingsThisTaxYear: inYear.length,
    grossIncomeToDate: round2(totals.gross),
    platformFeesToDate: round2(totals.fees),
    taxableIncomeToDate,
    projectedAnnualIncome,
    taxBeforeRebate: brackets.taxBeforeRebate,
    rebate,
    projectedAnnualTax,
    effectiveRate: Math.round(effectiveRate * 10000) / 10000,
    marginalRate: projectedAnnualIncome > 0 ? brackets.marginalRate : 0,
    estimatedTaxToDate,
    takeHomeToDate: round2(taxableIncomeToDate - estimatedTaxToDate),
    suggestedMonthlySetAside: round2(projectedAnnualTax / 12),
    taxThreshold: taxThreshold(ageGroup, table),
    belowThreshold: projectedAnnualTax === 0,
    brackets: brackets.bands,
    byMonth,
    provisionalTax: provisionalDates(year, now),
    disclaimer:
      'Estimate only, not tax advice. It assumes HustleHub+ is your only income and ignores deductions, medical credits and tax already paid.',
  };
};

module.exports = {
  TAX_TABLE,
  AGE_GROUPS,
  rebateFor,
  taxThreshold,
  bracketTax,
  annualTax,
  taxYearFor,
  taxYearMonths,
  provisionalDates,
  estimateTax,
};