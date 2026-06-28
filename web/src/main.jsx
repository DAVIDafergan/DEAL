import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './AppShell.jsx';
import { PublicLayout } from './components/PublicLayout.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
import { AgentAuthProvider } from './context/AgentAuthContext.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { AgentRegisterPage } from './pages/AgentRegisterPage.jsx';
import { AgentLoginPage } from './pages/AgentLoginPage.jsx';
import { AgentDashboardPage } from './pages/AgentDashboardPage.jsx';
import { AgentSettingsPage } from './pages/AgentSettingsPage.jsx';
import { AdminPage } from './pages/AdminPage.jsx';
import { AgentPublicProfilePage } from './pages/AgentPublicProfilePage.jsx';
import { FavoritesPage } from './pages/FavoritesPage.jsx';
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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>
      <TravelerAuthProvider>
      <AgentAuthProvider>
        <BrowserRouter>
          <AccessibilityWidget />
          <Routes>
            {/* Routes with shared public header */}
            <Route element={<PublicLayout />}>
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/register/traveler" element={<TravelerRegisterPage />} />
              <Route path="/register/traveler/login" element={<TravelerLoginPage />} />
              <Route path="/agent/register" element={<AgentRegisterPage />} />
              <Route path="/agent/login" element={<AgentLoginPage />} />
              <Route path="/agent/dashboard/settings" element={<AgentSettingsPage />} />
              <Route path="/agent/dashboard" element={<AgentDashboardPage />} />
              <Route path="/agent/:slug" element={<AgentPublicProfilePage />} />
              <Route path="/my/favorites" element={<FavoritesPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/accessibility" element={<AccessibilityPage />} />
              <Route path="/contact" element={<ContactPage />} />
            </Route>

            {/* Admin — its own full-screen layout */}
            <Route path="/admin" element={<AdminPage />} />

            {/* App shell — 3 tabs (home/reels/plan), header lives inside AppShell */}
            <Route path="/*" element={<AppShell />} />
          </Routes>
        </BrowserRouter>
      </AgentAuthProvider>
      </TravelerAuthProvider>
    </LanguageProvider>
  </React.StrictMode>
);
