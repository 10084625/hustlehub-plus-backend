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