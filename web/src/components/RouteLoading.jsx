import { Key } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';

/** RouteLoading — shown by <Suspense> while a lazy-loaded route chunk downloads (10.1 code
 * splitting), and reused as the site's one loading motif everywhere else (10.3) — a turning
 * key, on brand for a zimmer/hospitality site, not a generic spinner. Pass `text` for a
 * context-specific friendly message; defaults to a generic "hold on" line (used by Suspense,
 * before LanguageProvider's translations are necessarily meaningful to show mid-navigation).
 * Respects prefers-reduced-motion via the .route-loading__key-spin rule in index.css. */
export function RouteLoading({ text }) {
  const { t } = useLanguage();
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <Key className="route-loading__key" size={28} strokeWidth={1.75} aria-hidden="true" />
      <span className="route-loading__text">{text || t.loadingButton}</span>
    </div>
  );
}
