import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { VideoLibraryPage } from './pages/VideoLibraryPage';
import { AnalysisDetailPage } from './pages/AnalysisDetailPage';
import { AssistantPage } from './pages/AssistantPage';
import { DashboardPage } from './pages/DashboardPage';
import { DoorbellFeedPage } from './pages/DoorbellFeedPage';
import { DailySummaryPage } from './pages/DailySummaryPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/feed" element={<DoorbellFeedPage />} />
          <Route path="/videos" element={<VideoLibraryPage />} />
          <Route path="/summary" element={<DailySummaryPage />} />
          <Route path="/analysis/:id" element={<AnalysisDetailPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

export default App;
