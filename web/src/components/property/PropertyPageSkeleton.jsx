/** PropertyPageSkeleton — 7.8: real loading skeletons instead of layout-shifting "טוען…" text.
 * Shapes roughly match PropertyPage's actual layout (gallery, title, meta rows, price). */
export function PropertyPageSkeleton() {
  return (
    <div className="container" style={{ maxWidth: 640, paddingTop: 24 }} aria-busy="true" aria-label="טוען פרטי נכס">
      <div className="skeleton-block" style={{ height: 280, borderRadius: 'var(--radius-lg)' }} />
      <div style={{ padding: '20px 4px' }}>
        <div className="skeleton-block" style={{ height: 26, width: '70%', borderRadius: 6, marginBottom: 10 }} />
        <div className="skeleton-block" style={{ height: 14, width: '40%', borderRadius: 6, marginBottom: 20 }} />
        <div className="skeleton-block" style={{ height: 16, width: '60%', borderRadius: 6, marginBottom: 10 }} />
        <div className="skeleton-block" style={{ height: 16, width: '50%', borderRadius: 6, marginBottom: 10 }} />
        <div className="skeleton-block" style={{ height: 16, width: '30%', borderRadius: 6 }} />
      </div>
    </div>
  );
}
