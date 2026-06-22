import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { App } from './App.jsx';
import { VibeOnboarding } from './vibe/VibeOnboarding.jsx';
import { VibeFeedPage } from './vibe/VibeFeedPage.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<VibeOnboarding />} />
          <Route path="/:vibe" element={<VibeFeedPage />} />
          <Route path="/search" element={<App />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  </React.StrictMode>
);
