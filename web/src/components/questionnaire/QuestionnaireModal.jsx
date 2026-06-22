import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { submitQuestionnaire } from '../../api/client.js';
import { QuestionStep } from './QuestionStep.jsx';
import { ChoiceCard } from './ChoiceCard.jsx';
import { SoloIcon, CoupleIcon, FamilyIcon, GroupIcon } from './PeopleIcons.jsx';

const PEOPLE_OPTIONS = [
  { value: 1, labelKey: 'q1PeopleSolo', Icon: SoloIcon },
  { value: 2, labelKey: 'q1PeopleCouple', Icon: CoupleIcon },
  { value: 4, labelKey: 'q1PeopleFamily', Icon: FamilyIcon },
  { value: 6, labelKey: 'q1PeopleGroup', Icon: GroupIcon },
];
const BUDGET_OPTIONS = [
  { value: 3000, labelKey: 'q2Budget3000' },
  { value: 5000, labelKey: 'q2Budget5000' },
  { value: 8000, labelKey: 'q2Budget8000' },
  { value: null, labelKey: 'q2BudgetUnlimited' },
];
const DAYS_OPTIONS = [
  { value: 3, labelKey: 'q3Days3' },
  { value: 5, labelKey: 'q3Days5' },
  { value: 7, labelKey: 'q3Days7' },
  { value: 10, labelKey: 'q3Days10' },
];
const TYPE_OPTIONS = [
  { value: 'city', labelKey: 'q4TypeCity' },
  { value: 'beach', labelKey: 'q4TypeBeach' },
  { value: 'nature', labelKey: 'q4TypeNature' },
  { value: 'culture', labelKey: 'q4TypeCulture' },
  { value: null, labelKey: 'q4TypeAnything' },
];

const STEPS = [
  { key: 'peopleCount', titleKey: 'q1Title', options: PEOPLE_OPTIONS },
  { key: 'budgetIls', titleKey: 'q2Title', options: BUDGET_OPTIONS },
  { key: 'days', titleKey: 'q3Title', options: DAYS_OPTIONS },
  { key: 'destinationType', titleKey: 'q4Title', options: TYPE_OPTIONS },
];

const SELECT_ADVANCE_DELAY_MS = 380; // זמן קצר לראות את ההבהוב לפני שעוברים לשאלה הבאה

/**
 * QuestionnaireModal — שאלון אישי קצר (4 שאלות), כל בחירה ויזואלית מתקדמת אוטומטית לשאלה
 * הבאה (Typeform-style), עם אפשרות "הקודם" לתקן. בשאלה האחרונה — שולח ומציג טעינה.
 */
export function QuestionnaireModal({ onClose, onResults }) {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [status, setStatus] = useState('answering'); // answering | loading | error

  const current = STEPS[step];

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
      const res = await submitQuestionnaire(finalAnswers);
      onResults(res.packages || [], finalAnswers);
      onClose();
    } catch (err) {
      setStatus('error');
    }
  }

  function handleBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  return (
    <motion.div
      className="questionnaire-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="questionnaire-modal glass-panel"
        onClick={(event) => event.stopPropagation()}
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 16 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      >
        <div className="questionnaire-modal__header">
          {status === 'answering' && (
            <span className="questionnaire-modal__step-label">{t.questionnaireStepLabel(step + 1, STEPS.length)}</span>
          )}
          <button type="button" className="questionnaire-modal__close" onClick={onClose} aria-label={t.questionnaireCloseButton}>
            ×
          </button>
        </div>

        {status === 'loading' && <p className="questionnaire-modal__loading">{t.questionnaireLoadingLabel}</p>}
        {status === 'error' && <p className="questionnaire-modal__error">{t.questionnaireErrorLabel}</p>}

        {status === 'answering' && (
          <AnimatePresence mode="wait">
            <QuestionStep key={step} title={t[current.titleKey]}>
              {current.options.map((opt) => (
                <ChoiceCard
                  key={String(opt.value)}
                  label={t[opt.labelKey]}
                  icon={opt.Icon ? <opt.Icon /> : null}
                  isSelected={answers[current.key] === opt.value}
                  onSelect={() => handleSelect(opt.value)}
                />
              ))}
            </QuestionStep>
          </AnimatePresence>
        )}

        {status === 'answering' && step > 0 && (
          <button type="button" className="questionnaire-modal__back" onClick={handleBack}>
            {t.questionnaireBackButton}
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}
