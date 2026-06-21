import { useLanguage } from '../context/LanguageContext.jsx';

/** ממפה ציון 0-100 לצבע על סקאלת אדום-כתום-ירוק */
function colorForScore(score) {
  if (score >= 70) return 'var(--color-risk-high)';
  if (score >= 40) return 'var(--color-risk-mid)';
  return 'var(--color-risk-low)';
}

export function RiskGauge({ score }) {
  const { t } = useLanguage();

  if (score === null || score === undefined) return null;

  return (
    <div className="risk-gauge">
      <div className="risk-gauge__track">
        <div
          className="risk-gauge__fill"
          style={{ width: `${score}%`, background: colorForScore(score) }}
        />
      </div>
      <div className="risk-gauge__label">
        <span>{t.enforcementLikelihood}</span>
        <span>{score}/100</span>
      </div>
    </div>
  );
}
