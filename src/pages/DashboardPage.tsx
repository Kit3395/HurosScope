import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  CheckCircle2,
  Flame,
  Send,
  CalendarClock,
  FileText,
  Trophy,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  ChevronRight,
  TrendingUp,
  Clock,
  Plus,
} from 'lucide-react';
import {
  businessService,
  leadService,
  proposalService,
} from '../services';
import { auditService } from '../audit';
import { formatPHP } from '../utils/currency';
import { PIPELINE_STAGES, ALL_PIPELINE_STATUSES, normalizePipelineStatus } from '../config/pipeline';
import { PipelineStatusBadge } from '../components/PipelineStatusBadge';
import { LeadPipelineStatus } from '../types';
import { useAuth } from '../context/AuthContext';

interface DashboardPageProps {
  onNavigate: (page: string, params?: { leadId?: string; filterStatus?: LeadPipelineStatus }) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [, setRefreshKey] = useState(0);
  const { currentUser, pendingRequestsCount } = useAuth();
  const isAdmin = currentUser?.role === 'OWNER' || currentUser?.role === 'ADMIN';

  const leads = leadService.getAll(false, false); // active unarchived leads
  const proposals = proposalService.getAll(false);
  const followUps = leadService.getAllFollowUps(false); // pending follow-ups
  const recentAudits = auditService.getLogs({ limit: 6 });

  // 9 Metric Calculations (with safe placeholder fallbacks for empty-state)
  const totalLeadsCount = leads.length;
  const newLeadsCount = leads.filter((l) => l.pipelineStatus === 'New').length;
  const qualifiedLeadsCount = leads.filter((l) => l.pipelineStatus === 'Qualified').length;
  const hotLeadsCount = leads.filter((l) => l.temperature === 'HOT' || l.priority === 'HIGH').length;
  const contactedLeadsCount = leads.filter((l) => l.pipelineStatus === 'Contacted').length;
  const followUpsDueCount = followUps.length;
  const proposalsCount = proposals.length;
  const wonDealsCount = leads.filter((l) => l.pipelineStatus === 'Won').length;
  const totalPipelineValueUSD = leads
    .filter((l) => l.pipelineStatus !== 'Lost' && l.pipelineStatus !== 'Not Interested')
    .reduce((acc, curr) => acc + (curr.estimatedDealValueUSD || 0), 0);

  const formatCurrency = (amount: number): string => {
    return formatPHP(amount);
  };

