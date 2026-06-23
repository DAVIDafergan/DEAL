import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { QuestionnaireModal } from './questionnaire/QuestionnaireModal.jsx';
import { PersonalizedResultsModal } from './questionnaire/PersonalizedResultsModal.jsx';

/**
 * PlanTab — תוכן טאב "חופשה מושלמת": השאלון מוצג **ישר**, לא חוסם אחרי לחיצת כפתור (זה
 * כל הטאב). `QuestionnaireModal`/`PersonalizedResultsModal` הם עדיין position:fixed
 * (כיסוי מסך מלא) — זה עובד נכון גם כתוכן טאב, לא רק כדיאלוג צף. "×" בשאלון = `onExit`
 * (חזרה לטאב "דילים", מועבר מ-AppShell), לא סגירה-לכלום.
 */
export function PlanTab({ onExit }) {
  const [isQuestionnaireVisible, setIsQuestionnaireVisible] = useState(true);
  const [personalizedPackages, setPersonalizedPackages] = useState(null);

  function handleResults(packages) {
    setPersonalizedPackages(packages);
    setIsQuestionnaireVisible(false);
  }

  function handleCloseResults() {
    setPersonalizedPackages(null);
    setIsQuestionnaireVisible(true); // אפשר לענות מחדש
  }

  return (
    <div className="plan-tab">
      <AnimatePresence>
        {isQuestionnaireVisible && <QuestionnaireModal onClose={onExit} onResults={handleResults} />}
      </AnimatePresence>

      <AnimatePresence>
        {personalizedPackages !== null && (
          <PersonalizedResultsModal packages={personalizedPackages} onClose={handleCloseResults} />
        )}
      </AnimatePresence>
    </div>
  );
}
