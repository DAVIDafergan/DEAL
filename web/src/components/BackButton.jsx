import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Link } from './LocalizedLink.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

/** BackButton — 11.22: one shared, viewport-fixed back control for every page that needs one,
 * replacing ~8 different ad-hoc "back" links that each page rolled on its own
 * (account-page__back, favorites-page__back, legal-page__back, agent-social-profile__back-clean,
 * etc). Each of those sat in normal document flow inside that page's own container, so its
 * exact horizontal position depended on that container's own width/padding — which is why it
 * visually landed in a different spot page to page. This is `position: fixed` (see
 * .back-button-fixed in index.css), pinned to the same top-right corner on every page and at
 * every scroll position, below the sticky header so it never overlaps it.
 *
 * navigate(-1) preserves the previous page's scroll/filter state (7.8's reasoning, unchanged);
 * falls back to a plain link to fallbackTo when there's no in-app history (e.g. page opened
 * directly from a shared link) — React Router v6 signals that via location.key === 'default'. */
export function BackButton({ fallbackTo = '/', label }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const hasHistory = location.key !== 'default';
  const text = label || t.backButton;

  if (hasHistory) {
    return (
      <button type="button" className="back-button-fixed" onClick={() => navigate(-1)}>
        <ArrowLeft size={14} /> {text}
      </button>
    );
  }
  return (
    <Link to={fallbackTo} className="back-button-fixed">
      <ArrowLeft size={14} /> {text}
    </Link>
  );
}
