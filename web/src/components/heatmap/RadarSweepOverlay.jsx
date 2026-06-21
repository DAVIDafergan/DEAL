import { useLanguage } from '../../context/LanguageContext.jsx';

/**
 * מצב ביניים אלגנטי לזמן שאין עדיין דילים (המערכת צוברת היסטוריית מחירים אמיתית).
 * אנימציית סריקת רדאר על המפה + הודעה שקופה — לא מסך ריק, ולא נתוני דמו מזויפים.
 */
export function RadarSweepOverlay() {
  const { t } = useLanguage();

  return (
    <div className="radar-overlay">
      <div className="radar-overlay__rings" aria-hidden="true">
        <span className="radar-overlay__ring" />
        <span className="radar-overlay__ring" />
        <span className="radar-overlay__ring" />
        <span className="radar-overlay__sweep" />
      </div>
      <div className="radar-overlay__caption glass-panel">
        <h2>{t.radarTitle}</h2>
        <p>{t.radarSubtitle}</p>
      </div>
    </div>
  );
}
