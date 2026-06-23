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
        <h1 className="register-choice__title">{t.registerChoiceTitle || 'Join Deal Radar'}</h1>
        <p className="register-choice__subtitle">{t.registerChoiceSubtitle || 'Who are you?'}</p>

        <div className="register-choice__options">
          <motion.button
            className="register-choice__option"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/register/traveler')}
          >
            <Luggage size={40} strokeWidth={1.5} />
            <span className="register-choice__option-label">{t.registerAsTravelerLabel || "I'm a Traveler"}</span>
            <span className="register-choice__option-desc">{t.registerAsTravelerDesc || 'Save favorites & get alerts'}</span>
          </motion.button>

          <motion.button
            className="register-choice__option register-choice__option--agent"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/agent/register')}
          >
            <Briefcase size={40} strokeWidth={1.5} />
            <span className="register-choice__option-label">{t.registerAsAgentLabel || "I'm a Travel Agent"}</span>
            <span className="register-choice__option-desc">{t.registerAsAgentDesc || 'Publish deals & reach thousands'}</span>
          </motion.button>
        </div>

        <button className="register-choice__back" onClick={() => navigate('/')}>
          {t.backToFeedButton || '← Back to deals'}
        </button>
      </motion.div>
    </div>
  );
}
