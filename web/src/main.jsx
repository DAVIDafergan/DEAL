import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './AppShell.jsx';
import { PublicLayout } from './components/PublicLayout.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
import { AgentAuthProvider } from './context/AgentAuthContext.jsx';
import { TravelerAuthProvider } from './context/TravelerAuthContext.jsx';
import { AccessibilityWidget } from './components/AccessibilityWidget.jsx';
import { RouteLoading } from './components/RouteLoading.jsx';
import './index.css';

// 10.1: every page below AppShell (home) is route-split into its own chunk instead of one
// 595KB bundle — a visitor only pays for the home page's code on first load; the dashboard,
// admin panel, legal pages, etc. only download when actually visited. AppShell itself (home)
// stays a static import — it's the single most common landing page, so lazy-loading it would
// only add a loading flash with no real benefit. See DECISIONS.md 10.1.
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx').then((m) => ({ default: m.RegisterPage })));
const AdminPage = lazy(() => import('./pages/AdminPage.jsx').then((m) => ({ default: m.AdminPage })));
const OwnerRegisterPage = lazy(() => import('./pages/OwnerRegisterPage.jsx').then((m) => ({ default: m.OwnerRegisterPage })));
const OwnerLoginPage = lazy(() => import('./pages/OwnerLoginPage.jsx').then((m) => ({ default: m.OwnerLoginPage })));
const OwnerDashboardPage = lazy(() => import('./pages/OwnerDashboardPage.jsx').then((m) => ({ default: m.OwnerDashboardPage })));
const OwnerSettingsPage = lazy(() => import('./pages/OwnerSettingsPage.jsx').then((m) => ({ default: m.OwnerSettingsPage })));
const OwnerBookingsPage = lazy(() => import('./pages/OwnerBookingsPage.jsx').then((m) => ({ default: m.OwnerBookingsPage })));
const OwnerPublicProfilePage = lazy(() => import('./pages/OwnerPublicProfilePage.jsx').then((m) => ({ default: m.OwnerPublicProfilePage })));
const PropertyPage = lazy(() => import('./pages/PropertyPage.jsx').then((m) => ({ default: m.PropertyPage })));
const RemovePage = lazy(() => import('./pages/RemovePage.jsx').then((m) => ({ default: m.RemovePage })));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage.jsx').then((m) => ({ default: m.FavoritesPage })));
const BookingStatusPage = lazy(() => import('./pages/BookingStatusPage.jsx').then((m) => ({ default: m.BookingStatusPage })));
const MyBookingsPage = lazy(() => import('./pages/MyBookingsPage.jsx').then((m) => ({ default: m.MyBookingsPage })));
const ComparePage = lazy(() => import('./pages/ComparePage.jsx').then((m) => ({ default: m.ComparePage })));
const SeoLandingPage = lazy(() => import('./pages/SeoLandingPage.jsx').then((m) => ({ default: m.SeoLandingPage })));
const AccountPage = lazy(() => import('./pages/AccountPage.jsx').then((m) => ({ default: m.AccountPage })));
const TermsPage = lazy(() => import('./pages/TermsPage.jsx').then((m) => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage.jsx').then((m) => ({ default: m.PrivacyPage })));
const TravelerRegisterPage = lazy(() => import('./pages/TravelerRegisterPage.jsx').then((m) => ({ default: m.TravelerRegisterPage })));
const TravelerLoginPage = lazy(() => import('./pages/TravelerLoginPage.jsx').then((m) => ({ default: m.TravelerLoginPage })));
const AccessibilityPage = lazy(() => import('./pages/AccessibilityPage.jsx').then((m) => ({ default: m.AccessibilityPage })));
const ContactPage = lazy(() => import('./pages/ContactPage.jsx').then((m) => ({ default: m.ContactPage })));

// 9.8: the whole route tree, mounted twice below (once at "/", once at "/en") — paths here are
// relative (no leading "/") so they resolve against whichever base matched. LanguageProvider
// (mounted once, above both) derives the active language from the URL prefix, so this is the
// only place that needs to know about "/en" at all; everywhere else just uses <Link> (aliased
// to LocalizedLink, see components/LocalizedLink.jsx) with ordinary absolute-looking paths.
function RouteTree() {
  return (
    <Suspense fallback={<RouteLoading />}>
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
    </Suspense>
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
