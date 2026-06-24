import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Luggage, Briefcase } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';

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
        <h1 className="register-choice__title">{t.registerChoiceTitle || 'הצטרף ל-Deal Radar'}</h1>
        <p className="register-choice__subtitle">{t.registerChoiceSubtitle || 'אתה מחפש דילים, או מוכר אותם?'}</p>

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
            onClick={() => navigate('/agent/register')}
          >
            <Briefcase size={36} strokeWidth={1.4} />
            <span className="register-choice__option-label">{t.registerAsAgentLabel || 'סוכן נסיעות'}</span>
            <span className="register-choice__option-desc">{t.registerAsAgentDesc || 'פרסם דילים, הגע ללקוחות'}</span>
          </motion.button>
        </div>

        <button className="register-choice__back" onClick={() => navigate('/')}>
          {t.backToFeedButton || '← חזרה לדילים'}
        </button>
      </motion.div>
    </div>
  );
}
