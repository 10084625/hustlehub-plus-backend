import { describe, expect, test } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FreelancerDashboard from '../pages/FreelancerDashboard';
import MonthlyChart, { niceMax } from '../components/charts/MonthlyChart';
import MoneySplit from '../components/charts/MoneySplit';
import { render } from '@testing-library/react';
import { mockFetch, renderApp, signInAs } from './helpers';

const months = ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02'];
const byMonth = months.map((m, i) => ({
  month: m,
  bookings: i < 9 ? 1 : 0,
  gross: i === 8 ? 75000 : 0,
  platformFees: i === 8 ? 7500 : 0,
  netIncome: i === 8 ? 67500 : 0,
  estimatedTax: i === 8 ? 6000 : 0,
  takeHome: i === 8 ? 61500 : 0,
}));

const estimate = (overrides = {}) => ({
  currency: 'ZAR',
  ageGroup: 'under65',
  taxTable: { id: '2026/27', description: 'SARS individual income tax rates' },
  taxYear: { label: '2026/27', start: '2026-03-01', end: '2027-02-28', monthsElapsed: 9 },
  bookingsThisTaxYear: 1,
  grossIncomeToDate: 75000,
  platformFeesToDate: 7500,
  taxableIncomeToDate: 67500,
  projectedAnnualIncome: 90000,
  taxBeforeRebate: 16200,
  rebate: 17820,
  projectedAnnualTax: 0,
  effectiveRate: 0,
  marginalRate: 0.18,
  estimatedTaxToDate: 0,
  takeHomeToDate: 67500,
  suggestedMonthlySetAside: 0,
  taxThreshold: 99000,
  belowThreshold: true,
  brackets: [{ from: 0, to: 245100, rate: 0.18, taxableInBand: 90000, taxInBand: 16200 }],
  byMonth,
  provisionalTax: { firstPeriodDue: '2026-08-31', secondPeriodDue: '2027-02-28', nextDue: '2027-02-28' },
  disclaimer: 'Estimate only, not tax advice.',
  integrity: { checked: 1, valid: 1, unsigned: 0, excluded: 0 },
  ...overrides,
});

const summary = { currency: 'ZAR', transactionCount: 1, grossIncome: 75000, platformFees: 7500, netIncome: 67500, averagePerBooking: 67500, byMonth: [{ month: '2026-11', netIncome: 67500, bookings: 1 }], integrity: { excluded: 0 } };

const baseRoutes = (est) => ({
  'GET /gigs/mine': [200, { success: true, data: { gigs: [] } }],
  'GET /income/summary': [200, { success: true, data: summary }],
  'GET /income/tax-estimate': [200, { success: true, data: est }],
});

describe('Part 3: freelancer tax and income dashboard', () => {
  test('shows the tax year, the four headline figures and the below-threshold message', async () => {
    signInAs('freelancer');
    mockFetch(baseRoutes(estimate()));
    renderApp(<FreelancerDashboard />, { route: '/dashboard', path: '/dashboard' });

    expect(await screen.findByRole('heading', { name: /Tax year 2026\/27/ })).toBeInTheDocument();
    expect(screen.getByText('Earned so far')).toBeInTheDocument();
    expect(screen.getByTestId('tax-to-date')).toHaveTextContent('R 0,00');
    expect(screen.getByText(/below the R\s?99\s?000,00 tax threshold/)).toBeInTheDocument();
  });

  test('explains the method step by step with the bracket table', async () => {
    signInAs('freelancer');
    mockFetch(baseRoutes(estimate({ belowThreshold: false, projectedAnnualTax: 18297, estimatedTaxToDate: 13722.75, effectiveRate: 0.0927 })));
    renderApp(<FreelancerDashboard />, { route: '/dashboard', path: '/dashboard' });

    expect(await screen.findByText('How this estimate is worked out')).toBeInTheDocument();
    expect(screen.getByText(/Scaled up to a full year/)).toHaveTextContent('9 months × 12');
    expect(screen.getByText(/Minus the rebate/)).toBeInTheDocument();
    expect(screen.getByText(/Effective rate 9.3%/)).toBeInTheDocument();
    const table = screen.getByRole('table', { name: /band by band/ });
    expect(within(table).getByText('18%')).toBeInTheDocument();
  });

  test('changing the age group asks the API again with the new age group', async () => {
    signInAs('freelancer');
    const fetchMock = mockFetch(baseRoutes(estimate()));
    renderApp(<FreelancerDashboard />, { route: '/dashboard', path: '/dashboard' });

    await userEvent.click(await screen.findByLabelText('65 to 74'));
    const urls = fetchMock.mock.calls.map(([url]) => url);
    expect(urls).toContain('/api/income/tax-estimate?ageGroup=65to74');
    expect(screen.getByLabelText('65 to 74')).toBeChecked();
  });

  test('warns the freelancer when a record failed the integrity check', async () => {
    signInAs('freelancer');
    mockFetch(baseRoutes(estimate({ integrity: { checked: 2, valid: 1, unsigned: 0, excluded: 1 } })));
    renderApp(<FreelancerDashboard />, { route: '/dashboard', path: '/dashboard' });
    expect(await screen.findByText(/failed an integrity check/)).toBeInTheDocument();
  });

  test('an API error is shown safely instead of the panel', async () => {
    signInAs('freelancer');
    mockFetch({ ...baseRoutes(estimate()), 'GET /income/tax-estimate': [500, { success: false, message: 'MongoServerError: boom' }] });
    renderApp(<FreelancerDashboard />, { route: '/dashboard', path: '/dashboard' });
    expect(await screen.findByText(/Something went wrong on our side/)).toBeInTheDocument();
    expect(screen.queryByText(/MongoServerError/)).toBeNull();
  });
});

describe('Part 3: charts', () => {
  test('monthly chart draws all 12 months with an accessible data table', () => {
    render(<MonthlyChart months={byMonth} currentMonth="2026-11" />);
    expect(screen.getByRole('img', { name: /Earnings per month/ })).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(13); // header + 12 months
    // Each bar segment has a native tooltip with the exact amount
    const tooltip = screen.getByText((text, el) => el.tagName.toLowerCase() === 'title' && /^Nov: Take-home R\s?61\s?500,00$/.test(text));
    expect(tooltip).toBeInTheDocument();
  });

  test('monthly chart shows an empty message when there is no income', () => {
    render(<MonthlyChart months={byMonth.map((m) => ({ ...m, takeHome: 0, estimatedTax: 0, platformFees: 0 }))} />);
    expect(screen.getByText('No bookings yet this tax year')).toBeInTheDocument();
  });

  test('axis maximum is rounded up to a tidy number', () => {
    expect(niceMax(61500 + 6000 + 7500)).toBe(100000);
    expect(niceMax(26280)).toBe(50000);
    expect(niceMax(0)).toBe(1000);
  });

  test('money split shows each share as a percentage of what clients paid', () => {
    render(<MoneySplit takeHome={800} tax={100} fees={100} />);
    expect(screen.getByRole('img', { name: /Of R\s?1\s?000,00 paid by clients/ })).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getAllByText('10%')).toHaveLength(2);
  });
});
