import { formatRand } from '../utils/format';

/** The shop-style price tag used wherever a gig's price is shown. */
export default function PriceTag({ amount, size = 'md' }) {
  return (
    <span className={`price-tag price-tag-${size}`}>
      <span className="price-tag-hole" aria-hidden="true" />
      {formatRand(amount)}
    </span>
  );
}
