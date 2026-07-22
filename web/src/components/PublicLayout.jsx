import { Outlet } from 'react-router-dom';
import { Header } from './Header.jsx';
import { SiteFooter } from './SiteFooter.jsx';

// 11.2: every route under PublicLayout (property page, dashboard, account, favorites, compare,
// legal pages, owner public profile...) now gets the same site-wide footer, sticky to the
// viewport bottom on short pages via the same flex-column/flex:1 pattern AppShell already used
// for the homepage — one footer definition, one place it's guaranteed to render.
export function PublicLayout() {
  return (
    <div className="public-layout">
      <a href="#main-content" className="skip-to-content">דלג לתוכן העיקרי</a>
      <Header />
      <main id="main-content" tabIndex="-1" className="public-layout__main">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
