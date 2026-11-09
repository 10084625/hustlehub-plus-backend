import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="empty">
      <p className="empty-title">That page does not exist.</p>
      <Link to="/">Go to the start</Link>
    </div>
  );
}
