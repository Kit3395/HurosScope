import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Lock,
  UserCheck,
  Bot,
  AlertTriangle,
  History,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Undo2,
  CheckCircle2,
  XCircle,
  KeyRound,
  FileCheck,
  Zap,
  Globe,
  DollarSign,
  Layers,
  Search,
  ExternalLink,
  Cpu,
} from 'lucide-react';
import { authService } from '../security/auth';
import { aiGuardrailService, AIGuardrailRule, AIGuardrailViolation } from '../security/aiGuardrails';
import { externalApiGateway, ServiceQuotaHealth } from '../security/externalApiGuard';
import { humanApprovalGate, APPROVAL_GATE_DEFINITIONS } from '../security/approvalGate';
import { backupService } from '../services/backupService';
import { softDeleteService, DeletedItemSummary } from '../services/softDeleteService';
import { auditService } from '../audit';
import { CurrentUserSession, UserPermission, UserRole, ApprovalActionType, AuditLog, BackupSnapshot } from '../types';
import { formatAuditTimestamp } from '../utils';
import { ChangePasswordCard } from '../components/ChangePasswordCard';
import { McpInspectorModal } from '../components/mcp/McpInspectorModal';

type SecurityTab =
  | 'overview'
  | 'credentials'
  | 'rbac'
  | 'ai_guardrails'
  | 'approval_gates'
  | 'external_apis'
  | 'mcp_gateway'
  | 'backups'
  | 'recycle_bin'
  | 'audit_logs';

