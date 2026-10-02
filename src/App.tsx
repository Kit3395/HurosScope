import React, { useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SystemHealthBar } from './components/SystemHealthBar';
import { Navigation } from './components/Navigation';
import { HumanApprovalModal } from './components/HumanApprovalModal';
import { LogoUploadModal } from './components/LogoUploadModal';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BrandProvider } from './context/BrandContext';

import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { MapPage } from './pages/MapPage';
import { LeadsPage } from './pages/LeadsPage';
import { IntelligencePage } from './pages/IntelligencePage';
import { ContactsPage } from './pages/ContactsPage';
import { OutreachPage } from './pages/OutreachPage';
import { ProposalsPage } from './pages/ProposalsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AutomationsPage } from './pages/AutomationsPage';
import { SecurityPage } from './pages/SecurityPage';
import { SettingsPage } from './pages/SettingsPage';
import { UserAccessPage } from './pages/UserAccessPage';
import { LeadPipelineStatus } from './types';

function AppShell() {
  const { isAuthenticated, isLoading } = useAuth();
  const [activePage, setActivePage] = useState<string>('dashboard');
  const [navParams, setNavParams] = useState<{
    leadId?: string;
    filterStatus?: LeadPipelineStatus;
  }>({});

  const handleNavigate = (
    page: string,
    params?: { leadId?: string; filterStatus?: LeadPipelineStatus }
  ) => {
    setActivePage(page);
    setNavParams(params || {});
  };

  // While the session is being restored, show a branded splash instead of
  // flashing the login gate (or a blank screen) for valid sessions.
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center animate-pulse">
            <span className="text-amber-400 font-black text-lg">H</span>
          </div>
          <span className="text-xl font-black tracking-tight">HORUSCOPE</span>
        </div>
        <p className="text-xs text-slate-400 mt-3 font-mono">Restoring your session…</p>
      </div>
    );
  }

  // If user is not authenticated, show the secure Landing & Sign In portal
  if (!isAuthenticated) {
    return <LandingPage />;
  }

  const renderActivePage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage onNavigate={handleNavigate} />;
      case 'map':
        return <MapPage onNavigate={handleNavigate} />;
      case 'discover':
        return <DiscoverPage onNavigate={handleNavigate} />;
      case 'leads':
        return (
          <LeadsPage
            key={`${navParams.leadId || ''}-${navParams.filterStatus || ''}`}
            initialLeadId={navParams.leadId}
            initialFilterStatus={navParams.filterStatus}
          />
        );
      case 'intelligence':
        return <IntelligencePage />;
      case 'contacts':
        return <ContactsPage />;
      case 'outreach':
        return <OutreachPage />;
      case 'proposals':
        return <ProposalsPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'automations':
        return <AutomationsPage />;
      case 'users':
        return <UserAccessPage />;
      case 'security':
        return <SecurityPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="app-workspace min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Global Human Approval Gate Modal */}
      <HumanApprovalModal />

      {/* Persistent Visible System Status & Health Area */}
      <SystemHealthBar />

      {/* Main Application Shell with Sidebar Navigation */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Primary Navigation - Fixed on desktop */}
        <Navigation
          activePage={activePage}
          onSelectPage={(page) => handleNavigate(page, {})}
        />

        {/* View Container - Offset by sidebar width on desktop */}
        <main className="flex-1 lg:pl-60 overflow-y-auto p-6 sm:p-8 lg:p-12 bg-slate-50 min-w-0">
          <ErrorBoundary fallbackTitle="View Failed to Render">
            {renderActivePage()}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BrandProvider>
          <AuthProvider>
            <LogoUploadModal />
            <AppShell />
          </AuthProvider>
        </BrandProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

