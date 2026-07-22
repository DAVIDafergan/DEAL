import { Link as RouterLink, NavLink as RouterNavLink, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.jsx';
import { withLangPrefix } from '../context/LanguageContext.jsx';

/** 9.8: drop-in replacements for react-router-dom's Link/NavLink/useNavigate that keep the
 * visitor in the same language across in-app navigation. Every file in the app imports Link
 * from here instead of 'react-router-dom' directly (mechanical, one-line-per-file swap — see
 * DECISIONS.md 9.8) so an absolute `to="/property/5"` written anywhere automatically becomes
 * "/en/property/5" while browsing in English, with zero per-callsite changes. Relative `to`
 * values (no leading "/") and external URLs pass through untouched. */
function localize(to, lang) {
  if (typeof to !== 'string' || !to.startsWith('/')) return to;
  return withLangPrefix(to, lang);
}

export function Link({ to, ...props }) {
  const { lang } = useLanguage();
  return <RouterLink to={localize(to, lang)} {...props} />;
}

export function NavLink({ to, ...props }) {
  const { lang } = useLanguage();
  return <RouterNavLink to={localize(to, lang)} {...props} />;
}

export function useLocalizedNavigate() {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  return (to, options) => {
    if (typeof to === 'number') return navigate(to);
    navigate(localize(to, lang), options);
  };
}