  const handleToggleFollowUp = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    leadService.toggleFollowUp(id);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Header & Context */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center space-x-2 text-xs text-blue-700 font-bold uppercase tracking-wider mb-1">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            <span>Business Intelligence Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Executive Pipeline Dashboard
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Real-time acquisition health, stage progression, deal pipeline value, and scheduled follow-up tasks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('leads')}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Manage All Leads</span>
          </button>
          <button
            onClick={() => onNavigate('settings')}
            className="p-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
            title="System & Safety Architecture"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </button>
        </div>
      </div>

      {/* PENDING ACCESS REQUESTS BANNER FOR ADMINS */}
      {isAdmin && pendingRequestsCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-amber-500 text-slate-950 font-bold shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900">
                {pendingRequestsCount} Access Request{pendingRequestsCount === 1 ? '' : 's'} Pending Approval
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                New applicants have requested platform access and are queued for review.
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('users')}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer shrink-0 shadow-xs"
          >
            <span>Review & Approve Requests</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 9 PRIMARY METRICS GRID */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Primary Acquisition Metrics
          </h2>
          <span className="text-xs text-slate-500">Auto-calculated • Safe isolated state</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-9 gap-3">
          {/* 1. Total Leads */}
          <div
            onClick={() => onNavigate('leads')}
            className="bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-4 cursor-pointer transition-all hover:bg-slate-50 group flex flex-col justify-between shadow-xs"
          >
            <div className="flex items-center justify-between text-slate-600 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Total Leads</span>
              <Users className="w-4 h-4 text-slate-500 group-hover:text-blue-600 transition-colors" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {totalLeadsCount}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 truncate">
                {totalLeadsCount > 0 ? `${totalLeadsCount} active prospects` : 'Empty state (0)'}
              </p>
            </div>
          </div>

          {/* 2. New Leads */}
          <div
            onClick={() => onNavigate('leads', { filterStatus: 'New' })}
            className="bg-white border border-slate-200 hover:border-blue-400 rounded-xl p-4 cursor-pointer transition-all hover:bg-slate-50 group flex flex-col justify-between shadow-xs"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">New Leads</span>
              <UserPlus className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {newLeadsCount}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 truncate">
                Awaiting research
              </p>
            </div>
          </div>

          {/* 3. Qualified Leads */}
          <div
            onClick={() => onNavigate('leads', { filterStatus: 'Qualified' })}
            className="bg-white border border-slate-200 hover:border-cyan-400 rounded-xl p-4 cursor-pointer transition-all hover:bg-slate-50 group flex flex-col justify-between shadow-xs"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-800">Qualified</span>
              <CheckCircle2 className="w-4 h-4 text-cyan-600 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {qualifiedLeadsCount}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 truncate">
                Matches redesign ICP
              </p>
            </div>
          </div>

          {/* 4. Hot Leads */}
          <div
            onClick={() => onNavigate('leads')}
            className="bg-white border border-slate-200 hover:border-rose-400 rounded-xl p-4 cursor-pointer transition-all hover:bg-slate-50 group flex flex-col justify-between shadow-xs"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Hot Leads</span>
              <Flame className="w-4 h-4 text-rose-600 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">
                {hotLeadsCount}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 truncate">
                High urgency / value
              </p>
            </div>
          </div>

          {/* 5. Contacted */}
          <div
            onClick={() => onNavigate('leads', { filterStatus: 'Contacted' })}
            className="bg-white border border-slate-200 hover:border-violet-400 rounded-xl p-4 cursor-pointer transition-all hover:bg-slate-50 group flex flex-col justify-between shadow-xs"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-violet-700">Contacted</span>
              <Send className="w-4 h-4 text-violet-600 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {contactedLeadsCount}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 truncate">
                Dispatched critiques
              </p>
            </div>
          </div>

          {/* 6. Follow-ups Due */}
          <div
            onClick={() => onNavigate('leads', { filterStatus: 'Follow-up' })}
            className={`bg-white border rounded-xl p-4 cursor-pointer transition-all hover:bg-slate-50 group flex flex-col justify-between shadow-xs ${
              followUpsDueCount > 0 ? 'border-amber-400 ring-1 ring-amber-400/20' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Follow-ups Due</span>
              <CalendarClock className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-amber-700 tracking-tight">
                {followUpsDueCount}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 truncate">
                {followUpsDueCount > 0 ? 'Pending operator touch' : 'All caught up'}
              </p>
            </div>
          </div>

          {/* 7. Proposals */}
          <div
            onClick={() => onNavigate('proposals')}
            className="bg-white border border-slate-200 hover:border-teal-400 rounded-xl p-4 cursor-pointer transition-all hover:bg-slate-50 group flex flex-col justify-between shadow-xs"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">Proposals</span>
              <FileText className="w-4 h-4 text-teal-600 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {proposalsCount}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 truncate">
                Prepared / Sent
              </p>
            </div>
          </div>

          {/* 8. Won Deals */}
          <div
            onClick={() => onNavigate('leads', { filterStatus: 'Won' })}
            className="bg-white border border-slate-200 hover:border-emerald-400 rounded-xl p-4 cursor-pointer transition-all hover:bg-slate-50 group flex flex-col justify-between shadow-xs"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Won Deals</span>
              <Trophy className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">
                {wonDealsCount}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 truncate">
                Closed contracts
              </p>
            </div>
          </div>

          {/* 9. Estimated Pipeline Value */}
          <div
            onClick={() => onNavigate('leads')}
            className="bg-gradient-to-br from-white via-white to-blue-50 border border-slate-200 hover:border-blue-400 rounded-xl p-4 cursor-pointer transition-all hover:shadow-md group flex flex-col justify-between sm:col-span-2 xl:col-span-1 shadow-xs"
          >
            <div className="flex items-center justify-between text-slate-600 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900">Pipeline Value</span>
              <DollarSign className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {formatCurrency(totalPipelineValueUSD)}
              </div>
              <p className="text-[11px] text-blue-800 mt-1 truncate">
                Active opportunities
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PIPELINE STAGE DISTRIBUTION */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              {ALL_PIPELINE_STATUSES.length}-Stage Pipeline Distribution
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Standardized pipeline progression model enforcing consistent tracking across the platform.
            </p>
          </div>
          <button
            onClick={() => onNavigate('leads')}
            className="text-xs text-blue-700 hover:text-blue-800 flex items-center space-x-1 font-bold cursor-pointer"
          >
            <span>View pipeline board</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Pipeline Stages Progress Flow */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-2">
          {ALL_PIPELINE_STATUSES.map((statusKey) => {
            const stageConfig = PIPELINE_STAGES[statusKey];
            const countInStage = leads.filter(
              (l) => normalizePipelineStatus(l.pipelineStatus) === statusKey
            ).length;
            const hasLeads = countInStage > 0;

            return (
              <div
                key={statusKey}
                onClick={() => onNavigate('leads', { filterStatus: statusKey })}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  hasLeads
                    ? 'bg-blue-50/50 border-blue-200 hover:border-blue-400 hover:bg-blue-50'
                    : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 opacity-90'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${stageConfig.dotColor}`}></span>
                  <span
                    className={`text-xs font-bold px-1.5 py-0.2 rounded ${
                      hasLeads ? 'text-blue-900 bg-blue-100 border border-blue-200' : 'text-slate-500 bg-white border border-slate-200'
                    }`}
                  >
                    {countInStage}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-800 truncate" title={stageConfig.label}>
                  {stageConfig.label}
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5 font-medium">
                  {stageConfig.category}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* TWO COLUMN WORKSPACE: Follow-ups & Hot Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Scheduled Follow-ups & Tasks (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <CalendarClock className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">Scheduled Follow-ups</h3>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300">
              {followUps.length} Pending
            </span>
          </div>

          {followUps.length === 0 ? (
            <div className="py-8 text-center text-slate-500 space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-slate-400" />
              <p className="text-xs">No pending follow-ups due.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {followUps.map((fu) => {
                const lead = leadService.getById(fu.leadId);
                const biz = lead ? businessService.getById(lead.businessId) : undefined;
                const bizName = biz?.crm.verifiedBusinessName || biz?.external.tradeName || 'Business Prospect';

                return (
                  <div
                    key={fu.id}
                    onClick={() => onNavigate('leads', { leadId: fu.leadId })}
                    className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl cursor-pointer transition-all group space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-700 transition-colors">
                          {bizName}
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">
                          {fu.reason}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleToggleFollowUp(fu.id, e)}
                        className="px-2.5 py-1 rounded-lg text-[10px] bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-300 font-bold transition-colors shrink-0 cursor-pointer"
                        title="Mark Completed"
                      >
                        Complete
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                      <span className="flex items-center space-x-1 font-medium">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Due: {new Date(fu.scheduledDate).toLocaleDateString()}</span>
                      </span>
                      <span
                        className={`font-bold ${
                          fu.priority === 'URGENT' ? 'text-rose-700' : 'text-slate-600'
                        }`}
                      >
                        {fu.priority}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: High Value Pipeline Opportunities (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-blue-700" />
              <h3 className="text-sm font-bold text-slate-900">Active High-Value Opportunities</h3>
            </div>
            <button
              onClick={() => onNavigate('leads')}
              className="text-xs text-blue-700 hover:text-blue-800 font-bold cursor-pointer"
            >
              View all leads
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-700 uppercase text-[10px] tracking-wider font-bold">
                  <th className="pb-2.5">Business / Opportunity</th>
                  <th className="pb-2.5">Pipeline Stage</th>
                  <th className="pb-2.5">Est. Value</th>
                  <th className="pb-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      <Building2 className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                      <p className="text-xs">No active pipeline opportunities yet.</p>
                      <button
                        onClick={() => onNavigate('discover')}
                        className="mt-2 text-xs text-blue-700 hover:text-blue-800 font-bold inline-block"
                      >
                        Start Business Discovery &rarr;
                      </button>
                    </td>
                  </tr>
                ) : (
                  leads.slice(0, 5).map((l) => {
                    const biz = businessService.getById(l.businessId);
                    const name = biz?.crm.verifiedBusinessName || biz?.external.tradeName || 'Lead Prospect';
                    const city = biz?.external.externalAddress?.locality || 'Cebu City';

                    return (
                      <tr
                        key={l.id}
                        onClick={() => onNavigate('leads', { leadId: l.id })}
                        className="hover:bg-slate-50 cursor-pointer group transition-colors"
                      >
                        <td className="py-3 pr-2">
                          <div className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                            {name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            {city} • {l.dealType.replace('_', ' ')}
                          </div>
                        </td>
                        <td className="py-3 pr-2">
                          <PipelineStatusBadge status={l.pipelineStatus} size="sm" />
                        </td>
                        <td className="py-3 pr-2 font-bold text-slate-900 font-mono">
                          {formatCurrency(l.estimatedDealValueUSD || 0)}
                        </td>
                        <td className="py-3 text-right">
                          <span className="text-slate-400 group-hover:text-blue-700 inline-flex items-center">
                            <ChevronRight className="w-4 h-4" />
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RECENT AUDIT TRAIL / SAFETY VERIFICATION STREAM */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <h3 className="text-sm font-bold text-slate-900">System Activity & Audit Verification</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">Every mutation recorded immutably</span>
        </div>

        <div className="space-y-2 text-xs">
          {recentAudits.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-mono text-[11px]"
            >
              <div className="flex items-center space-x-3 truncate">
                <span className="px-2 py-0.5 rounded-md bg-blue-100 border border-blue-200 text-blue-900 font-bold text-[10px]">
                  {log.action}
                </span>
                <span className="truncate text-slate-800 font-sans font-medium">{log.changeSummary}</span>
              </div>
              <span className="text-slate-500 shrink-0 text-[10px]">
                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
