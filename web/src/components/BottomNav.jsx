import { motion } from 'framer-motion';
import { Clapperboard, Map, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';

const TABS = [
  { key: 'home', Icon: Map, labelKey: 'navHomeLabel', path: '/' },
  { key: 'deals', Icon: Clapperboard, labelKey: 'navDealsLabel', path: '/reels' },
  { key: 'plan', Icon: Sparkles, labelKey: 'navPlanLabel', path: '/plan' },
];

/**
 * BottomNav — תפריט קבוע בתחתית המסך (נייד), בסגנון טיקטוק/אינסטגרם: 3 טאבים, אייקוני
 * lucide (לא emoji — נראה זול), אינדיקטור פעיל זוהר שזז בחלקות בין הטאבים (Framer Motion
 * layoutId — "shared layout animation": אלמנט עם layoutId זהה שנעלם במקום אחד ומופיע
 * במקום אחר באותו רענון, מאונפש אוטומטית בין שתי המיקומים), ואייקון פעיל עם spring scale.
 * לא ניווט "אמיתי" שמחליף עמודים — AppShell.jsx משאיר את שלושת הטאבים mounted כל הזמן.
 */
export function BottomNav({ activeTab, onNavigate }) {
  const { t } = useLanguage();

  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            className={`bottom-nav__item ${isActive ? 'is-active' : ''}`}
            onClick={() => onNavigate(tab)}
          >
            <motion.span
              className="bottom-nav__icon-wrap icon-draw icon-draw--once"
              style={{ '--nav-idx': TABS.indexOf(tab) }}
              animate={{ scale: isActive ? 1.1 : 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 20 }}
            >
              <tab.Icon size={22} strokeWidth={isActive ? 2.4 : 1.8} />
            </motion.span>
            <span className="bottom-nav__label">{t[tab.labelKey]}</span>
            {isActive && (
              <motion.span
                className="bottom-nav__indicator"
                layoutId="bottom-nav-indicator"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
