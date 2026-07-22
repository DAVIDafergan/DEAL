import { TriangleAlert } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';

/** PropertyErrorState — 10.3: a fetch failure used to be indistinguishable from "no results"
 * (the catch block just set an empty array, so PropertyEmptyState rendered either way). Reuses
 * the same visual pattern (.pes*) as the empty state, different icon/copy/action. */
export function PropertyErrorState({ onRetry }) {
  const { t } = useLanguage();
  return (
    <div className="pes">
      <TriangleAlert size={32} className="pes__icon" />
      <p className="pes__title">{t.errorStateTitle}</p>
      <p className="pes__sub">{t.errorStateSub}</p>
      <div className="pes__actions">
        <button type="button" className="pes__btn pes__btn--primary" onClick={onRetry}>
          {t.errorStateRetry}
        </button>
      </div>
    </div>
  );
}