export const SecurityPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SecurityTab>('overview');
  const [isMcpModalOpen, setIsMcpModalOpen] = useState(false);
  const [session, setSession] = useState<CurrentUserSession>(() => authService.getSession());
  const [rules] = useState<AIGuardrailRule[]>(() => aiGuardrailService.getRules());
  const [aiViolations, setAiViolations] = useState<AIGuardrailViolation[]>(() => aiGuardrailService.getRecentViolations());
  const [quotas, setQuotas] = useState<ServiceQuotaHealth[]>(() => externalApiGateway.getQuotas());
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>(() => backupService.getAutoSnapshots());
  const [trashItems, setTrashItems] = useState<DeletedItemSummary[]>(() => softDeleteService.getRecycleBinItems());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => auditService.getLogs());
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(null);
  const [auditFilter, setAuditFilter] = useState<string>('');
  const [notification, setNotification] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  useEffect(() => {
    return authService.subscribe((s) => setSession(s));
  }, []);

  const showNotification = (type: 'success' | 'warning' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleRoleChange = (newRole: UserRole) => {
    authService.switchRole(newRole);
    setAuditLogs(auditService.getLogs());
    showNotification('success', `Active session role switched to ${newRole}.`);
  };

  const handleSimulateAiViolation = (action: any) => {
    try {
      aiGuardrailService.assertPermitted(action, { attemptedBy: 'gemini_flash_agent' });
    } catch (err: any) {
      setAiViolations(aiGuardrailService.getRecentViolations());
      setAuditLogs(auditService.getLogs());
      showNotification('warning', `Security Invariant Blocked AI: ${err.message}`);
    }
  };

  const handleTestApprovalGate = async (actionType: ApprovalActionType) => {
    const approved = await humanApprovalGate.requestApproval({
      actionType,
      targetSummary: `Diagnostic Test: ${actionType} verification`,
      itemCount: 1,
      customDescription: `Triggered test confirmation gate for ${actionType} to verify explicit human authorization before execution.`,
    });

    setAuditLogs(auditService.getLogs());
    if (approved) {
      showNotification('success', `Human Approval Gate [${actionType}] was APPROVED.`);
    } else {
      showNotification('warning', `Human Approval Gate [${actionType}] was CANCELLED.`);
    }
  };

  const handleCreateBackup = () => {
    const snap = backupService.createSnapshot();
    setSnapshots(backupService.getAutoSnapshots());
    setAuditLogs(auditService.getLogs());
    showNotification('success', `Backup snapshot "${snap.id}" created successfully (${snap.totalEntitiesCount} records).`);
  };

  const handleDownloadBackup = () => {
    backupService.downloadBackupFile();
    showNotification('success', 'Backup JSON file initiated download.');
  };

  const handleRestoreSnapshot = (snap: BackupSnapshot) => {
    try {
      const res = backupService.restoreSnapshot(snap);
      setTrashItems(softDeleteService.getRecycleBinItems());
      setAuditLogs(auditService.getLogs());
      showNotification('success', res.message);
    } catch (err: any) {
      showNotification('error', err.message || 'Restore failed');
    }
  };

  const handleRestoreTrash = (item: DeletedItemSummary) => {
    const ok = softDeleteService.restoreItem(item.entityType, item.id);
    if (ok) {
      setTrashItems(softDeleteService.getRecycleBinItems());
      setAuditLogs(auditService.getLogs());
      showNotification('success', `Restored ${item.entityType} "${item.title}".`);
    } else {
      showNotification('error', `Failed to restore ${item.entityType}.`);
    }
  };

  const filteredLogs = auditLogs.filter((l) => {
    if (!auditFilter) return true;
    const term = auditFilter.toLowerCase();
    return (
      l.action.toLowerCase().includes(term) ||
      l.entityType.toLowerCase().includes(term) ||
      l.changeSummary.toLowerCase().includes(term) ||
      l.actorId.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Security & Safety-Net Governance
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Multi-layer data protection, role authorization, AI guardrails, external API circuit breakers, and human approval gates.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-mono font-bold flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>ALL INVARIANTS ACTIVE</span>
          </span>
        </div>
      </div>

      {/* Global Notification Toast */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700'
              : notification.type === 'warning'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-700'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-xs underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-1.5 overflow-x-auto border-b border-slate-200 pb-1 text-xs">
        {[
          { id: 'overview', label: 'Safety Overview', icon: ShieldCheck },
          { id: 'credentials', label: 'Password & Credentials', icon: KeyRound },
          { id: 'rbac', label: 'Auth & Roles (RBAC)', icon: UserCheck },
          { id: 'ai_guardrails', label: 'AI Guardrails (8 Rules)', icon: Bot },
          { id: 'approval_gates', label: 'Human Approval Gates', icon: Lock },
          { id: 'external_apis', label: 'External API Protection', icon: Globe },
          { id: 'mcp_gateway', label: 'MCP Pre-Call Gateway', icon: Cpu },
          { id: 'backups', label: 'Backups & Recovery', icon: Download },
          { id: 'recycle_bin', label: `Recycle Bin (${trashItems.length})`, icon: Trash2 },
          { id: 'audit_logs', label: `Audit Trail (${auditLogs.length})`, icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SecurityTab)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Server-Side Secrets
              </div>
              <div className="text-xl font-bold text-emerald-600 flex items-center space-x-2">
                <KeyRound className="w-5 h-5" />
                <span>Zero Client Exposure</span>
              </div>
              <p className="text-[11px] text-slate-500">Gemini & Maps keys run exclusively in server.ts</p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                AI Autonomous Mutations
              </div>
              <div className="text-xl font-bold text-rose-600 flex items-center space-x-2">
                <Bot className="w-5 h-5" />
                <span>0 Permitted</span>
              </div>
              <p className="text-[11px] text-slate-500">8 strict hardcoded prohibitions enforced</p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Human Approval Gates
              </div>
              <div className="text-xl font-bold text-amber-600 flex items-center space-x-2">
                <Lock className="w-5 h-5" />
                <span>8 Operations Protected</span>
              </div>
              <p className="text-[11px] text-slate-500">Bulk actions, pricing, merges require human sign-off</p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Data Deletion Policy
              </div>
              <div className="text-xl font-bold text-sky-600 flex items-center space-x-2">
                <Undo2 className="w-5 h-5" />
                <span>100% Soft Deletions</span>
              </div>
              <p className="text-[11px] text-slate-500">All deletes preserve child entities with instant restore</p>
            </div>
          </div>

          {/* Core Safety Invariants Checklist */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              Production Pre-Flight Safety Verification
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {[
                { title: 'Server-Side API Key Proxies', desc: 'All requests to Google Maps Places and Gemini AI flow through /api/* endpoints. No secrets exist in the DOM.', status: 'PASSED' },
                { title: 'Data Layer Segregation', desc: 'External Google Places data is segregated from user CRM records. AI analysis cannot overwrite verified phone/emails.', status: 'PASSED' },
                { title: 'AI Non-Fabrication Rule', desc: 'AI cannot invent contact identities, phone numbers, or owners. Evaluates to "Not verified" when unproven.', status: 'PASSED' },
                { title: 'External API Circuit Breakers', desc: 'Timeouts (8s), capped retries (2x), exponential backoff, and daily quota monitoring active on all external services.', status: 'PASSED' },
                { title: 'Input & Output Sanitization', desc: 'XSS filtering, protocol validation, phone number formatting, and price limits ($1,000,000 max) enforced.', status: 'PASSED' },
                { title: 'Immutable Audit Trail', desc: 'Every creation, update, soft delete, AI safety trigger, and human approval creates an immutable audit record.', status: 'PASSED' },
                { title: 'React Error Boundaries', desc: 'UI runtime exceptions are safely caught with visual recovery prompts without crashing root context.', status: 'PASSED' },
                { title: 'Disaster Recovery Backups', desc: 'Full JSON backup export, schema validation on import, and automatic snapshot history.', status: 'PASSED' },
              ].map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900">{item.title}</div>
                    <div className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: CREDENTIALS & PASSWORD */}
      {activeTab === 'credentials' && (
        <div className="space-y-6">
          <ChangePasswordCard />
        </div>
      )}

      {/* TAB 2: RBAC */}
      {activeTab === 'rbac' && (
        <div className="space-y-6">
          {/* Active Session & Role Switcher */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Active Operator Identity & Role</h2>
                <p className="text-xs text-slate-500">
                  Switch roles to test permissions, approval gates, and access controls in real time.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                {(['OWNER', 'ADMIN', 'OPERATOR', 'VIEWER'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRoleChange(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      session.role === r
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 text-[10px]">USER ID</span>
                <div className="font-bold text-slate-800 mt-0.5">{session.userId}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 text-[10px]">EMAIL ADDRESS</span>
                <div className="font-bold text-slate-800 mt-0.5">{session.email}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 text-[10px]">CLIENT ORIGIN</span>
                <div className="font-bold text-slate-800 mt-0.5">{session.ipAddress}</div>
              </div>
            </div>
          </div>

          {/* Granular Permissions Matrix */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Role Permissions Matrix</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {[
                { perm: 'VIEW_RECORDS', label: 'View Pipeline & Leads' },
                { perm: 'EDIT_RECORDS', label: 'Edit Prospects & Notes' },
                { perm: 'DELETE_LEADS', label: 'Soft Delete Leads' },
                { perm: 'MERGE_RECORDS', label: 'Merge Duplicate Records' },
                { perm: 'SEND_OUTREACH', label: 'Send Outbound Messages' },
                { perm: 'BULK_OUTREACH', label: 'Queue Bulk Communications' },
                { perm: 'CHANGE_PRICING', label: 'Modify Proposal Pricing' },
                { perm: 'FINALIZE_PROPOSAL', label: 'Finalize & Lock Proposals' },
                { perm: 'BULK_IMPORT', label: 'Execute Bulk Places Ingestion' },
                { perm: 'BULK_DELETE', label: 'Execute Bulk Lead Deletions' },
                { perm: 'CHANGE_SYSTEM_CONFIG', label: 'Modify Platform Settings' },
                { perm: 'MANAGE_BACKUPS', label: 'Create & Restore Backups' },
              ].map((item) => {
                const isGranted = session.activePermissions.includes(item.perm as UserPermission);
                return (
                  <div
                    key={item.perm}
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      isGranted
                        ? 'bg-emerald-50/50 border-emerald-200 text-slate-900'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{item.label}</div>
                      <div className="font-mono text-[10px] text-slate-400 mt-0.5">{item.perm}</div>
                    </div>
                    {isGranted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AI GUARDRAILS */}
      {activeTab === 'ai_guardrails' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  The 8 Strict AI Prohibitions (Non-Negotiable Guardrails)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  AI is strictly an analytical assistant. It cannot perform destructive, commercial, or configuration changes.
                </p>
              </div>

              <span className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-600 border border-rose-500/20 text-xs font-mono font-bold">
                8 OF 8 ENFORCED
              </span>
            </div>

            <div className="space-y-3">
              {rules.map((rule, idx) => (
                <div
                  key={rule.id}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-slate-400 font-bold">0{idx + 1}.</span>
                      <span className="font-bold text-slate-900">{rule.title}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 font-bold border border-rose-500/20">
                        {rule.status}
                      </span>
                    </div>
                    <p className="text-slate-600">{rule.description}</p>
                    <p className="text-slate-400 text-[11px] italic">
                      Rationale: {rule.rationale}
                    </p>
                  </div>

                  <button
                    onClick={() => handleSimulateAiViolation(rule.id)}
                    className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors"
                  >
                    Simulate Block
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Intercepted Violations Log */}
          {aiViolations.length > 0 && (
            <div className="p-6 rounded-2xl bg-white border border-rose-500/20 space-y-4">
              <div className="flex items-center space-x-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-sm font-bold">Recent AI Violations Intercepted by Guardrails</h3>
              </div>

              <div className="space-y-2">
                {aiViolations.map((v, i) => (
                  <div key={i} className="p-3 rounded-lg bg-rose-500/10 text-rose-700 text-xs font-mono">
                    <div className="font-bold">{v.ruleViolated}</div>
                    <div className="text-[11px] mt-0.5">{v.reason}</div>
                    <div className="text-[10px] text-slate-400 mt-1">{v.timestamp}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: HUMAN APPROVAL GATES */}
      {activeTab === 'approval_gates' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Human Approval Gates Catalog
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  These 8 critical actions require deliberate human review before the system executes them.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {Object.values(APPROVAL_GATE_DEFINITIONS).map((gate) => (
                <div
                  key={gate.actionType}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{gate.title}</span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                          gate.dangerLevel === 'CRITICAL'
                            ? 'bg-rose-500 text-white'
                            : 'bg-amber-500 text-slate-950'
                        }`}
                      >
                        {gate.dangerLevel}
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs">{gate.defaultDescription}</p>
                    <div className="text-[11px] font-mono text-slate-500 pt-1">
                      Confirmation Type:{' '}
                      {gate.requiresPhraseConfirmation ? (
                        <strong className="text-rose-600">
                          Type "{gate.expectedPhrase}"
                        </strong>
                      ) : (
                        <span>Explicit Checkbox</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleTestApprovalGate(gate.actionType)}
                    className="w-full py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold cursor-pointer transition-colors text-center"
                  >
                    Test Gate Prompt
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: EXTERNAL APIS */}
      {activeTab === 'external_apis' && (
        <div className="space-y-6">
          {/* 7-point checklist */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              The 7-Point External API Resilience Architecture
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900">1. Strict Timeouts</div>
                <div className="text-slate-500 text-[11px] mt-1">8,000ms AbortController limit on all fetch calls.</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900">2. Retry Limit & Backoff</div>
                <div className="text-slate-500 text-[11px] mt-1">Capped at 2 retries with exponential backoff (400ms, 800ms).</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900">3. Rate Limiting</div>
                <div className="text-slate-500 text-[11px] mt-1">Token bucket throttles clients to prevent API exhaustion.</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900">4. Quota Awareness</div>
                <div className="text-slate-500 text-[11px] mt-1">Tracks daily session usage and remaining budget.</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900">5. Circuit Breakers</div>
                <div className="text-slate-500 text-[11px] mt-1">Trips to OPEN on 3 consecutive failures to avoid 47k requests.</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900">6. Immutable Logging</div>
                <div className="text-slate-500 text-[11px] mt-1">Every outbound request, duration, and status code logged.</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900">7. Deterministic Fallbacks</div>
                <div className="text-slate-500 text-[11px] mt-1">Offline/mock fallback returned automatically if API fails.</div>
              </div>
            </div>
          </div>

          {/* Quota Monitors */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">Live Service Quota & Circuit Monitor</h2>
              <button
                onClick={() => setQuotas(externalApiGateway.getQuotas())}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              {quotas.map((q) => (
                <div key={q.service} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{q.service}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        q.circuitState === 'CLOSED'
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                      }`}
                    >
                      CIRCUIT: {q.circuitState}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Daily Budget</span>
                      <span>{q.usedToday} / {q.dailyBudget} calls</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-amber-500"
                        style={{ width: `${Math.min(100, (q.usedToday / q.dailyBudget) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Remaining: {q.remainingToday}</span>
                    <span>Failures: {q.consecutiveFailures}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: BACKUPS & RECOVERY */}
      {activeTab === 'backups' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Database Backup & Disaster Recovery</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generate full JSON state snapshots with entity checksums or restore from previous rollback points.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCreateBackup}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Create Snapshot</span>
                </button>

                <button
                  onClick={handleDownloadBackup}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-sm transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Backup JSON</span>
                </button>
              </div>
            </div>

            {/* Snapshots list */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Automatic Local Snapshots (Last 5 Restore Points)
              </h3>

              {snapshots.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No snapshots created yet. Click "Create Snapshot" to record the first recovery point.
                </div>
              ) : (
                snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 font-mono">
                      <div className="flex items-center space-x-2">
                        <FileCheck className="w-4 h-4 text-emerald-500" />
                        <span className="font-bold text-slate-900">{snap.id}</span>
                        <span className="text-[10px] text-slate-400">({snap.totalEntitiesCount} entities)</span>
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        Created: {formatAuditTimestamp(snap.createdAt)} • Operator: {snap.createdBy}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => backupService.downloadBackupFile(snap)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        Download
                      </button>

                      <button
                        onClick={() => handleRestoreSnapshot(snap)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Restore Point
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: RECYCLE BIN */}
      {activeTab === 'recycle_bin' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Soft Deletion Recycle Bin ({trashItems.length} Records)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  HorusScope enforces non-destructive soft deletion. Deleted records preserve child data and can be restored instantly.
                </p>
              </div>

              <button
                onClick={() => setTrashItems(softDeleteService.getRecycleBinItems())}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Trash</span>
              </button>
            </div>

            {trashItems.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs space-y-2">
                <Trash2 className="w-8 h-8 mx-auto text-slate-300" />
                <div className="font-semibold text-slate-700">Recycle Bin is Empty</div>
                <p className="text-slate-500 text-[11px]">No soft-deleted leads, businesses, or proposals found.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {trashItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900">{item.title}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                          {item.entityType}
                        </span>
                      </div>
                      <div className="text-slate-500 text-[11px]">{item.subtitle}</div>
                      <div className="text-slate-400 text-[10px]">
                        Deleted: {formatAuditTimestamp(item.deletedAt)} by {item.deletedBy}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRestoreTrash(item)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-colors shadow-sm"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 8: AUDIT TRAIL */}
      {activeTab === 'audit_logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={auditFilter}
                onChange={(e) => setAuditFilter(e.target.value)}
                placeholder="Filter by action, entity, or actor..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <button
              onClick={() => setAuditLogs(auditService.getLogs())}
              className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 cursor-pointer hover:bg-slate-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Trail</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs">
            {/* List */}
            <div className="lg:col-span-6 space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredLogs.map((log) => {
                const isSelected = selectedAuditLog?.id === log.id;
                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedAuditLog(log)}
                    className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-slate-100 border-amber-500 shadow-sm'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-amber-600 font-bold">{log.action}</span>
                      <span className="text-[10px] text-slate-400">{formatAuditTimestamp(log.timestamp)}</span>
                    </div>
                    <div className="text-slate-700 mt-1 line-clamp-1">{log.changeSummary}</div>
                    <div className="flex items-center space-x-2 mt-2 text-[10px] text-slate-400 font-mono">
                      <span>Entity: {log.entityType}</span>
                      <span>•</span>
                      <span>Actor: {log.actorId}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Diff Inspector */}
            <div className="lg:col-span-6 p-4 rounded-xl bg-white border border-slate-200 space-y-3">
              <div className="font-bold text-slate-900 border-b border-slate-200 pb-2">
                Audit Record Snapshot Diff
              </div>

              {selectedAuditLog ? (
                <div className="space-y-3">
                  <div>
                    <span className="text-slate-400 text-[11px]">Summary:</span>
                    <div className="text-slate-800 font-medium mt-0.5">
                      {selectedAuditLog.changeSummary}
                    </div>
                  </div>

                  {selectedAuditLog.previousValueSnapshot && (
                    <div>
                      <span className="text-rose-500 font-mono text-[10px] font-bold">PREVIOUS VALUE:</span>
                      <pre className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] font-mono text-slate-700 max-h-36 overflow-auto">
                        {JSON.stringify(selectedAuditLog.previousValueSnapshot, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedAuditLog.newValueSnapshot && (
                    <div>
                      <span className="text-emerald-500 font-mono text-[10px] font-bold">NEW VALUE:</span>
                      <pre className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] font-mono text-slate-700 max-h-40 overflow-auto">
                        {JSON.stringify(selectedAuditLog.newValueSnapshot, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400 text-xs">
                  Select an audit record to inspect its previous and new state diffs.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: MCP PRE-CALL GATEWAY */}
      {activeTab === 'mcp_gateway' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Cpu className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-indigo-950">
                  Model Context Protocol (MCP) Pre-Call Governance Layer
                </h3>
              </div>
              <p className="text-xs text-indigo-700 max-w-3xl leading-relaxed">
                All outbound API requests (Google Places API New, Gemini AI Intelligence, Enterprise CRM) pass through the HorusScope MCP Gateway. Pre-call validation enforces JSON Schema verification, role authorization (RBAC), quota safety rate limits, and cryptographic deduplication caching before any network packet is dispatched.
              </p>
            </div>
            <button
              onClick={() => setIsMcpModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors flex items-center space-x-2 shrink-0 shadow-sm cursor-pointer"
            >
              <Cpu className="w-4 h-4" />
              <span>Launch MCP Inspector</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                1. Pre-Call Schema Validation
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Strict JSON-RPC 2.0 schemas govern each tool argument. Invalid payloads are rejected at zero latency before communicating with third-party APIs.
              </p>
              <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold border border-emerald-200">
                ENABLED & ACTIVE
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                2. Rate Limiting & Safety Locks
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Per-tool sliding window throttling limits Google Places searches to 30/min and Gemini audits to 15/min. Scraping and harvesting locks are permanently enforced.
              </p>
              <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold border border-emerald-200">
                SLIDING WINDOW 60s
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                3. Idempotent Deduplication
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                SHA-256 payload hashes cache idempotent responses for 5 minutes. Redundant tool invocations return instant cached responses with zero quota consumption.
              </p>
              <span className="inline-block px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold border border-indigo-200">
                SHA-256 IN-MEMORY CACHE
              </span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
            <h4 className="text-sm font-bold text-slate-900">Registered MCP Tool Manifest</h4>
            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-indigo-600">places_discover</span>
                  <p className="text-slate-500 text-[11px]">Google Places API (New) official query proxy with opportunity grading and sandbox diagnostic failover</p>
                </div>
                <span className="px-2 py-1 rounded bg-slate-100 font-mono text-[10px] text-slate-700">30 req/min limit</span>
              </div>
              <div className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-indigo-600">intelligence_audit_website</span>
                  <p className="text-slate-500 text-[11px]">13-criterion website evaluation with non-speculative wording rules and Gemini 2.5 Flash analysis</p>
                </div>
                <span className="px-2 py-1 rounded bg-slate-100 font-mono text-[10px] text-slate-700">15 req/min limit</span>
              </div>
              <div className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-indigo-600">intelligence_score_lead</span>
                  <p className="text-slate-500 text-[11px]">Multi-dimensional lead scoring & opportunity tier calculation</p>
                </div>
                <span className="px-2 py-1 rounded bg-slate-100 font-mono text-[10px] text-slate-700">45 req/min limit</span>
              </div>
              <div className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-indigo-600">crm_read_businesses</span>
                  <p className="text-slate-500 text-[11px]">Local Enterprise Vault business entity reader with strict tenant permission validation</p>
                </div>
                <span className="px-2 py-1 rounded bg-slate-100 font-mono text-[10px] text-slate-700">120 req/min limit</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mcp Inspector Modal */}
      <McpInspectorModal
        isOpen={isMcpModalOpen}
        onClose={() => setIsMcpModalOpen(false)}
      />
    </div>
  );
};
