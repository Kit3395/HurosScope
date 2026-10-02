import React, { useState, useEffect } from 'react';
import {
  Activity,
  Database,
  Cpu,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  X,
  Lock,
  Layers,
  Clock,
} from 'lucide-react';
import { SystemHealth } from '../types';
import { systemHealthService } from '../services';
import { formatAuditTimestamp } from '../utils';
import { HoruscopeLogo } from './HoruscopeLogo';
import { McpInspectorModal } from './mcp/McpInspectorModal';

export const SystemHealthBar: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth>(() => systemHealthService.getStatus());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMcpModalOpen, setIsMcpModalOpen] = useState(false);
  const [lastSyncDisplay, setLastSyncDisplay] = useState<string>('Just now');

  const refreshStatus = () => {
    const updated = systemHealthService.getStatus();
    setHealth(updated);
    setLastSyncDisplay(new Date().toLocaleTimeString());
  };

  useEffect(() => {
    refreshStatus();
    // Non-aggressive interval: every 30 seconds
    const interval = setInterval(refreshStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Top Persistent System Status Area */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 text-xs px-4 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-4 select-none shadow-xs transition-colors">
        {/* Left: Official Horuscope Brand */}
        <div className="flex items-center space-x-3 shrink-0">
          <HoruscopeLogo variant="full" size="md" showUploadPrompt={true} />
        </div>

        {/* Center: Live System Indicators */}
        <div className="flex items-center space-x-4 sm:space-x-6 text-slate-700">
          {/* API Status */}
          <div className="flex items-center space-x-1.5" title="Backend Server & API Connectivity">
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-slate-500 hidden md:inline">API:</span>
            <span className="text-emerald-600 font-semibold">{health.apiStatus}</span>
          </div>

          {/* Database Status */}
          <div className="flex items-center space-x-1.5" title="Stable In-Memory / Local Repository Status">
            <Database className="w-3.5 h-3.5 text-cyan-600" />
            <span className="text-slate-500 hidden md:inline">DB:</span>
            <span className="text-cyan-600 font-semibold">{health.databaseStatus}</span>
          </div>

          {/* AI Status */}
          <div className="flex items-center space-x-1.5" title="Analytical AI Guardrails Active">
            <Cpu className="w-3.5 h-3.5 text-purple-600" />
            <span className="text-slate-500 hidden md:inline">AI:</span>
            <span className="text-purple-600 font-semibold">{health.aiStatus}</span>
          </div>

          {/* Last Synchronization */}
          <div className="hidden lg:flex items-center space-x-1.5 text-slate-500" title="Last State Heartbeat">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Sync:</span>
            <span className="font-mono text-slate-800">{lastSyncDisplay}</span>
          </div>

          {/* Errors Counter */}
          <div className="flex items-center space-x-1.5" title="Active Unresolved Errors">
            <AlertTriangle className={`w-3.5 h-3.5 ${health.errorCount === 0 ? 'text-slate-400' : 'text-rose-600'}`} />
            <span className="text-slate-500 hidden sm:inline">Errors:</span>
            <span className={`font-semibold font-mono ${health.errorCount === 0 ? 'text-slate-600' : 'text-rose-600'}`}>
              {health.errorCount}
            </span>
          </div>
        </div>

        {/* Right: System Health Drawer Button & Refresh */}
        <div className="flex items-center space-x-2">
          <button
            id="mcp-gateway-inspector-trigger"
            onClick={() => setIsMcpModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-medium transition-colors cursor-pointer text-xs"
            title="Inspect Model Context Protocol (MCP) Governance, Schemas & Telemetry"
          >
            <Cpu className="w-3.5 h-3.5 text-indigo-600" />
            <span>MCP Gateway</span>
          </button>

          <button
            id="system-health-modal-trigger"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-medium transition-colors cursor-pointer text-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>System Health</span>
          </button>

          <button
            id="refresh-health-btn"
            onClick={refreshStatus}
            title="Refresh Health Status"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* MCP Inspector Modal */}
      <McpInspectorModal
        isOpen={isMcpModalOpen}
        onClose={() => setIsMcpModalOpen(false)}
      />

      {/* System Health Detailed Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">System Health & Safety Center</h2>
                  <p className="text-xs text-slate-500">Architectural Status & Core Safety Invariants</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Health Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">API Connectivity</div>
                <div className="mt-1 text-base font-bold text-emerald-600 flex items-center space-x-1.5">
                  <Activity className="w-4 h-4" />
                  <span>{health.apiStatus}</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Express / Vite Proxy</div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Repository / DB</div>
                <div className="mt-1 text-base font-bold text-cyan-600 flex items-center space-x-1.5">
                  <Database className="w-4 h-4" />
                  <span>{health.databaseStatus}</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Soft-delete enabled</div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">AI Safety Engine</div>
                <div className="mt-1 text-base font-bold text-purple-600 flex items-center space-x-1.5">
                  <Cpu className="w-4 h-4" />
                  <span>{health.aiStatus}</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Non-fabrication active</div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Error Count</div>
                <div className="mt-1 text-base font-bold text-slate-800 flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4 text-emerald-500" />
                  <span>{health.errorCount}</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">0 unhandled exceptions</div>
              </div>
            </div>

            {/* Rate Limits Section */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                <span className="flex items-center space-x-1.5">
                  <Lock className="w-4 h-4 text-amber-500" />
                  <span>Active Rate Limit Budgets</span>
                </span>
                <span className="text-[11px] text-slate-500">Sliding Window Protection</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 bg-white rounded border border-slate-200">
                  <div className="text-slate-500 text-[11px]">Places API Remaining:</div>
                  <div className="text-sm font-mono font-bold text-emerald-600">
                    {health.activeRateLimits.googlePlacesBudgetRemaining} / 60 req/min
                  </div>
                </div>
                <div className="p-2.5 bg-white rounded border border-slate-200">
                  <div className="text-slate-500 text-[11px]">AI Generation Budget:</div>
                  <div className="text-sm font-mono font-bold text-purple-600">
                    {health.activeRateLimits.aiTokenBudgetRemaining} / 15 req/min
                  </div>
                </div>
                <div className="p-2.5 bg-white rounded border border-slate-200">
                  <div className="text-slate-500 text-[11px]">Web Audit Queue:</div>
                  <div className="text-sm font-mono font-bold text-cyan-600">
                    {health.activeRateLimits.webAuditQueueSize} queued
                  </div>
                </div>
              </div>
            </div>

            {/* 6 Category Data Integrity Principle */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center space-x-2 text-xs font-semibold text-amber-600">
                <Layers className="w-4 h-4" />
                <span>Core Architectural Principle: 6 Strict Data Categories</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                The database enforces structural segregation so that external data, AI assessments, and verified user CRM records are stored in dedicated sub-domains. AI can never silently overwrite verified user entries.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                <span className="px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded">1. External Source (Official APIs)</span>
                <span className="px-2 py-1 bg-purple-50 border border-purple-200 text-purple-700 rounded">2. AI Analysis (Confidence-tagged)</span>
                <span className="px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded">3. User CRM (Verified Data)</span>
                <span className="px-2 py-1 bg-cyan-50 border border-cyan-200 text-cyan-700 rounded">4. App Generated (Scores & Stages)</span>
                <span className="px-2 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded">5. System Config (Locks & Limits)</span>
                <span className="px-2 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded">6. Audit History (Immutable)</span>
              </div>
            </div>

            {/* Storage Counts */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 border-t border-slate-200 pt-3">
              <span>Businesses: <strong className="text-slate-900">{health.storageStatus.businessesCount}</strong></span>
              <span>Leads: <strong className="text-slate-900">{health.storageStatus.leadsCount}</strong></span>
              <span>Contacts: <strong className="text-slate-900">{health.storageStatus.contactsCount}</strong></span>
              <span>Audit Entries: <strong className="text-slate-900">{health.storageStatus.auditLogsCount}</strong></span>
              <span className="font-mono text-[10px] text-slate-400">Last Synced: {formatAuditTimestamp(health.lastSynchronization)}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
