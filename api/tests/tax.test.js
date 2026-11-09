const {
  TAX_TABLE,
  rebateFor,
  taxThreshold,
  bracketTax,
  annualTax,
  taxYearFor,
  provisionalDates,
  estimateTax,
} = require('../src/utils/taxCalculator');

const tx = (iso, gross) => ({
  createdAt: new Date(iso),
  amount: gross,
  platformFee: Math.round(gross * 0.1 * 100) / 100,
  freelancerEarnings: Math.round(gross * 0.9 * 100) / 100,
});

describe('SARS brackets and rebates (Part 3 tax estimation)', () => {
  test('table is the 2026/27 SARS table', () => {
    expect(TAX_TABLE.id).toBe('2026/27');
    expect(TAX_TABLE.brackets[0]).toEqual({ upTo: 245100, rate: 0.18 });
  });

  test('bracket tax matches the published SARS "base amount + rate" figures', () => {
    // SARS publishes e.g. "383 101 - 530 200: 79 998 + 31% of taxable income above 383 100"
    expect(bracketTax(245100).taxBeforeRebate).toBe(44118);
    expect(bracketTax(383100).taxBeforeRebate).toBe(79998);
    expect(bracketTax(530200).taxBeforeRebate).toBe(125599);
    expect(bracketTax(695800).taxBeforeRebate).toBe(185215);
    expect(bracketTax(887000).taxBeforeRebate).toBe(259783);
    expect(bracketTax(1878600).taxBeforeRebate).toBe(666339);
    expect(bracketTax(2000000).taxBeforeRebate).toBe(666339 + 121400 * 0.45);
  });

  test('rebates add up by age group', () => {
    expect(rebateFor('under65')).toBe(17820);
    expect(rebateFor('65to74')).toBe(17820 + 9765);
    expect(rebateFor('75plus')).toBe(17820 + 9765 + 3249);
  });

  test('tax thresholds match SARS (R99 000, R153 250, R171 300)', () => {
    expect(taxThreshold('under65')).toBe(99000);
    expect(taxThreshold('65to74')).toBe(153250);
    expect(taxThreshold('75plus')).toBe(171300);
  });

  test('income under the threshold pays no tax, never negative', () => {
    expect(annualTax(50000)).toBe(0);
    expect(annualTax(99000)).toBe(0);
    expect(annualTax(0)).toBe(0);
  });

  test('worked example: R300 000 a year, under 65', () => {
    // 44 118 + 26% x (300 000 - 245 100) = 58 392, minus 17 820 rebate = 40 572
    expect(annualTax(300000)).toBe(40572);
  });

  test('band breakdown adds up to the total', () => {
    const { bands, taxBeforeRebate, marginalRate } = bracketTax(600000);
    const sum = bands.reduce((s, b) => s + b.taxInBand, 0);
    expect(sum).toBeCloseTo(taxBeforeRebate, 2);
    expect(marginalRate).toBe(0.36);
    expect(bands).toHaveLength(4);
  });
});

describe('South African tax year', () => {
  test('November 2026 falls in 2026/27, 9 months elapsed', () => {
    const y = taxYearFor(new Date('2026-11-04T10:00:00Z'));
    expect(y.label).toBe('2026/27');
    expect(y.start.toISOString().slice(0, 10)).toBe('2026-03-01');
    expect(y.end.toISOString().slice(0, 10)).toBe('2027-02-28');
    expect(y.monthsElapsed).toBe(9);
  });

  test('February belongs to the year that started the previous March (leap year end)', () => {
    const y = taxYearFor(new Date('2028-02-10T00:00:00Z'));
    expect(y.label).toBe('2027/28');
    expect(y.end.toISOString().slice(0, 10)).toBe('2028-02-29');
    expect(y.monthsElapsed).toBe(12);
  });

  test('provisional tax dates are 31 August and the end of February', () => {
    const y = taxYearFor(new Date('2026-11-04T00:00:00Z'));
    const p = provisionalDates(y, new Date('2026-11-04T00:00:00Z'));
    expect(p).toEqual({ firstPeriodDue: '2026-08-31', secondPeriodDue: '2027-02-28', nextDue: '2027-02-28' });
  });
});

describe('estimateTax (dashboard figures)', () => {
  const now = new Date('2026-11-04T10:00:00Z'); // 9 months into 2026/27

  test('annualises earnings, applies brackets and rebate, then the effective rate', () => {
    const txs = [tx('2026-09-15T08:00:00Z', 100000), tx('2026-10-20T08:00:00Z', 100000), tx('2026-11-01T08:00:00Z', 50000)];
    const e = estimateTax(txs, { now });
    // net to date = 90 000 + 90 000 + 45 000 = 225 000
    expect(e.taxableIncomeToDate).toBe(225000);
    // annualised = 225 000 / 9 x 12 = 300 000
    expect(e.projectedAnnualIncome).toBe(300000);
    expect(e.projectedAnnualTax).toBe(40572);
    expect(e.effectiveRate).toBeCloseTo(40572 / 300000, 4);
    // tax on earnings so far = 225 000 x effective rate
    expect(e.estimatedTaxToDate).toBeCloseTo(225000 * (40572 / 300000), 1);
    expect(e.suggestedMonthlySetAside).toBeCloseTo(40572 / 12, 2);
    expect(e.marginalRate).toBe(0.26);
    expect(e.belowThreshold).toBe(false);
  });

  test('ignores transactions from an earlier tax year', () => {
    const e = estimateTax([tx('2026-02-27T08:00:00Z', 500000), tx('2026-03-02T08:00:00Z', 1000)], { now });
    expect(e.bookingsThisTaxYear).toBe(1);
    expect(e.taxableIncomeToDate).toBe(900);
  });

  test('small earnings stay below the threshold with zero tax', () => {
    const e = estimateTax([tx('2026-10-01T08:00:00Z', 900)], { now });
    expect(e.estimatedTaxToDate).toBe(0);
    expect(e.belowThreshold).toBe(true);
    expect(e.taxThreshold).toBe(99000);
  });

  test('older freelancers get a bigger rebate', () => {
    const txs = [tx('2026-10-01T08:00:00Z', 150000)];
    const young = estimateTax(txs, { now });
    const older = estimateTax(txs, { now, ageGroup: '65to74' });
    expect(older.projectedAnnualTax).toBeLessThan(young.projectedAnnualTax);
    expect(older.rebate - young.rebate).toBe(9765);
  });

  test('monthly breakdown covers all 12 months, March first, and adds up', () => {
    const txs = [tx('2026-09-15T08:00:00Z', 100000), tx('2026-11-01T08:00:00Z', 50000)];
    const e = estimateTax(txs, { now });
    expect(e.byMonth).toHaveLength(12);
    expect(e.byMonth[0].month).toBe('2026-03');
    expect(e.byMonth[11].month).toBe('2027-02');
    const sep = e.byMonth.find((m) => m.month === '2026-09');
    expect(sep.netIncome).toBe(90000);
    expect(sep.takeHome + sep.estimatedTax).toBeCloseTo(sep.netIncome, 2);
    const taxSum = e.byMonth.reduce((s, m) => s + m.estimatedTax, 0);
    expect(taxSum).toBeCloseTo(e.estimatedTaxToDate, 0);
  });

  test('no transactions gives a clean zero estimate', () => {
    const e = estimateTax([], { now });
    expect(e.taxableIncomeToDate).toBe(0);
    expect(e.projectedAnnualTax).toBe(0);
    expect(e.effectiveRate).toBe(0);
    expect(e.marginalRate).toBe(0);
  });
});
