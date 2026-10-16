import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import { Shell } from './components/Shell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { ResumeUpload } from './pages/ResumeUpload';
import { JobDescription } from './pages/JobDescription';
import { Configure } from './pages/Configure';
import { Interview } from './pages/Interview';
import { Report } from './pages/Report';
import { History } from './pages/History';
import { Landing } from './pages/Landing';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Auth mode="login" onAuthenticated={() => {}} />} />
      <Route path="/signup" element={<Auth mode="signup" onAuthenticated={() => {}} />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/interview/:id" element={<Interview />} />
        <Route element={<Shell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/resume" element={<ResumeUpload />} />
          <Route path="/jd" element={<JobDescription />} />
          <Route path="/configure" element={<Configure />} />
          <Route path="/history" element={<History />} />
          <Route path="/report/:id" element={<Report />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </BrowserRouter>,
);
