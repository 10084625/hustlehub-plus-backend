import { useEffect, useState } from 'react';
import { api } from '../api/client';
import Alert from './Alert';
import { Loading } from './States';
import MonthlyChart from './charts/MonthlyChart';
import MoneySplit from './charts/MoneySplit';
import { formatDate, formatPercent, formatRand } from '../utils/format';

const AGE_GROUPS = [
  { value: 'under65', label: 'Under 65' },
  { value: '65to74', label: '65 to 74' },
  { value: '75plus', label: '75 or older' },
];

/**
 * Part 3: income and estimated tax for the current South African tax year.
 * All figures come from GET /api/income/tax-estimate; the browser only
 * displays them. The method is shown step by step so the freelancer can
 * follow (and check) the estimate.
 */
export default function TaxPanel({ refreshKey }) {
  const [ageGroup, setAgeGroup] = useState('under65');
  const [estimate, setEstimate] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setError('');
    api
      .taxEstimate(ageGroup)
      .then((d) => active && setEstimate(d))
      .catch((err) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, [ageGroup, refreshKey]);

  if (error) return <Alert>{error}</Alert>;
  if (!estimate) return <Loading label="Working out your tax estimate" />;

  const e = estimate;
  const currentMonth = new Date().toISOString().slice(0, 7);
return (
    <section className="tax" aria-labelledby="tax-heading">
      <div className="tax-head">
        <h2 id="tax-heading">
          Tax year {e.taxYear.label}
          <span className="tax-dates">
            {formatDate(e.taxYear.start)} to {formatDate(e.taxYear.end)}
          </span>
        </h2>
      </div>

      <dl className="kpis">
        <div>
          <dt>Earned so far</dt>
          <dd className="mono-num">{formatRand(e.taxableIncomeToDate)}</dd>
          <span className="kpi-note">after platform fees, {e.bookingsThisTaxYear} booking{e.bookingsThisTaxYear === 1 ? '' : 's'}</span>
        </div>
        <div className="kpi-tax">
          <dt>Estimated tax so far</dt>
          <dd className="mono-num" data-testid="tax-to-date">{formatRand(e.estimatedTaxToDate)}</dd>
          <span className="kpi-note">effective rate {formatPercent(e.effectiveRate)}</span>
        </div>
        <div>
          <dt>Take-home after tax</dt>
          <dd className="mono-num">{formatRand(e.takeHomeToDate)}</dd>
          <span className="kpi-note">what is yours to keep</span>
        </div>
        <div>
          <dt>Put aside each month</dt>
          <dd className="mono-num">{formatRand(e.suggestedMonthlySetAside)}</dd>
          <span className="kpi-note">next provisional payment {formatDate(e.provisionalTax.nextDue)}</span>
        </div>
      </dl>

      {e.belowThreshold && (
        <p className="tax-good" role="status">
          At your current pace you would earn about {formatRand(e.projectedAnnualIncome)} this tax year. That is below the{' '}
          {formatRand(e.taxThreshold)} tax threshold for your age group, so no income tax is expected.
        </p>
      )}
      {e.integrity?.excluded > 0 && (
        <Alert>
          {e.integrity.excluded} transaction{e.integrity.excluded === 1 ? '' : 's'} failed an integrity check and{' '}
          {e.integrity.excluded === 1 ? 'was' : 'were'} left out of these figures. Please contact support.
        </Alert>
      )}

      <div className="tax-charts">
        <div className="panel">
          <h3>Month by month</h3>
          <MonthlyChart months={e.byMonth} currentMonth={currentMonth} />
        </div>
        <div className="panel">
          <h3>Where the money goes</h3>
          <MoneySplit takeHome={e.takeHomeToDate} tax={e.estimatedTaxToDate} fees={e.platformFeesToDate} />
        </div>
      </div>

      <details className="panel tax-method" open>
        <summary>How this estimate is worked out</summary>

        <fieldset className="age-picker">
          <legend>Your age on the last day of the tax year</legend>
          {AGE_GROUPS.map((g) => (
            <label key={g.value} className={ageGroup === g.value ? 'is-selected' : ''}>
              <input
                type="radio"
                name="ageGroup"
                value={g.value}
                checked={ageGroup === g.value}
                onChange={() => setAgeGroup(g.value)}
              />
              {g.label}
            </label>
          ))}
        </fieldset>

        <ol className="tax-steps">
          <li>
            <span>Your earnings this tax year, after the 10% platform fee</span>
            <span className="mono-num">{formatRand(e.taxableIncomeToDate)}</span>
          </li>
          <li>
            <span>
              Scaled up to a full year ({formatRand(e.taxableIncomeToDate)} ÷ {e.taxYear.monthsElapsed} month
              {e.taxYear.monthsElapsed === 1 ? '' : 's'} × 12)
            </span>
            <span className="mono-num">{formatRand(e.projectedAnnualIncome)}</span>
          </li>
          <li>
            <span>Tax on that amount using the SARS brackets below</span>
            <span className="mono-num">{formatRand(e.taxBeforeRebate)}</span>
          </li>
          <li>
            <span>Minus the rebate for your age group</span>
            <span className="mono-num">− {formatRand(e.rebate)}</span>
          </li>
          <li>
            <span>Estimated tax for the full year (never below zero)</span>
            <span className="mono-num strong">{formatRand(e.projectedAnnualTax)}</span>
          </li>
          <li>
            <span>
              Effective rate {formatPercent(e.effectiveRate)} applied to what you have earned so far (top bracket reached:{' '}
              {formatPercent(e.marginalRate, 0)})
            </span>
            <span className="mono-num strong">{formatRand(e.estimatedTaxToDate)}</span>
          </li>
        </ol>

        {e.brackets.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <caption className="tax-caption">Your projected income, band by band</caption>
              <thead>
                <tr>
                  <th scope="col">Income band</th>
                  <th scope="col" className="num">Rate</th>
                  <th scope="col" className="num">Your income in band</th>
                  <th scope="col" className="num">Tax</th>
                </tr>
              </thead>
              <tbody>
                {e.brackets.map((b) => (
                  <tr key={b.from}>
                    <td>
                      {formatRand(b.from)} {b.to === null ? 'and above' : `to ${formatRand(b.to)}`}
                    </td>
                    <td className="num mono-num">{formatPercent(b.rate, 0)}</td>
                    <td className="num mono-num">{formatRand(b.taxableInBand)}</td>
                    <td className="num mono-num">{formatRand(b.taxInBand)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="fine-print">
          Rates: {e.taxTable.description}. Provisional tax is usually paid by {formatDate(e.provisionalTax.firstPeriodDue)} and{' '}
          {formatDate(e.provisionalTax.secondPeriodDue)}. {e.disclaimer}
        </p>
      </details>
    </section>
  );
}
