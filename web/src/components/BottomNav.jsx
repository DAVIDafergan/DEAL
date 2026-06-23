import { useLanguage } from '../context/LanguageContext.jsx';

const TABS = [
  { key: 'deals', emoji: '🎬', labelKey: 'navDealsLabel', path: '/' },
  { key: 'flights', emoji: '✈️', labelKey: 'navFlightsLabel', path: '/flights' },
  { key: 'plan', emoji: '🔍', labelKey: 'navPlanLabel', path: '/plan' },
];

/**
 * BottomNav — תפריט קבוע בתחתית המסך (נייד), בסגנון טיקטוק/אינסטגרם: 3 טאבים, אייקון פעיל
 * מודגש בצבע המותג. לא ניווט "אמיתי" שמחליף עמודים — AppShell.jsx משאיר את שלושת הטאבים
 * mounted כל הזמן (display:none על הלא-פעילים), אז מעבר בין טאבים לא מאפס scroll/state.
 */
export function BottomNav({ activeTab, onNavigate }) {
  const { t } = useLanguage();

  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`bottom-nav__item ${activeTab === tab.key ? 'is-active' : ''}`}
          onClick={() => onNavigate(tab)}
        >
          <span className="bottom-nav__icon">{tab.emoji}</span>
          <span className="bottom-nav__label">{t[tab.labelKey]}</span>
        </button>
      ))}
    </nav>
  );
}
