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