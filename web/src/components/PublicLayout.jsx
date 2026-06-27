import { Outlet } from 'react-router-dom';
import { Header } from './Header.jsx';

export function PublicLayout() {
  return (
    <>
      <a href="#main-content" className="skip-to-content">דלג לתוכן העיקרי</a>
      <Header />
      <main id="main-content" tabIndex="-1">
        <Outlet />
      </main>
    </>
  );
}
