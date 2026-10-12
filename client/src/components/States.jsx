export const Loading = ({ label = 'Loading' }) => (
  <p className="loading" role="status">
    {label}…
  </p>
);

export const Empty = ({ title, children }) => (
  <div className="empty">
    <p className="empty-title">{title}</p>
    {children}
  </div>
);
