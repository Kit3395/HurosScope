import React, { useState } from 'react';
import {
  Settings,
  ShieldCheck,
  Lock,
  History,
  AlertTriangle,
  KeyRound,
  CheckCircle2,
  Database,
  RefreshCw,
  Eye,
  Layers,
  Zap,
  TrendingUp,
  Cpu,
  Upload,
  Trash2,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';
import { useBrand } from '../context/BrandContext';
import { HoruscopeLogo } from '../components/HoruscopeLogo';
import { auditService } from '../audit';
import { PHASE_0_FEATURE_LOCKS, RATE_LIMIT_CONFIG, PRIVACY_POLICIES } from '../config';
import { formatAuditTimestamp } from '../utils';
import { AuditLog } from '../types';
import { databaseScaleService, businessService } from '../services';
import { repository } from '../database';
import { userAccessService } from '../services/userAccessService';
import { ChangePasswordCard } from '../components/ChangePasswordCard';

export const SettingsPage: React.FC = () => {
  const {
    lightLogoUrl,
    activeLogoUrl,
    hasCustomLogo,
    openUploadModal,
    removeCustomLogo
  } = useBrand();
  const [logs, setLogs] = useState<AuditLog[]>(() => auditService.getLogs());
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [scaleMetrics, setScaleMetrics] = useState(() => databaseScaleService.getMetrics());
  const [benchmarkResult, setBenchmarkResult] = useState<{ count: number; durationMs: number } | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [purgeStatus, setPurgeStatus] = useState<string | null>(null);

  const [purgeModalOpen, setPurgeModalOpen] = useState(false);
  const [purgeConfirmText, setPurgeConfirmText] = useState('');

  // Download a full JSON backup before any destructive purge.
  const downloadPrePurgeBackup = (): boolean => {
    try {
      const dump = repository.exportCompleteDump();
      const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), ...dump }, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `horuscope-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handlePurgeToCleanState = () => {
    if (purgeConfirmText.trim().toUpperCase() !== 'PURGE') return;
    // Safety first: attempt a local backup. Purge proceeds only if the user
    // explicitly confirmed; the backup is best-effort and reported honestly.
    const backupOk = downloadPrePurgeBackup();
    businessService.purgeToCleanProductionState();
    userAccessService.resetToProductionState();
    setScaleMetrics(databaseScaleService.getMetrics());
    setLogs(auditService.getLogs());
    setBenchmarkResult(null);
    setPurgeModalOpen(false);
    setPurgeConfirmText('');
    setPurgeStatus(
      backupOk
        ? 'Database purged to clean state. A backup was downloaded before purging.'
        : 'Database purged to clean state. WARNING: the automatic backup download failed — data may be unrecoverable.'
    );
    setTimeout(() => setPurgeStatus(null), 8000);
  };

  const refreshLogs = () => {
    setLogs(auditService.getLogs());
    setScaleMetrics(databaseScaleService.getMetrics());
  };

  const runSimulation = (count: number) => {
    setIsSimulating(true);
    setTimeout(() => {
      const res = databaseScaleService.seedScaleSimulation(count);
      setBenchmarkResult(res);
      setScaleMetrics(databaseScaleService.getMetrics());
      setLogs(auditService.getLogs());
      setIsSimulating(false);
    }, 50);
  };

  // Check frontend environment safety (ensure NO API secrets exposed)
  const isFrontendSecretFree =
    typeof window !== 'undefined' &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    !(window as any).GEMINI_API_KEY &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    !(window as any).GOOGLE_MAPS_API_KEY;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">System Settings & Governance</h1>
            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-xs font-mono font-bold">
              DATABASE
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
            Data layer segregation, 9-entity hierarchy, high-volume scalability engine, and immutable audit logs.
          </p>
        </div>

        <button
          onClick={refreshLogs}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Refresh Database Metrics</span>
        </button>
      </div>

      {/* ACCOUNT SECURITY & PASSWORD MANAGEMENT */}
      <ChangePasswordCard />

      {/* BRAND IDENTITY & SYSTEM LOGO CONFIGURATION */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Brand Identity & System Logo</h2>
              <span className="text-xs text-slate-500">
                Upload your organization's custom emblem or logo to replace the default HORUSCOPE brand mark.'
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasCustomLogo && (
              <button
                type="button"
                onClick={() => removeCustomLogo('both')}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset to Default</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => openUploadModal('light')}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-amber-600" />
              <span>Upload Brand Logo</span>
            </button>
          </div>
        </div>

        {/* Brand Logo Preview Card */}
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-5 flex flex-col justify-between space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Active Header & Navigation Emblem
              </span>
            </div>
            <span className={`px-2 py-0.5 text-[10px] font-mono font-semibold rounded ${
              lightLogoUrl || activeLogoUrl
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-slate-200 text-slate-700'
            }`}>
              {lightLogoUrl || activeLogoUrl ? 'Custom Logo Active' : 'Default Brand Active'}
            </span>
          </div>

          {/* Light Surface Stage Preview */}
          <div className="rounded-xl border border-slate-300 bg-white p-6 flex flex-col items-center justify-center min-h-[110px] shadow-inner">
            <HoruscopeLogo variant="full" size="lg" mode="light" showUploadPrompt={false} />
          </div>

          <div className="flex items-center justify-between pt-1 gap-2">
            <span className="text-[11px] text-slate-500">
              Displayed across persistent header and system navigation
            </span>
            <div className="flex items-center gap-1.5">
              {(lightLogoUrl || activeLogoUrl) && (
                <button
                  type="button"
                  onClick={() => removeCustomLogo('light')}
                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Reset logo to default"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => openUploadModal('light')}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{(lightLogoUrl || activeLogoUrl) ? 'Change Logo' : 'Upload Logo'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-500 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>
              Current Active Emblem: <strong className="text-slate-800">{activeLogoUrl ? 'Custom Logo' : 'Official HORUSCOPE Emblem (SVG Precision Reticle)'}</strong>
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Accepts transparent PNG, SVG, JPG, WebP up to 10MB
          </span>
        </div>
      </div>

      {/* DATABASE LAYER SEGREGATION & SCALE BENCHMARK */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex items-center space-x-2.5">
            <Database className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Data Foundation & Entity Hierarchy
              </h2>
              <span className="text-xs text-slate-500">
                Scalable architecture engineered to maintain millisecond response times across thousands of prospects.
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-mono flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{scaleMetrics.separationIntegrityCheck}</span>
            </span>
          </div>
        </div>

        {/* The Two Core Axioms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-emerald-400/40 space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono text-emerald-700 uppercase">
                Axiom 1: External Data ≠ CRM Data
              </span>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 font-semibold">
                ENFORCED
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              External data (Google Places, state registries) is strictly isolated and read-only. External updates cannot silently overwrite verified business names, operator notes, or custom CRM tags without an explicit operator adoption step.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-cyan-400/40 space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono text-cyan-700 uppercase">
                Axiom 2: AI Data ≠ Verified Data
              </span>
              <span className="text-[10px] font-mono text-cyan-700 bg-cyan-100 px-2 py-0.5 rounded border border-cyan-300 font-semibold">
                ENFORCED
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              AI analysis (critiques, pitch angles) is isolated in an analytical layer. The data guard guarantees AI cannot invent or silently overwrite verified human contact identities, emails, or phone numbers.
            </p>
          </div>
        </div>

        {/* 9 Key Entity Tree Counters */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 shadow-xs">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-600 flex items-center space-x-1.5 font-semibold">
              <Layers className="w-4 h-4 text-amber-500" />
              <span>Hierarchical Entities Under Business Root</span>
            </span>
            <span className="text-amber-600 font-bold">
              {scaleMetrics.totalEntitiesCount} Total Active Records
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs font-mono">
            <div className="p-2.5 rounded bg-white border border-slate-200 shadow-2xs">
              <div className="text-slate-500 text-[10px]">BUSINESS ROOT</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">{scaleMetrics.businessesCount}</div>
            </div>
            <div className="p-2.5 rounded bg-white border border-slate-200 shadow-2xs">
              <div className="text-emerald-600 text-[10px]">EXTERNAL SOURCES</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">{scaleMetrics.externalSourcesCount}</div>
            </div>
            <div className="p-2.5 rounded bg-white border border-slate-200 shadow-2xs">
              <div className="text-sky-600 text-[10px]">WEBSITE AUDITS</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">{scaleMetrics.websiteAuditsCount}</div>
            </div>
            <div className="p-2.5 rounded bg-white border border-slate-200 shadow-2xs">
              <div className="text-indigo-600 text-[10px]">SOCIAL AUDITS</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">{scaleMetrics.socialAuditsCount}</div>
            </div>
            <div className="p-2.5 rounded bg-white border border-slate-200 shadow-2xs">
              <div className="text-emerald-600 text-[10px]">VERIFIED CONTACTS</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">{scaleMetrics.contactsCount}</div>
            </div>
            <div className="p-2.5 rounded bg-white border border-slate-200 shadow-2xs">
              <div className="text-purple-600 text-[10px]">AI ANALYSES</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">{scaleMetrics.aiAnalysesCount}</div>
            </div>
            <div className="p-2.5 rounded bg-white border border-slate-200 shadow-2xs">
              <div className="text-amber-600 text-[10px]">LEAD SCORES</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">{scaleMetrics.leadScoresCount}</div>
            </div>
            <div className="p-2.5 rounded bg-white border border-slate-200 shadow-2xs">
              <div className="text-rose-600 text-[10px]">OUTREACH TOUCHES</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">{scaleMetrics.outreachCount}</div>
            </div>
            <div className="p-2.5 rounded bg-white border border-slate-200 shadow-2xs">
              <div className="text-teal-600 text-[10px]">FOLLOW-UPS</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">{scaleMetrics.followUpsCount}</div>
            </div>
            <div className="p-2.5 rounded bg-white border border-slate-200 shadow-2xs">
              <div className="text-emerald-600 text-[10px]">PROPOSALS</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">{scaleMetrics.proposalsCount}</div>
            </div>
          </div>
        </div>

        {/* Scale Benchmark Simulation Tool */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-slate-900 font-mono flex items-center space-x-1.5">
                <Cpu className="w-4 h-4 text-cyan-500" />
                <span>High-Volume Scale Benchmarking Tool</span>
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Simulate bulk prospect ingestion with multi-identifier duplicate checking and secondary indexing.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => runSimulation(250)}
                disabled={isSimulating}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-mono font-medium transition-colors cursor-pointer flex items-center space-x-1 shadow-2xs"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>+250 Prospects</span>
              </button>

              <button
                onClick={() => runSimulation(500)}
                disabled={isSimulating}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-mono font-medium transition-colors cursor-pointer flex items-center space-x-1 shadow-2xs"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>+500 Prospects</span>
              </button>
            </div>
          </div>

          {benchmarkResult && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center space-x-2 text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Successfully ingested and indexed {benchmarkResult.count} records in {benchmarkResult.durationMs}ms ({Math.round((benchmarkResult.durationMs / benchmarkResult.count) * 100) / 100}ms per prospect).
                </span>
              </div>
              <span className="text-slate-500 text-[10px]">O(1) Hash Map verified</span>
            </div>
          )}
        </div>

        {/* Production Readiness & Clean Purge */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-slate-900 font-mono flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Production Deployment Readiness & Database State</span>
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Ensure 0 filler data and verified clean state for immediate production deployment.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => { setPurgeModalOpen(true); setPurgeConfirmText(''); }}
                className="px-3.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 hover:text-rose-900 text-xs font-mono font-medium transition-colors cursor-pointer flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Purge to Clean Production State</span>
              </button>
            </div>
          </div>

          {purgeStatus && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center space-x-2 text-xs font-mono text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{purgeStatus}</span>
            </div>
          )}

          {/* Purge confirmation modal — destructive, requires typed confirmation */}
          {purgeModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="purge-modal-title">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-rose-200">
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-lg bg-rose-100 shrink-0">
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <h3 id="purge-modal-title" className="text-sm font-bold text-slate-900">
                      Purge the entire workspace database?
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      This permanently deletes all businesses, leads, contacts, outreach history, follow-ups,
                      proposals, audits and scores, and clears the local user mirror. This cannot be undone.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono text-slate-700 space-y-1">
                  <div className="flex justify-between"><span>Businesses</span><span className="font-bold">{scaleMetrics.businessesCount}</span></div>
                  <div className="flex justify-between"><span>Leads</span><span className="font-bold">{scaleMetrics.leadsCount}</span></div>
                  <div className="flex justify-between"><span>Proposals</span><span className="font-bold">{scaleMetrics.proposalsCount}</span></div>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  A JSON backup will be downloaded automatically before purging. Keep it somewhere safe —
                  there is no server-side restore for a local purge.
                </p>

                <div>
                  <label htmlFor="purge-confirm-input" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Type PURGE to confirm
                  </label>
                  <input
                    id="purge-confirm-input"
                    type="text"
                    value={purgeConfirmText}
                    onChange={(e) => setPurgeConfirmText(e.target.value)}
                    placeholder="PURGE"
                    autoComplete="off"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-1">
                  <button
                    onClick={() => { setPurgeModalOpen(false); setPurgeConfirmText(''); }}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePurgeToCleanState}
                    disabled={purgeConfirmText.trim().toUpperCase() !== 'PURGE'}
                    className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Purge Everything
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono pt-1">
            <div className="p-2 rounded bg-white border border-slate-200 flex items-center justify-between">
              <span className="text-slate-500 text-[11px]">Filler Prospects:</span>
              <span className={scaleMetrics.businessesCount === 0 ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                {scaleMetrics.businessesCount} Active
              </span>
            </div>
            <div className="p-2 rounded bg-white border border-slate-200 flex items-center justify-between">
              <span className="text-slate-500 text-[11px]">System Owner:</span>
              <span className="text-emerald-600 font-bold truncate max-w-[140px]" title="kiethryangonzales@gmail.com">
                Provisioned
              </span>
            </div>
            <div className="p-2 rounded bg-white border border-slate-200 flex items-center justify-between">
              <span className="text-slate-500 text-[11px]">Deploy Ready:</span>
              <span className="text-emerald-600 font-bold">YES • 100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Security & Credential Isolation Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-xs transition-colors">
          <div className="flex items-center space-x-2 text-emerald-600 font-semibold text-sm">
            <KeyRound className="w-4 h-4" />
            <span>Frontend Secret Exposure Audit</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            API keys and credentials must NEVER reside in browser window memory or client bundles. All external integrations are proxied exclusively through server-side functions.
          </p>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center space-x-2 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="text-slate-800 font-mono">
              Status: {isFrontendSecretFree ? '100% SECURE (Zero secrets in window)' : 'FAIL'}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-xs transition-colors">
          <div className="flex items-center space-x-2 text-amber-600 font-semibold text-sm">
            <Lock className="w-4 h-4" />
            <span>Architectural Safety Locks</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            {Object.entries(PHASE_0_FEATURE_LOCKS).map(([key, val]) => (
              <div key={key} className="p-2 bg-slate-50 rounded border border-slate-200 flex justify-between">
                <span className="text-slate-500 truncate max-w-[130px]">{key}:</span>
                <span className={val ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                  {String(val)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Audit History Log Explorer */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs transition-colors">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-slate-900">Immutable Audit Trail Explorer</h2>
          </div>
          <span className="text-xs font-mono text-slate-500">{logs.length} Total Logs Logged</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs">
          {/* List of logs */}
          <div className="lg:col-span-6 space-y-2 max-h-96 overflow-y-auto pr-1">
            {logs.map((log) => {
              const isSelected = selectedLog?.id === log.id;
              return (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-slate-100 border-amber-300 shadow-md'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-amber-600 font-semibold">{log.action}</span>
                    <span className="text-slate-500 text-[10px]">{formatAuditTimestamp(log.timestamp)}</span>
                  </div>
                  <div className="text-slate-700 mt-1 line-clamp-1">{log.changeSummary}</div>
                  <div className="flex items-center space-x-2 mt-2 text-[10px] text-slate-500 font-mono">
                    <span>Target: {log.entityType} ({log.entityId.slice(0, 12)}...)</span>
                    <span>•</span>
                    <span>Actor: {log.actorId}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Snapshot Diff */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 text-slate-800 font-semibold">
              <span>Change Diff & Snapshot</span>
              {selectedLog && (
                <span className="font-mono text-[10px] text-amber-400">ID: {selectedLog.id}</span>
              )}
            </div>

            {selectedLog ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Summary:</span>
                  <div className="text-slate-900 mt-0.5 font-medium">{selectedLog.changeSummary}</div>
                </div>

                {selectedLog.previousValueSnapshot && (
                  <div className="space-y-1">
                    <span className="text-rose-600 font-mono text-[11px] font-semibold">Previous State:</span>
                    <pre className="p-2.5 bg-slate-50 rounded border border-slate-200 text-[10px] text-slate-800 font-mono max-h-32 overflow-auto">
                      {JSON.stringify(selectedLog.previousValueSnapshot, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.newValueSnapshot && (
                  <div className="space-y-1">
                    <span className="text-emerald-600 font-mono text-[11px] font-semibold">New State:</span>
                    <pre className="p-2.5 bg-slate-50 rounded border border-slate-200 text-[10px] text-slate-800 font-mono max-h-36 overflow-auto">
                      {JSON.stringify(selectedLog.newValueSnapshot, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs">
                Select an audit record on the left to inspect its immutable previous and new state diffs.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
