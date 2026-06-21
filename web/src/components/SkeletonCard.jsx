export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-block" />
      <div className="skeleton-block" />
      <div className="skeleton-block" style={{ width: '60%' }} />
      <div className="skeleton-block" style={{ width: '40%', marginTop: 8 }} />
    </div>
  );
}
