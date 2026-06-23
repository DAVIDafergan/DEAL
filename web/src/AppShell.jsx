import { useLocation, useNavigate } from 'react-router-dom';
import { App } from './App.jsx';
import { DealsTab } from './vibe/DealsTab.jsx';
import { PlanTab } from './components/PlanTab.jsx';
import { BottomNav } from './components/BottomNav.jsx';
import { ALL_VIBES_KEY, VIBES } from './vibe/vibeConstants.js';

function deriveActiveTab(pathname) {
  if (pathname.startsWith('/reels')) return 'deals';
  if (pathname === '/plan') return 'plan';
  return 'home'; // '/' ו-'/flights' נופלים לדף הבית (מפה + דילים)
}

function deriveVibe(pathname) {
  const segment = pathname.replace(/^\/reels\/?/, '').replace(/^\//, '');
  return VIBES.includes(segment) ? segment : ALL_VIBES_KEY;
}

/**
 * AppShell — מעטפת האפליקציה: 3 הטאבים ("דילים"/"טיסות"/"חופשה מושלמת") **תמיד mounted**,
 * רק display:none על הלא-פעילים — לא מתבססים על unmount/remount של react-router בין
 * routes, כדי שגלילה/state בפיד (וגם בטאבים האחרים) לא יתאפסו במעבר בין טאבים וחזרה.
 * ה-URL עדיין מתעדכן (BottomNav משתמש ב-navigate), כך שניתן לסמן/לשתף/ללחוץ "אחורה" בדפדפן.
 */
export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = deriveActiveTab(location.pathname);
  const vibe = deriveVibe(location.pathname);

  function handleNavigate(tab) {
    navigate(tab.path);
  }

  function handleChangeVibe(nextVibe) {
    navigate(nextVibe === ALL_VIBES_KEY ? '/reels' : `/reels/${nextVibe}`);
  }

  return (
    <div className="app-shell-tabs">
      <div className="app-shell-tabs__panel" style={{ display: activeTab === 'home' ? 'block' : 'none' }}>
        <App />
      </div>

      <div className="app-shell-tabs__panel" style={{ display: activeTab === 'deals' ? 'block' : 'none' }}>
        <DealsTab vibe={vibe} onChangeVibe={handleChangeVibe} />
      </div>

      <div className="app-shell-tabs__panel" style={{ display: activeTab === 'plan' ? 'block' : 'none' }}>
        <PlanTab onExit={() => navigate('/')} />
      </div>

      <BottomNav activeTab={activeTab} onNavigate={handleNavigate} />
    </div>
  );
}
