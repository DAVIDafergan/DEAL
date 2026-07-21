/** DashListSkeleton — 7.8: loading skeleton matching .dash-deal-card's row shape, used wherever
 * the owner dashboard is waiting on a list (properties, booking requests) instead of a plain
 * "טוען…" that causes a layout jump once real content arrives. */
export function DashListSkeleton({ rows = 3 }) {
  return (
    <div className="dash-deals-list" aria-busy="true" aria-label="טוען">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="dash-deal-card" style={{ opacity: 1 - i * 0.15 }}>
          <div className="skeleton-block" style={{ width: 70, height: 54, borderRadius: 'var(--radius-sm)', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="skeleton-block" style={{ height: 14, width: '55%', borderRadius: 6 }} />
            <div className="skeleton-block" style={{ height: 11, width: '75%', borderRadius: 6 }} />
            <div className="skeleton-block" style={{ height: 11, width: '35%', borderRadius: 6 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
