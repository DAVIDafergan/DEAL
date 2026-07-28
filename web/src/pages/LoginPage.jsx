import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Luggage, Home } from 'lucide-react';

// Mirrors RegisterPage.jsx's choice screen — the header's single generic "login" button used
// to jump straight to /owner/login with no way for a customer to find their own login. This is
// the neutral first stop for both account types; ?next= (already produced by PropertyReviews.jsx
// and PropertyPage's claim links) passes through to whichever login screen the visitor picks.
export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next');
  const qs = next ? `?next=${encodeURIComponent(next)}` : '';

  return (
    <div className="register-choice">
      <motion.div
        className="register-choice__card"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="register-choice__title">התחברות ל-Dealim</h1>
        <p className="register-choice__subtitle">אתה מחפש צימר, או יש לך אחד?</p>

        <div className="register-choice__options">
          <motion.button
            className="register-choice__option"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(`/register/traveler/login${qs}`)}
          >
            <Luggage size={36} strokeWidth={1.4} />
            <span className="register-choice__option-label">אני מחפש צימר</span>
            <span className="register-choice__option-desc">כניסה למועדפים, התראות וההזמנות שלך</span>
          </motion.button>

          <motion.button
            className="register-choice__option register-choice__option--agent"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(`/owner/login${qs}`)}
          >
            <Home size={36} strokeWidth={1.4} />
            <span className="register-choice__option-label">יש לי צימר להשכרה</span>
            <span className="register-choice__option-desc">כניסה לדשבורד ניהול הנכסים שלך</span>
          </motion.button>
        </div>

        <button className="register-choice__back" onClick={() => navigate('/')}>
          ← חזרה לדף הבית
        </button>
      </motion.div>
    </div>
  );
}
