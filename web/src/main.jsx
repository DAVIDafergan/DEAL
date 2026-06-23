import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './AppShell.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
import { AgentAuthProvider } from './context/AgentAuthContext.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { AgentRegisterPage } from './pages/AgentRegisterPage.jsx';
import { AgentLoginPage } from './pages/AgentLoginPage.jsx';
import { AgentDashboardPage } from './pages/AgentDashboardPage.jsx';
import { AgentSettingsPage } from './pages/AgentSettingsPage.jsx';
import { AdminPage } from './pages/AdminPage.jsx';
import { AgentPublicProfilePage } from './pages/AgentPublicProfilePage.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>
      <AgentAuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/agent/register" element={<AgentRegisterPage />} />
            <Route path="/agent/login" element={<AgentLoginPage />} />
            <Route path="/agent/dashboard/settings" element={<AgentSettingsPage />} />
            <Route path="/agent/dashboard" element={<AgentDashboardPage />} />
            <Route path="/agent/:slug" element={<AgentPublicProfilePage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/*" element={<AppShell />} />
          </Routes>
        </BrowserRouter>
      </AgentAuthProvider>
    </LanguageProvider>
  </React.StrictMode>
);
