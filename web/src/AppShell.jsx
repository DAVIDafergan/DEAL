import { App } from './App.jsx';
import { Header } from './components/Header.jsx';

// The reel feed (vibe/DealsTab.jsx) and package-builder tab (components/PlanTab.jsx) are
// retired along with the rest of the flight world (see README) — this shell no longer mounts
// or routes to them. Both files are untouched in the repo, just no longer imported here.
// Any /reels or /plan URL simply renders the property-search home below (no route match to
// break bookmarks/links on).

/**
 * AppShell — was a 3-tab shell (deals reel / flights / plan) with tabs kept mounted via
 * display:none to preserve scroll state across switches. Now a single-tab shell: only the
 * property-search home renders. Structure kept (not collapsed into App.jsx directly) so the
 * two retired tabs can be restored here later without re-deriving the wrapper.
 */
export function AppShell() {
  return (
    <div className="app-shell-tabs">
      <a href="#main-content" className="skip-to-content">דלג לתוכן העיקרי</a>
      <Header reels={false} activeTab="home" />

      <div id="main-content" tabIndex="-1" className="app-shell-tabs__panel">
        <App />
      </div>
    </div>
  );
}
