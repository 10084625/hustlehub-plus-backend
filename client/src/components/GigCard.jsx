import { Link } from 'react-router-dom';
import PriceTag from './PriceTag';
import { categoryLabel } from '../utils/format';

/**
 * Gig summary. All text is rendered through React, which escapes it, so a
 * title like "<img onerror=...>" shows up as harmless text. No
 * dangerouslySetInnerHTML anywhere in the app.
 */
export default function GigCard({ gig }) {
  return (
    <article className="gig-card">
      <div className="gig-card-top">
        <span className="chip">{categoryLabel(gig.category)}</span>
        <PriceTag amount={gig.price} />
      </div>
      <h3>
        <Link to={`/gigs/${gig.id}`}>{gig.title}</Link>
      </h3>
      <p className="gig-card-desc">{gig.description}</p>
      <p className="gig-card-meta">
        by {gig.freelancer?.username ?? 'a freelancer'}, delivered in {gig.deliveryDays} day{gig.deliveryDays === 1 ? '' : 's'}
      </p>
    </article>
  );
}
