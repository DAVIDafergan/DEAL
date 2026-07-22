import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './AppShell.jsx';
import { PublicLayout } from './components/PublicLayout.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
import { AgentAuthProvider } from './context/AgentAuthContext.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { AdminPage } from './pages/AdminPage.jsx';
import { OwnerRegisterPage } from './pages/OwnerRegisterPage.jsx';
import { OwnerLoginPage } from './pages/OwnerLoginPage.jsx';
import { OwnerDashboardPage } from './pages/OwnerDashboardPage.jsx';
import { OwnerSettingsPage } from './pages/OwnerSettingsPage.jsx';
import { OwnerBookingsPage } from './pages/OwnerBookingsPage.jsx';
import { OwnerPublicProfilePage } from './pages/OwnerPublicProfilePage.jsx';
import { PropertyPage } from './pages/PropertyPage.jsx';
import { RemovePage } from './pages/RemovePage.jsx';
import { FavoritesPage } from './pages/FavoritesPage.jsx';
import { BookingStatusPage } from './pages/BookingStatusPage.jsx';
import { MyBookingsPage } from './pages/MyBookingsPage.jsx';
import { ComparePage } from './pages/ComparePage.jsx';
import { SeoLandingPage } from './pages/SeoLandingPage.jsx';
import { AccountPage } from './pages/AccountPage.jsx';
import { TermsPage } from './pages/TermsPage.jsx';
import { PrivacyPage } from './pages/PrivacyPage.jsx';
import { TravelerRegisterPage } from './pages/TravelerRegisterPage.jsx';
import { TravelerLoginPage } from './pages/TravelerLoginPage.jsx';
import { AccessibilityPage } from './pages/AccessibilityPage.jsx';
import { ContactPage } from './pages/ContactPage.jsx';
import { TravelerAuthProvider } from './context/TravelerAuthContext.jsx';
import { AccessibilityWidget } from './components/AccessibilityWidget.jsx';
import './index.css';

// 9.8: the whole route tree, mounted twice below (once at "/", once at "/en") — paths here are
// relative (no leading "/") so they resolve against whichever base matched. LanguageProvider
// (mounted once, above both) derives the active language from the URL prefix, so this is the
// only place that needs to know about "/en" at all; everywhere else just uses <Link> (aliased
// to LocalizedLink, see components/LocalizedLink.jsx) with ordinary absolute-looking paths.
function RouteTree() {
  return (
    <Routes>
      {/* Routes with shared public header */}
      <Route element={<PublicLayout />}>
        <Route path="register" element={<RegisterPage />} />
        <Route path="register/traveler" element={<TravelerRegisterPage />} />
        <Route path="register/traveler/login" element={<TravelerLoginPage />} />
        <Route path="owner/register" element={<OwnerRegisterPage />} />
        <Route path="owner/login" element={<OwnerLoginPage />} />
        <Route path="owner/dashboard/settings" element={<OwnerSettingsPage />} />
        <Route path="owner/dashboard/bookings" element={<OwnerBookingsPage />} />
        <Route path="owner/dashboard" element={<OwnerDashboardPage />} />
        <Route path="owner/:slug" element={<OwnerPublicProfilePage />} />
        <Route path="property/:id" element={<PropertyPage />} />
        <Route path="אזור/:regionSlug" element={<SeoLandingPage />} />
        <Route path="עיר/:citySlug" element={<SeoLandingPage />} />
        <Route path="קטגוריה/:categorySlug" element={<SeoLandingPage />} />
        <Route path=":seg1/:seg2" element={<SeoLandingPage />} />
        <Route path="remove" element={<RemovePage />} />
        <Route path="my/favorites" element={<FavoritesPage />} />
        <Route path="my/bookings" element={<MyBookingsPage />} />
        <Route path="my/compare" element={<ComparePage />} />
        <Route path="booking/:token" element={<BookingStatusPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="accessibility" element={<AccessibilityPage />} />
        <Route path="contact" element={<ContactPage />} />
      </Route>

      {/* Admin — its own full-screen layout. Technically reachable at /en/admin too (same
          RouteTree mounted under both prefixes) but the admin UI itself isn't translated —
          an internal tool, not part of 9.8's scope. robots.txt already disallows /admin. */}
      <Route path="admin" element={<AdminPage />} />

      {/* App shell — home, header lives inside AppShell */}
      <Route path="*" element={<AppShell />} />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TravelerAuthProvider>
      <AgentAuthProvider>
        <BrowserRouter>
          <LanguageProvider>
            <AccessibilityWidget />
            <Routes>
              <Route path="/en/*" element={<RouteTree />} />
              <Route path="/*" element={<RouteTree />} />
            </Routes>
          </LanguageProvider>
        </BrowserRouter>
      </AgentAuthProvider>
    </TravelerAuthProvider>
  </React.StrictMode>
);
