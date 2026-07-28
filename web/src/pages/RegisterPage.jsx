import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Luggage, Home } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';

// The account-type choice has to come first, always — it used to sit behind a "Continue with
// Google" button that called agentApi.googleAuth() regardless of which type the visitor
// actually wanted, silently registering/logging in *everyone* as a property owner before they
// ever picked. Removed: each type-specific page (TravelerRegisterPage/OwnerRegisterPage) already
// has its own correctly-scoped Google button one click later.
export function RegisterPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="register-choice">
      <motion.div
        className="register-choice__card"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="register-choice__title">הצטרף ל-Dealim</h1>
        <p className="register-choice__subtitle">אתה מחפש צימר, או מפרסם אחד?</p>

        <div className="register-choice__options">
          <motion.button
            className="register-choice__option"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/register/traveler')}
          >
            <Luggage size={36} strokeWidth={1.4} />
            <span className="register-choice__option-label">{t.registerAsTravelerLabel || 'מטייל'}</span>
            <span className="register-choice__option-desc">{t.registerAsTravelerDesc || 'שמור דילים, קבל התראות'}</span>
          </motion.button>

          <motion.button
            className="register-choice__option register-choice__option--agent"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/owner/register')}
          >
            <Home size={36} strokeWidth={1.4} />
            <span className="register-choice__option-label">בעל צימר</span>
            <span className="register-choice__option-desc">פרסם נכס, הגע ללקוחות</span>
          </motion.button>
        </div>

        <button className="register-choice__back" onClick={() => navigate('/')}>
          ← חזרה לדף הבית
        </button>
      </motion.div>
    </div>
  );
}
