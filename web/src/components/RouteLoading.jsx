import { Key } from 'lucide-react';

/** RouteLoading — shown by <Suspense> while a lazy-loaded route chunk downloads (10.1 code
 * splitting). Reused as the site's one loading motif everywhere else (10.3) — a turning key,
 * on brand for a zimmer/hospitality site, not a generic spinner. Respects
 * prefers-reduced-motion via the .route-loading__key-spin rule in index.css. */
export function RouteLoading() {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <Key className="route-loading__key" size={28} strokeWidth={1.75} aria-hidden="true" />
      <span className="route-loading__text">רגע, פותחים...</span>
    </div>
  );
}
