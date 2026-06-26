import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { agentApi } from '../../api/client.js';
import { QuestionStep } from './QuestionStep.jsx';
import { ChoiceCard } from './ChoiceCard.jsx';

const PEOPLE_OPTIONS = [
  { value: 1, labelKey: 'q1PeopleSolo', iconName: 'user' },
  { value: 2, labelKey: 'q1PeopleCouple', iconName: 'users' },
  { value: 4, labelKey: 'q1PeopleFamily', iconName: 'usersRound' },
  { value: 6, labelKey: 'q1PeopleGroup', iconName: 'usersRound' },
];
const BUDGET_OPTIONS = [
  { value: 3000, labelKey: 'q2Budget3000', iconName: 'wallet' },
  { value: 5000, labelKey: 'q2Budget5000', iconName: 'wallet' },
  { value: 8000, labelKey: 'q2Budget8000', iconName: 'wallet' },
  { value: null, labelKey: 'q2BudgetUnlimited', iconName: 'infinity' },
];
const DAYS_OPTIONS = [
  { value: 3, labelKey: 'q3Days3', iconName: 'calendar' },
  { value: 5, labelKey: 'q3Days5', iconName: 'calendar' },
  { value: 7, labelKey: 'q3Days7', iconName: 'calendar' },
  { value: 10, labelKey: 'q3Days10', iconName: 'calendar' },
];
const TYPE_OPTIONS = [
  { value: 'city', labelKey: 'q4TypeCity', iconName: 'building' },
  { value: 'beach', labelKey: 'q4TypeBeach', iconName: 'umbrella' },
  { value: 'nature', labelKey: 'q4TypeNature', iconName: 'mountain' },
  { value: 'culture', labelKey: 'q4TypeCulture', iconName: 'landmark' },
  { value: null, labelKey: 'q4TypeAnything', iconName: 'mapPin' },
];

const STEPS = [
  { key: 'peopleCount', titleKey: 'q1Title', options: PEOPLE_OPTIONS },
  { key: 'budgetIls', titleKey: 'q2Title', options: BUDGET_OPTIONS },
  { key: 'days', titleKey: 'q3Title', options: DAYS_OPTIONS },
  { key: 'destinationType', titleKey: 'q4Title', options: TYPE_OPTIONS },
];

const SELECT_ADVANCE_DELAY_MS = 420; // זמן קצר לראות את ה-glow + עימעום השאר לפני שעוברים לשאלה הבאה

/**
 * QuestionnaireModal — שאלון אישי קצר (4 שאלות), **מסך-מלא** (לא דיאלוג מרכזי קטן): כל שאלה
 * תופסת 100vh, אריחי בחירה גדולים עם אייקון ש"מצטייר" בכניסה (AnimatedIcon, pathLength),
 * progress bar דק בראש, ומעבר slide ברור בין שאלות (QuestionStep). כל בחירה ויזואלית
 * מתקדמת אוטומטית לשאלה הבאה (Typeform-style), עם אפשרות "הקודם" לתקן. peopleCount (שאלה 1)
 * הוא הפרמטר שמוזן ל-Live Deal Engine — ברירת מחדל זוגית (2) רק כשהמשתמש לא עבר שאלון בכלל.
 */
export function QuestionnaireModal({ onClose, onResults }) {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [status, setStatus] = useState('answering'); // answering | loading | error

  const current = STEPS[step];
  const hasSelection = answers[current.key] !== undefined;

  function handleSelect(value) {
    const nextAnswers = { ...answers, [current.key]: value };
    setAnswers(nextAnswers);

    if (step < STEPS.length - 1) {
      setTimeout(() => setStep((s) => s + 1), SELECT_ADVANCE_DELAY_MS);
    } else {
      setTimeout(() => submit(nextAnswers), SELECT_ADVANCE_DELAY_MS);
    }
  }

  async function submit(finalAnswers) {
    setStatus('loading');
    try {
      const { budgetIls, peopleCount } = finalAnswers;
      const { deals } = await agentApi.getApprovedDeals();
      let filtered = deals || [];

      // Filter by budget (ILS deals only — don't discard deals in other currencies)
      if (budgetIls) {
        filtered = filtered.filter(d =>
          d.currency !== 'ILS' || d.price <= budgetIls
        );
      }

      // Sort best-value first
      filtered.sort((a, b) => (b.value_score || 0) - (a.value_score || 0));

      onResults(filtered.slice(0, 9));
    } catch {
      setStatus('error');
    }
  }

  function handleBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  return (
    <motion.div className="questionnaire-fullscreen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="questionnaire-fullscreen__progress-track">
        <motion.div
          className="questionnaire-fullscreen__progress-fill"
          animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      <div className="questionnaire-fullscreen__header">
        {status === 'answering' && (
          <span className="questionnaire-fullscreen__step-label">{t.questionnaireStepLabel(step + 1, STEPS.length)}</span>
        )}
        <button type="button" className="questionnaire-fullscreen__close" onClick={onClose} aria-label={t.questionnaireCloseButton}>
          ×
        </button>
      </div>

      {status === 'loading' && (
        <div className="questionnaire-fullscreen__center">
          <p>{t.questionnaireLoadingLabel}</p>
        </div>
      )}
      {status === 'error' && (
        <div className="questionnaire-fullscreen__center">
          <p>{t.questionnaireErrorLabel}</p>
        </div>
      )}

      {status === 'answering' && (
        <AnimatePresence mode="wait">
          <QuestionStep key={step} title={t[current.titleKey]}>
            {current.options.map((opt, index) => (
              <ChoiceCard
                key={String(opt.value)}
                label={t[opt.labelKey]}
                iconName={opt.iconName}
                index={index}
                isSelected={answers[current.key] === opt.value}
                isDimmed={hasSelection && answers[current.key] !== opt.value}
                onSelect={() => handleSelect(opt.value)}
              />
            ))}
          </QuestionStep>
        </AnimatePresence>
      )}

      {status === 'answering' && step > 0 && (
        <button type="button" className="questionnaire-fullscreen__back" onClick={handleBack}>
          {t.questionnaireBackButton}
        </button>
      )}
    </motion.div>
  );
}
