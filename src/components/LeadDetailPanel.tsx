import React, { useState } from 'react';
import { 
  Building2,
  Database,
  Globe,
  Gauge,
  Share2,
  Users,
  Sparkles,
  Award,
  CheckCircle,
  Send,
  CalendarClock,
  FileText,
  StickyNote,
  History,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  Plus,
  Flame,
  Check,
  Archive,
  Trash2,
  Edit3,
  CheckCircle2,
  Target,
  RefreshCw,
  TrendingUp,
  Bot,
  ShieldAlert,
  Save,
  X,
} from 'lucide-react';
import { 
  Business,
  Contact,
  FollowUp,
  Lead,
  LeadPipelineStatus,
  LeadScore,
  OutreachActivity,
  Proposal,
  SocialAudit,
  WebsiteAudit,
  AIAnalysis,
  AuditLog,
} from '../types';
import { PipelineStatusBadge } from './PipelineStatusBadge';
import { DataCategoryPill } from './DataCategoryPill';
import { AIConfidenceBadge } from './AIConfidenceBadge';
import { DatabaseTreeViewer } from './DatabaseTreeViewer';
import { businessService, leadService, intelligenceService, proposalService } from '../services';
import { auditService } from '../audit';
import { PipelineLifecycleBanner } from './PipelineLifecycleBanner';
import { formatPHP } from '../utils/currency';

interface LeadDetailPanelProps {
  lead: Lead;
  business: Business;
  onClose?: () => void;
  onStatusChange: (newStatus: LeadPipelineStatus) => void;
  onArchive: () => void;
  onDelete: () => void;
  onLeadUpdated: () => void;
}

type SectionKey =
  | 'all'
  | 'tree'
  | 'overview'
  | 'digital'
  | 'website'
  | 'social'
  | 'contacts'
  | 'ai'
  | 'score'
  | 'services'
  | 'outreach'
  | 'followups'
  | 'proposal'
  | 'notes'
  | 'audit';

export const LeadDetailPanel: React.FC<LeadDetailPanelProps> = ({
  lead,
  business,
  onClose,
  onStatusChange,
  onArchive,
  onDelete,
  onLeadUpdated,
}) => {
  const [activeSection, setActiveSection] = useState<SectionKey>('all');
  const [viewMode, setViewMode] = useState<'dossier' | 'tree'>('dossier');
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(business.crm.internalNotes || '');
  const [newFollowUpReason, setNewFollowUpReason] = useState('');
  const [showAddFollowUp, setShowAddFollowUp] = useState(false);

  // Manual Pricing States for Deal Value
  const [isEditingDealValue, setIsEditingDealValue] = useState(false);
  const [customDealValue, setCustomDealValue] = useState<string>(
    lead.estimatedDealValueUSD ? String(lead.estimatedDealValueUSD) : ''
  );

  // Manual Pricing States for Proposals
  const [isEditingProposalPrice, setIsEditingProposalPrice] = useState(false);
  const [customProposalPrice, setCustomProposalPrice] = useState<string>('');

  // Queries for the 13 sections via segregated Entity Tree
  const entityTree = businessService.getEntityTree(business.id);
  const contacts: Contact[] = entityTree?.contacts || [];
  const webAudits: WebsiteAudit[] = entityTree?.websiteAudits || intelligenceService.getWebAudits(business.id);
  const socialAudits: SocialAudit[] = entityTree?.socialAudits || intelligenceService.getSocialAudits(business.id);
  const aiAnalyses: AIAnalysis[] = entityTree?.aiAnalyses || intelligenceService.getAIAnalyses(business.id);
  const proposals: Proposal[] = entityTree?.proposals || proposalService.getByBusiness(business.id);
  const followUps: FollowUp[] = entityTree?.followUps || leadService.getFollowUpsForLead(lead.id);
  const outreachHistory: OutreachActivity[] = entityTree?.outreach || leadService.getOutreachForLead(lead.id);
  const leadScores: LeadScore[] = entityTree?.leadScores || intelligenceService.getLeadScores(business.id);
  const auditLogs: AuditLog[] = auditService.getLogs({ limit: 10 }).filter(
    (log) => log.entityId === lead.id || log.entityId === business.id
  );

  const primaryWebAudit = webAudits[0];
  const primarySocialAudit = socialAudits[0];
  const primaryAIAnalysis = aiAnalyses[0];
  const primaryProposal = proposals[0];
  const primaryLeadScore = leadScores.length > 0
    ? [...leadScores].sort((a, b) => new Date(b.calculatedAt).getTime() - new Date(a.calculatedAt).getTime())[0]
    : undefined;

  const [isScoringLead, setIsScoringLead] = useState(false);
  const [scoringNotification, setScoringNotification] = useState<string | null>(null);
  
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);
  const [proposalNotification, setProposalNotification] = useState<string | null>(null);

  const [isDraftingOutreach, setIsDraftingOutreach] = useState(false);
  const [outreachDraft, setOutreachDraft] = useState<string | null>(null);
  const [outreachChannel, setOutreachChannel] = useState<'CALL' | 'EMAIL' | 'FACEBOOK' | 'MESSENGER' | 'SMS' | 'MEETING' | 'PROPOSAL' | 'FOLLOW_UP'>('EMAIL');
  
  const [outreachOutcome, setOutreachOutcome] = useState('');
  const [outreachNextAction, setOutreachNextAction] = useState('');
  const [outreachStatus, setOutreachStatus] = useState<'DRAFT' | 'READY_FOR_MANUAL_SEND' | 'COMPLETED' | 'NO_ANSWER' | 'REPLIED' | 'OPTED_OUT'>('COMPLETED');

  // Handle Save Manual Deal Value (Philippine Peso)
  const handleSaveDealValue = () => {
    const parsed = parseInt(customDealValue.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(parsed) && parsed >= 0) {
      leadService.update(lead.id, { estimatedDealValueUSD: parsed });
      setIsEditingDealValue(false);
      onLeadUpdated();
    }
  };

  // Handle Save Manual Proposal Price (Philippine Peso)
  const handleSaveProposalPrice = () => {
    if (!primaryProposal) return;
    const parsed = parseInt(customProposalPrice.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(parsed) && parsed >= 0) {
      proposalService.update(primaryProposal.id, {
        totalUSD: parsed,
        subtotalUSD: parsed,
      });
      setIsEditingProposalPrice(false);
      onLeadUpdated();
    }
  };
  
  const handleScoreLead = async () => {
    setIsScoringLead(true);
    setScoringNotification(null);
    try {
      const res = await intelligenceService.scoreLead(business.id, lead.id);
      setScoringNotification(
        `AI Lead Score updated to ${res.overallScore}/100 via ${res.aiScoreData?.engine === 'GEMINI_FLASH_3_8' ? 'Gemini 3.8 Flash' : 'AI Scoring Engine'}`
      );
      onLeadUpdated();
      setTimeout(() => setScoringNotification(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setScoringNotification(`Scoring failed: ${msg}`);
    } finally {
      setIsScoringLead(false);
    }
  };

  // Calculated Opportunity Score
  const opportunityScore = primaryLeadScore?.overallProspectScore || primaryLeadScore?.overallScore || (primaryWebAudit
    ? Math.min(
        98,
        Math.max(
          55,
          Math.round(
            (primaryWebAudit.metrics.mobileResponsive ? 15 : 45) +
              Math.min(30, (primaryWebAudit.metrics.estimatedLoadTimeSeconds || 3) * 6) +
              (business.external.googleRating ? business.external.googleRating * 5 : 15)
          )
        )
      )
    : 85);

  const handleGenerateProposal = async () => {
    setIsGeneratingProposal(true);
    setProposalNotification(null);
    try {
      await intelligenceService.generateProposal(business.id);
      setProposalNotification('Proposal generated successfully.');
      onLeadUpdated();
      setTimeout(() => setProposalNotification(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setProposalNotification(`Generation failed: ${msg}`);
    } finally {
      setIsGeneratingProposal(false);
    }
  };

  const handleApproveProposal = (id: string) => {
    proposalService.update(id, { status: 'REVIEWED' });
    onLeadUpdated();
  };

  const handleDraftOutreach = async () => {
    setIsDraftingOutreach(true);
    try {
      const draft = await intelligenceService.draftOutreachMessage(business.id, outreachChannel);
      setOutreachDraft(draft);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDraftingOutreach(false);
    }
  };

  const handleLogOutreach = () => {
    if (!outreachDraft) return;
    
    leadService.addOutreach({
      businessId: business.id,
      leadId: lead.id,
      channel: outreachChannel,
      messageBody: outreachDraft,
      status: outreachStatus,
      outcomeNotes: outreachOutcome,
      nextAction: outreachNextAction
    });
    
    setOutreachDraft(null);
    setOutreachOutcome('');
    setOutreachNextAction('');
    onLeadUpdated();
  };

  const handleSaveNotes = () => {
    businessService.updateCRM(business.id, { internalNotes: notesValue });
    setEditingNotes(false);
    onLeadUpdated();
  };

  const handleCreateFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFollowUpReason.trim()) return;

    leadService.addFollowUp({
      businessId: business.id,
      leadId: lead.id,
      reason: newFollowUpReason.trim(),
      scheduledDate: new Date(Date.now() + 3 * 86400000).toISOString(),
      priority: 'NORMAL',
    });

    setNewFollowUpReason('');
    setShowAddFollowUp(false);
    onLeadUpdated();
  };

  const handleToggleFollowUp = (id: string) => {
    leadService.toggleFollowUp(id);
    onLeadUpdated();
  };

  const isSectionVisible = (section: SectionKey) => {
    if (viewMode === 'tree' || activeSection === 'tree') return false;
    return activeSection === 'all' || activeSection === section;
  };

  const displayDealValue: number | null = lead.estimatedDealValueUSD ?? null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-lg flex flex-col h-full">
      {/* HEADER: Identity, Status, Quick Actions */}
      <div className="p-5 border-b border-slate-200 bg-white space-y-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-mono text-cyan-700 font-semibold">ID: {lead.id}</span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] text-slate-500 font-mono">Biz: {business.id}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {business.crm.verifiedBusinessName || business.external.tradeName}
            </h2>
            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-slate-600">
              {business.external.externalAddress && (
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{business.external.externalAddress.locality}, {business.external.externalAddress.administrativeArea}</span>
                </span>
              )}
              {business.external.externalWebsiteUrl && (
                <a
                  href={business.external.externalWebsiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 text-cyan-700 hover:text-cyan-800 transition-colors font-medium"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[200px]">{business.identifiers.normalizedDomain || 'Website'}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {/* Top Actions: Light mode buttons with high contrast */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'dossier' ? 'tree' : 'dossier')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-medium transition-colors cursor-pointer flex items-center space-x-1.5 shadow-xs ${
                viewMode === 'tree'
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title="Inspect Database Entity Tree"
            >
              <Database className="w-3.5 h-3.5 text-amber-600" />
              <span>{viewMode === 'tree' ? 'Dossier View' : 'DB Tree'}</span>
            </button>
            <PipelineStatusBadge
              status={lead.pipelineStatus}
              interactive={true}
              onStatusChange={onStatusChange}
              size="md"
            />
            <button
              onClick={onArchive}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 shadow-xs transition-colors cursor-pointer"
              title={lead.isArchived ? 'Unarchive Lead' : 'Archive Lead'}
            >
              <Archive className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 rounded-xl bg-white hover:bg-red-50 text-slate-700 hover:text-red-600 border border-slate-200 hover:border-red-200 shadow-xs transition-colors cursor-pointer"
              title="Soft Delete Lead"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Highlight Stats Strip with User-Controlled Pricing in Philippine Peso */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
          {/* Box 1: Custom Project Pricing */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase font-bold tracking-wider">
              <span>Project Value (PHP)</span>
              {!isEditingDealValue && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomDealValue(displayDealValue !== null ? String(displayDealValue) : '');
                    setIsEditingDealValue(true);
                  }}
                  className="text-cyan-700 hover:underline flex items-center gap-0.5 cursor-pointer font-semibold"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Set Price</span>
                </button>
              )}
            </div>
            {isEditingDealValue ? (
              <div className="mt-1 flex items-center gap-1.5">
                <span className="font-bold text-slate-700 text-xs">₱</span>
                <input
                  type="text"
                  value={customDealValue}
                  onChange={(e) => setCustomDealValue(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full px-2 py-0.5 text-xs font-bold rounded border border-slate-300 bg-white text-slate-900 focus:border-cyan-500 focus:outline-hidden"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSaveDealValue}
                  className="p-1 rounded bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shrink-0"
                  title="Save Price"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingDealValue(false)}
                  className="p-1 rounded text-slate-500 hover:bg-slate-200 cursor-pointer shrink-0"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="text-base font-black text-slate-900 mt-1 tracking-tight">
                {displayDealValue !== null ? formatPHP(displayDealValue) : <span className="text-sm font-medium text-slate-400">Not set</span>}
              </div>
            )}
          </div>

          {/* Box 2: Priority / Temp */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 shadow-xs">
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Priority / Temp</div>
            <div className="text-sm font-bold text-rose-600 flex items-center space-x-1 mt-1">
              <Flame className="w-3.5 h-3.5" />
              <span>{lead.temperature || 'WARM'} • {lead.priority}</span>
            </div>
          </div>

          {/* Box 3: Opportunity Score */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 shadow-xs">
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Opportunity Score</div>
            <div className="text-sm font-black text-cyan-700 mt-1">
              {opportunityScore} / 100
            </div>
          </div>

          {/* Box 4: Deal Type */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 shadow-xs">
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Deal Type</div>
            <div className="text-sm font-bold text-slate-800 mt-1 truncate">
              {lead.dealType.replace(/_/g, ' ')}
            </div>
          </div>
        </div>

        {/* Governing Acquisition Lifecycle Stepper */}
        <PipelineLifecycleBanner
          currentStage={lead.pipelineStatus}
          onSelectStage={(stage) => onStatusChange(stage)}
          interactive={true}
        />

        {/* Section Navigation Pills */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-xs no-scrollbar border-t border-slate-200 pt-3">
          {[
            { id: 'all', label: 'All Sections' },
            { id: 'tree', label: 'Entity Tree' },
            { id: 'overview', label: '1. Overview' },
            { id: 'digital', label: '2. Digital' },
            { id: 'website', label: '3. Web Audit' },
            { id: 'social', label: '4. Social' },
            { id: 'contacts', label: '5. Contacts' },
            { id: 'ai', label: '6. AI Intel' },
            { id: 'score', label: '7. Opportunity Score' },
            { id: 'services', label: '8. Services' },
            { id: 'outreach', label: '9. Outreach' },
            { id: 'followups', label: '10. Follow-ups' },
            { id: 'proposal', label: '11. Proposal' },
            { id: 'notes', label: '12. CRM Notes' },
            { id: 'audit', label: '13. Audit Log' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSection(tab.id as SectionKey);
                if (tab.id === 'tree') {
                  setViewMode('tree');
                } else if (viewMode === 'tree') {
                  setViewMode('dossier');
                }
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeSection === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* SCROLLABLE BODY */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50">
        {/* Database Tree View */}
        {(viewMode === 'tree' || activeSection === 'tree') && entityTree && (
          <div className="p-1">
            <DatabaseTreeViewer entityTree={entityTree} onRefresh={onLeadUpdated} />
          </div>
        )}

        {/* =================================================================== */}
        {/* SECTION 1: BUSINESS OVERVIEW */}
        {/* =================================================================== */}
        {isSectionVisible('overview') && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <Building2 className="w-4 h-4 text-cyan-600" />
                <span>1. Business Overview</span>
              </div>
              <DataCategoryPill category="EXTERNAL_SOURCE" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                <span className="text-slate-500 font-semibold block text-[11px]">Trade / Display Name:</span>
                <p className="text-slate-900 font-bold mt-0.5">{business.crm.verifiedBusinessName || business.external.tradeName}</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                <span className="text-slate-500 font-semibold block text-[11px]">Legal Registered Name:</span>
                <p className="text-slate-800 mt-0.5">{business.external.legalOrRegisteredName || 'Not recorded'}</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                <span className="text-slate-500 font-semibold block text-[11px]">Primary Industry Category:</span>
                <p className="text-cyan-700 font-bold mt-0.5">{business.external.primaryCategoryCode || 'Professional Services'}</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                <span className="text-slate-500 font-semibold block text-[11px]">Operational Phone:</span>
                <p className="text-slate-800 mt-0.5">{business.external.externalPhone || 'None found'}</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                <span className="text-slate-500 font-semibold block text-[11px]">Google Reputation:</span>
                <p className="text-amber-700 font-bold mt-0.5">
                  ★ {business.external.googleRating || 'N/A'} ({business.external.googleReviewCount || 0} reviews)
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                <span className="text-slate-500 font-semibold block text-[11px]">Operating Status:</span>
                <p className="text-emerald-700 font-bold mt-0.5">{business.external.businessStatus}</p>
              </div>
              <div className="sm:col-span-2 lg:col-span-3 p-3 bg-slate-50 border border-slate-100 rounded-lg">
                <span className="text-slate-500 font-semibold block text-[11px]">Physical Verified Address:</span>
                <p className="text-slate-800 mt-0.5">
                  {business.external.externalAddress?.formattedAddress || 'No physical address recorded'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* SECTION 2: DIGITAL PRESENCE */}
        {/* =================================================================== */}
        {isSectionVisible('digital') && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <Globe className="w-4 h-4 text-indigo-600" />
                <span>2. Digital Presence</span>
              </div>
              <DataCategoryPill category="APP_GENERATED" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-semibold text-[11px]">Normalized Domain</span>
                <p className="text-slate-900 font-mono font-bold mt-1 truncate">
                  {business.identifiers.normalizedDomain || 'None'}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-semibold text-[11px]">SSL Certificate</span>
                <p className={`font-bold mt-1 ${primaryWebAudit?.metrics.hasSslCertificate ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {primaryWebAudit?.metrics.hasSslCertificate ? 'Active & Valid' : 'Missing / Insecure'}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-semibold text-[11px]">Identified Platform / CMS</span>
                <p className="text-slate-800 font-bold mt-1 truncate">
                  {primaryWebAudit?.metrics.cmsIdentified || 'Custom / WordPress'}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-semibold text-[11px]">Mobile Optimization</span>
                <p className={`font-bold mt-1 ${primaryWebAudit?.metrics.mobileResponsive ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {primaryWebAudit?.metrics.mobileResponsive ? 'Responsive' : 'Non-Responsive (Deficiency)'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* SECTION 3: WEBSITE ANALYSIS */}
        {/* =================================================================== */}
        {isSectionVisible('website') && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <Gauge className="w-4 h-4 text-cyan-600" />
                <span>3. Website Intelligence</span>
              </div>
              <div className="flex items-center space-x-2">
                {primaryWebAudit?.websiteStatus === 'NO_WEBSITE' && (
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    No website
                  </span>
                )}
                {primaryWebAudit?.websiteStatus === 'POTENTIALLY_OUTDATED' && (
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    Potentially outdated
                  </span>
                )}
                {primaryWebAudit?.websiteStatus === 'GOOD_WEBSITE' && (
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Good website
                  </span>
                )}
                {(!primaryWebAudit?.websiteStatus || primaryWebAudit?.websiteStatus === 'WEBSITE_EXISTS') && (
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                    Website exists
                  </span>
                )}
                <span className="text-xs text-slate-600 font-mono">
                  Score: <strong className="text-cyan-700">{primaryWebAudit?.opportunityScore ?? opportunityScore}/100</strong>
                </span>
              </div>
            </div>

            {primaryWebAudit ? (
              <div className="space-y-4">
                {primaryWebAudit.designPatternAssessment && (
                  <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl text-xs">
                    <span className="font-bold text-purple-800 uppercase text-[10px] tracking-wider block mb-1">
                      Design Pattern Modernity Assessment
                    </span>
                    <p className="text-purple-950 leading-relaxed font-medium">
                      &ldquo;{primaryWebAudit.designPatternAssessment}&rdquo;
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 font-semibold text-[11px]">Mobile Status</span>
                    <div className="text-sm font-bold mt-1">
                      {primaryWebAudit.metrics.mobileResponsive ? (
                        <span className="text-emerald-700">Responsive</span>
                      ) : (
                        <span className="text-rose-600">Not Responsive</span>
                      )}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 font-semibold text-[11px]">HTTPS Security</span>
                    <div className="text-sm font-bold mt-1">
                      {primaryWebAudit.metrics.hasSslCertificate ? (
                        <span className="text-emerald-700">Active SSL</span>
                      ) : (
                        <span className="text-rose-600">Missing SSL</span>
                      )}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 font-semibold text-[11px]">Page Load Time</span>
                    <div className="text-sm font-bold text-amber-700 mt-1 font-mono">
                      {primaryWebAudit.metrics.estimatedLoadTimeSeconds ? `${primaryWebAudit.metrics.estimatedLoadTimeSeconds}s` : 'N/A'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 font-semibold text-[11px]">Accessibility</span>
                    <div className="text-sm font-bold text-slate-800 mt-1 font-mono">
                      {primaryWebAudit.metrics.accessibilityScore || 70} / 100
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Identified Technical Deficiencies & Redesign Hooks
                  </h4>
                  <div className="space-y-2">
                    {primaryWebAudit.identifiedIssues.map((issue) => (
                      <div
                        key={issue.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{issue.opportunityTitle}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              issue.severity === 'HIGH' || issue.severity === 'CRITICAL'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {issue.severity} SEVERITY
                          </span>
                        </div>
                        <p className="text-slate-600">{issue.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-3">No technical website audit logged yet.</p>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* SECTION 4: SOCIAL PRESENCE */}
        {/* =================================================================== */}
        {isSectionVisible('social') && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <Share2 className="w-4 h-4 text-sky-600" />
                <span>4. Social Intelligence & Sales Insights</span>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-bold border border-slate-200">
                Presence: {primarySocialAudit?.overallSocialPresenceGrade || 'EVALUATED'}
              </span>
            </div>

            {primarySocialAudit ? (
              <div className="space-y-4">
                {primarySocialAudit.crossChannelSummary && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-mono">
                    <span className="text-slate-500 font-bold">Matrix: </span>
                    <span className="text-sky-800 font-semibold">{primarySocialAudit.crossChannelSummary}</span>
                  </div>
                )}

                {primarySocialAudit.channels && primarySocialAudit.channels.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
                    {primarySocialAudit.channels.map((ch, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-[11px]">{ch.platformDisplayName}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              ch.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : ch.status === 'DORMANT'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {ch.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">{ch.audienceMetric || 'Unverified'}</div>
                        <div className="text-[9px] text-slate-400 truncate">
                          {ch.isClaimed === true ? 'Claimed' : 'Unclaimed'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {primarySocialAudit.salesInsights && primarySocialAudit.salesInsights.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                      <Flame className="w-3.5 h-3.5 text-amber-600" />
                      <span>Actionable Sales Insights & Pitch Hooks</span>
                    </div>

                    <div className="space-y-2">
                      {primarySocialAudit.salesInsights.map((insight) => (
                        <div
                          key={insight.id}
                          className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 text-xs space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h5 className="font-bold text-amber-950 text-xs leading-snug">
                              &ldquo;{insight.headline}&rdquo;
                            </h5>
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold shrink-0">
                              {insight.confidence}
                            </span>
                          </div>
                          <p className="text-slate-700 text-[11px] leading-relaxed">
                            {insight.narrative}
                          </p>
                          <div className="p-2.5 rounded-lg bg-white border border-amber-200 text-[11px]">
                            <span className="text-amber-800 font-bold block text-[10px] uppercase">
                              Pitch Hook:
                            </span>
                            <span className="text-slate-800 font-medium">{insight.actionablePitchAngle}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-2">No social presence profiles recorded.</p>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* SECTION 5: CONTACTS */}
        {/* =================================================================== */}
        {isSectionVisible('contacts') && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>5. Verified Business Contacts</span>
              </div>
              <DataCategoryPill category="USER_CRM" />
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2 font-medium">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Compliance statement: Contacts verified from legitimate public sources only. Contact harvesting strictly prohibited.</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {business.crm.verifiedBusinessName} Representative
                  </h4>
                  <p className="text-slate-500">Managing Principal / Point of Contact</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                  PUBLIC SOURCE
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 pt-1">
                <div className="flex items-center space-x-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{business.external.externalWebsiteUrl ? `contact@${business.identifiers.normalizedDomain}` : 'Direct outreach'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{business.external.externalPhone || 'No direct phone'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* SECTION 6: AI INTELLIGENCE */}
        {/* =================================================================== */}
        {isSectionVisible('ai') && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>6. AI Analytical Intelligence</span>
              </div>
              {primaryAIAnalysis && <AIConfidenceBadge confidence={primaryAIAnalysis.confidence} />}
            </div>

            {primaryAIAnalysis ? (
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[11px] font-bold uppercase text-purple-800">Analytical Summary</span>
                  <p className="text-slate-800 leading-relaxed font-medium">{primaryAIAnalysis.summary}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <span className="text-[11px] font-bold uppercase text-emerald-700">Observed Strengths</span>
                    <ul className="space-y-1 text-slate-700 list-disc list-inside">
                      {primaryAIAnalysis.strengths.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <span className="text-[11px] font-bold uppercase text-rose-600">Critical Vulnerabilities</span>
                    <ul className="space-y-1 text-slate-700 list-disc list-inside">
                      {primaryAIAnalysis.vulnerabilities.map((v, idx) => (
                        <li key={idx}>{v}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="text-[11px] font-bold uppercase text-cyan-800">High-Converting Pitch Angles</span>
                  <div className="space-y-1.5">
                    {primaryAIAnalysis.pitchAngles.map((p, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-800 font-medium">
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 py-3">
                No AI critique generated yet for this business prospect.
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* SECTION 7: AI MULTI-DIMENSIONAL LEAD SCORING */}
        {/* =================================================================== */}
        {isSectionVisible('score') && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
            {/* Header with Title and Action Button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <Award className="w-4 h-4 text-cyan-600" />
                  <span className="text-slate-900 font-bold text-sm">7. AI Multi-Dimensional Lead Scoring</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Granular, explainable scoring criteria replacing single opaque numbers
                </p>
              </div>

              <div className="flex items-center space-x-2">
                {primaryLeadScore && (
                  <span className="text-xs font-bold text-cyan-800 px-3 py-1 rounded-lg bg-cyan-50 border border-cyan-200 font-mono">
                    OVERALL: {primaryLeadScore.overallProspectScore || primaryLeadScore.overallScore}/100
                  </span>
                )}
                <button
                  type="button"
                  disabled={isScoringLead}
                  onClick={handleScoreLead}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScoringLead ? 'animate-spin' : ''}`} />
                  <span>{isScoringLead ? 'Scoring...' : primaryLeadScore ? 'Recalculate AI Score' : 'Calculate AI Score'}</span>
                </button>
              </div>
            </div>

            {/* Notification Banner */}
            {scoringNotification && (
              <div className="p-3 rounded-xl bg-cyan-50 border border-cyan-200 text-xs text-cyan-900 flex items-center space-x-2 font-medium">
                <Sparkles className="w-4 h-4 text-cyan-600 shrink-0" />
                <span>{scoringNotification}</span>
              </div>
            )}

            {primaryLeadScore?.aiScoreData ? (
              <div className="space-y-4">
                {/* AI Explanation Card in Clean Light Mode */}
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3.5 shadow-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl font-black text-slate-900 tracking-tight">
                          {primaryLeadScore.aiScoreData.overallProspectScore}/100
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-cyan-100 text-cyan-900 border border-cyan-300">
                          GRADE {primaryLeadScore.grade || 'A'}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          • {primaryLeadScore.aiScoreData.engine === 'GEMINI_FLASH_3_8' ? 'Gemini 3.8 Flash' : 'Horus Scoring Engine'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {primaryLeadScore.aiScoreData.explanation.verdictHeadline}
                      </h4>
                    </div>

                    <div className="flex items-center space-x-1 text-[11px] text-emerald-800 font-bold px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{primaryLeadScore.aiScoreData.confidence}</span>
                    </div>
                  </div>

                  {/* Narrative */}
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1.5">
                    <div className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      <Bot className="w-3.5 h-3.5 text-cyan-600" />
                      <span>AI Score Explanation (Observable & Verified)</span>
                    </div>
                    <p className="text-slate-800 text-xs font-medium leading-relaxed italic">
                      &ldquo;{primaryLeadScore.aiScoreData.explanation.narrative}&rdquo;
                    </p>
                  </div>

                  {/* Value Drivers */}
                  {primaryLeadScore.aiScoreData.explanation.whyThisScore &&
                    primaryLeadScore.aiScoreData.explanation.whyThisScore.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                          Key Value Drivers:
                        </span>
                        <ul className="space-y-1 text-xs text-slate-800">
                          {primaryLeadScore.aiScoreData.explanation.whyThisScore.map((reason, idx) => (
                            <li key={idx} className="flex items-start space-x-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 shrink-0 mt-0.5" />
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {/* Pitch Angle */}
                  {primaryLeadScore.aiScoreData.explanation.recommendedPitchAngle && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs flex items-start space-x-2.5">
                      <Target className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5 text-slate-800">
                        <strong className="text-amber-900 block text-[11px] uppercase font-bold">
                          Recommended Pitch Angle:
                        </strong>
                        <span className="font-medium">{primaryLeadScore.aiScoreData.explanation.recommendedPitchAngle}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* The 6 Multi-Dimensional Scores Grid */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="uppercase tracking-wider">Multi-Dimensional Scoring Matrix (0–100)</span>
                    <span className="text-slate-500 font-normal">All 6 diagnostic components</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                      {
                        key: 'digitalOpportunity',
                        label: 'Digital Opportunity',
                        score: primaryLeadScore.aiScoreData.digitalOpportunity,
                        dim: primaryLeadScore.aiScoreData.dimensions.digitalOpportunity,
                        textColor: 'text-cyan-700',
                      },
                      {
                        key: 'websiteOpportunity',
                        label: 'Website Opportunity',
                        score: primaryLeadScore.aiScoreData.websiteOpportunity,
                        dim: primaryLeadScore.aiScoreData.dimensions.websiteOpportunity,
                        textColor: 'text-blue-700',
                      },
                      {
                        key: 'socialOpportunity',
                        label: 'Social Opportunity',
                        score: primaryLeadScore.aiScoreData.socialOpportunity,
                        dim: primaryLeadScore.aiScoreData.dimensions.socialOpportunity,
                        textColor: 'text-purple-700',
                      },
                      {
                        key: 'businessStrength',
                        label: 'Business Strength',
                        score: primaryLeadScore.aiScoreData.businessStrength,
                        dim: primaryLeadScore.aiScoreData.dimensions.businessStrength,
                        textColor: 'text-emerald-700',
                      },
                      {
                        key: 'contactability',
                        label: 'Direct Contactability',
                        score: primaryLeadScore.aiScoreData.contactability,
                        dim: primaryLeadScore.aiScoreData.dimensions.contactability,
                        textColor: 'text-amber-700',
                      },
                      {
                        key: 'overallProspectScore',
                        label: 'Overall Prospect Fit',
                        score: primaryLeadScore.aiScoreData.overallProspectScore,
                        dim: primaryLeadScore.aiScoreData.dimensions.overallProspectScore || {
                          score: primaryLeadScore.aiScoreData.overallProspectScore,
                          weight: 1.0,
                          rationale: 'Composite diagnostic scoring across all technical, digital and commercial dimensions.',
                          observableDrivers: []
                        },
                        textColor: 'text-teal-700',
                      },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2.5 flex flex-col justify-between shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 text-xs">{item.label}</span>
                          <span className={`text-base font-black ${item.textColor}`}>{item.score}/100</span>
                        </div>

                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-slate-900 h-full rounded-full transition-all"
                            style={{ width: `${item.score}%` }}
                          />
                        </div>

                        <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                          {item.dim.rationale}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <p className="text-xs text-slate-600">
                  Detailed multi-dimensional AI scoring hasn't been run for this prospect yet.
                </p>
                <button
                  type="button"
                  disabled={isScoringLead}
                  onClick={handleScoreLead}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer inline-flex items-center space-x-2 shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScoringLead ? 'animate-spin' : ''}`} />
                  <span>{isScoringLead ? 'Scoring...' : 'Run AI Scoring'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* SECTION 8: RECOMMENDED SERVICES */}
        {/* =================================================================== */}
        {isSectionVisible('services') && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>8. Recommended Services</span>
              </div>
              <span className="text-xs text-slate-500 font-medium">Bespoke Client Pitch Package</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {(lead.servicesRecommended || [
                'Modern Mobile-First Web Redesign',
                'Sub-Second Page Speed Overhaul',
                'Patient / Client Online Scheduling Integration',
                'Schema.org Rich Snippets & Local Search Sync',
              ]).map((srv, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-slate-800 font-semibold">{srv}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* SECTION 9: OUTREACH TRACKER */}
        {/* =================================================================== */}
        {isSectionVisible('outreach') && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <Send className="w-4 h-4 text-violet-600" />
                <span>9. AI-Assisted Outreach Tracker</span>
              </div>
              <span className="text-xs text-slate-500 font-mono">Manual send required</span>
            </div>

            {/* AI Outreach Drafter */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-200">
                <Sparkles className="w-4 h-4 text-violet-600" />
                <span className="text-xs font-bold text-slate-900">Generate Outreach Draft</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-600 uppercase font-bold">Channel</label>
                  <select 
                    value={outreachChannel}
                    onChange={(e) => setOutreachChannel(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:border-cyan-500"
                  >
                    <option value="CALL">Cold Call Opening</option>
                    <option value="EMAIL">Email</option>
                    <option value="FACEBOOK">Facebook</option>
                    <option value="MESSENGER">Messenger</option>
                    <option value="SMS">SMS</option>
                    <option value="MEETING">Meeting</option>
                    <option value="PROPOSAL">Proposal</option>
                    <option value="FOLLOW_UP">Follow-up</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button 
                    disabled={isDraftingOutreach}
                    onClick={handleDraftOutreach}
                    className="w-full h-[32px] bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isDraftingOutreach ? 'animate-spin' : ''}`} />
                    <span>{isDraftingOutreach ? 'Drafting...' : 'Generate Copy'}</span>
                  </button>
                </div>
              </div>

              {outreachDraft !== null && (
                <div className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-600 uppercase font-bold flex justify-between">
                      <span>Message Body</span>
                      <span className="text-violet-700 font-semibold italic">Manual sending required</span>
                    </label>
                    <textarea
                      value={outreachDraft}
                      onChange={(e) => setOutreachDraft(e.target.value)}
                      className="w-full h-24 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-cyan-500 font-mono resize-none"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-600 uppercase font-bold">Outcome</label>
                      <input 
                        type="text"
                        value={outreachOutcome}
                        onChange={(e) => setOutreachOutcome(e.target.value)}
                        placeholder="e.g. Left voicemail, sent email"
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:border-cyan-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-600 uppercase font-bold">Next Action</label>
                      <input 
                        type="text"
                        value={outreachNextAction}
                        onChange={(e) => setOutreachNextAction(e.target.value)}
                        placeholder="e.g. Call back in 2 days"
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:border-cyan-500"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2">
                    <select 
                      value={outreachStatus}
                      onChange={(e) => setOutreachStatus(e.target.value as any)}
                      className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden"
                    >
                      <option value="COMPLETED">Completed</option>
                      <option value="NO_ANSWER">No Answer</option>
                      <option value="REPLIED">Replied</option>
                      <option value="OPTED_OUT">Opted Out</option>
                    </select>
                    
                    <button
                      onClick={handleLogOutreach}
                      className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs shadow-xs cursor-pointer"
                    >
                      Log Activity
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Logged History</h4>
              {outreachHistory.length > 0 ? (
                <div className="space-y-2.5">
                  {outreachHistory.map((out) => (
                    <div key={out.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 uppercase text-xs flex items-center space-x-1.5">
                          <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-bold">{out.channel}</span>
                          <span className="text-slate-500 font-mono text-[10px]">{out.sentAt ? new Date(out.sentAt).toLocaleString() : 'Draft'}</span>
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          out.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {out.status}
                        </span>
                      </div>
                      <p className="text-slate-800 text-xs leading-relaxed italic bg-white p-2.5 rounded-lg border border-slate-200">"{out.messageBody}"</p>
                      
                      {(out.outcomeNotes || out.nextAction) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-[11px]">
                          {out.outcomeNotes && (
                            <div>
                              <span className="block text-slate-500 uppercase font-bold mb-0.5">Outcome</span>
                              <span className="text-slate-800">{out.outcomeNotes}</span>
                            </div>
                          )}
                          {out.nextAction && (
                            <div>
                              <span className="block text-slate-500 uppercase font-bold mb-0.5">Next Action</span>
                              <span className="text-violet-700 font-semibold">{out.nextAction}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500 italic">
                  No outreach activities logged for this prospect yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* SECTION 10: FOLLOW-UPS */}
        {/* =================================================================== */}
        {isSectionVisible('followups') && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <CalendarClock className="w-4 h-4 text-amber-600" />
                <span>10. Follow-ups & Reminders</span>
              </div>
              <button
                onClick={() => setShowAddFollowUp(!showAddFollowUp)}
                className="text-xs text-cyan-700 hover:text-cyan-800 flex items-center space-x-1 font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Follow-up</span>
              </button>
            </div>

            {showAddFollowUp && (
              <form onSubmit={handleCreateFollowUp} className="p-3.5 rounded-xl bg-slate-50 border border-slate-300 space-y-2.5 text-xs">
                <input
                  type="text"
                  placeholder="Follow-up reason (e.g., Call managing partner regarding proposal review)"
                  value={newFollowUpReason}
                  onChange={(e) => setNewFollowUpReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-cyan-500"
                />
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAddFollowUp(false)}
                    className="px-3 py-1 text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer shadow-xs"
                  >
                    Save Reminder
                  </button>
                </div>
              </form>
            )}

            {followUps.length > 0 ? (
              <div className="space-y-2 text-xs">
                {followUps.map((fu) => (
                  <div
                    key={fu.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="font-bold text-slate-900">{fu.reason}</div>
                      <div className="text-[11px] text-slate-500">
                        Scheduled: {new Date(fu.scheduledDate).toLocaleDateString()} • Priority: {fu.priority}
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleFollowUp(fu.id)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                        fu.isCompleted
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {fu.isCompleted ? 'Completed' : 'Mark Done'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-2">No follow-ups currently scheduled.</p>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* SECTION 11: PROPOSAL (In Philippine Peso with Manual Pricing) */}
        {/* =================================================================== */}
        {isSectionVisible('proposal') && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <FileText className="w-4 h-4 text-teal-600" />
                <span>11. Commercial Proposal & Deliverables</span>
              </div>
              
              {!primaryProposal && (
                <button
                  type="button"
                  disabled={isGeneratingProposal}
                  onClick={handleGenerateProposal}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isGeneratingProposal ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingProposal ? 'Drafting...' : 'Generate Proposal Draft'}</span>
                </button>
              )}
            </div>

            {proposalNotification && (
              <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 flex items-center space-x-2 font-medium">
                <CheckCircle className="w-4 h-4 text-teal-600 shrink-0" />
                <span>{proposalNotification}</span>
              </div>
            )}

            {primaryProposal ? (
              <div className="space-y-4 text-xs">
                {/* Manual Approval Banner in Crisp Light Mode */}
                {primaryProposal.status === 'DRAFT' && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-900 font-bold text-xs uppercase tracking-wider flex items-center space-x-1.5">
                        <ShieldAlert className="w-4 h-4 text-amber-600" />
                        <span>Manual Approval Required</span>
                      </span>
                      <button
                        onClick={() => handleApproveProposal(primaryProposal.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                      >
                        Approve Proposal
                      </button>
                    </div>
                    <p className="text-amber-800 text-[11px] leading-relaxed font-medium">
                      This is an AI-generated draft scope. Review the recommended package and pricing in Philippine Peso below. Only approved proposals can be finalized or sent to the client.
                    </p>
                  </div>
                )}

                {/* Proposal Summary Card with Editable Pricing */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 gap-3">
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900 text-sm">{primaryProposal.title}</h4>
                    <p className="text-slate-600 text-xs">{primaryProposal.clientExecutiveSummary}</p>
                    <div className="text-[10px] font-mono text-slate-500 pt-0.5">ID: {primaryProposal.proposalNumber}</div>
                  </div>

                  <div className="sm:text-right shrink-0 space-y-1">
                    {isEditingProposalPrice ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-700 text-xs">₱</span>
                        <input
                          type="text"
                          value={customProposalPrice}
                          onChange={(e) => setCustomProposalPrice(e.target.value)}
                          placeholder="e.g. 75000"
                          className="w-28 px-2 py-0.5 text-xs font-bold rounded border border-slate-300 bg-white text-slate-900 focus:border-teal-500 focus:outline-hidden"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleSaveProposalPrice}
                          className="p-1 rounded bg-teal-600 text-white hover:bg-teal-700 cursor-pointer shrink-0"
                          title="Save Price"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingProposalPrice(false)}
                          className="p-1 rounded text-slate-500 hover:bg-slate-200 cursor-pointer shrink-0"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center sm:justify-end gap-1.5">
                          <span className="text-lg font-black text-slate-900">
                            {formatPHP(primaryProposal.totalUSD)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomProposalPrice(String(primaryProposal.totalUSD));
                              setIsEditingProposalPrice(true);
                            }}
                            className="text-xs text-teal-700 hover:underline font-bold cursor-pointer"
                            title="Edit Price"
                          >
                            <Edit3 className="w-3.5 h-3.5 inline" />
                          </button>
                        </div>
                        <span className="inline-flex mt-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-teal-50 text-teal-800 border border-teal-200">
                          {primaryProposal.status}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {primaryProposal.isAiDraft && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[11px] font-bold text-teal-800 uppercase">Why this business needs it</span>
                      <p className="text-slate-700 leading-relaxed text-[11px] font-medium">{primaryProposal.whyItNeedsIt}</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[11px] font-bold text-teal-800 uppercase">Recommended Design Direction</span>
                      <p className="text-slate-700 leading-relaxed text-[11px] font-medium">{primaryProposal.recommendedDesignDirection}</p>
                    </div>
                  </div>
                )}

                {/* Items and Deliverables */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 uppercase">Package Deliverables: {primaryProposal.recommendedPackage}</span>
                  {primaryProposal.items.map((item) => (
                    <div key={item.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">{item.title}</div>
                        <div className="text-[11px] text-slate-600 mt-1">
                          <ul className="list-disc list-inside space-y-0.5">
                            {item.deliverables.map((deliv, idx) => (
                              <li key={idx}>{deliv}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="font-mono text-slate-900 shrink-0 font-bold text-sm">
                        {formatPHP(item.fixedPriceUSD)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-2">No proposal created for this lead yet. Click "Generate Proposal Draft" to create one.</p>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* SECTION 12: CRM NOTES */}
        {/* =================================================================== */}
        {isSectionVisible('notes') && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <StickyNote className="w-4 h-4 text-amber-600" />
                <span>12. User CRM Notes & Strategy</span>
              </div>
              <DataCategoryPill category="USER_CRM" />
            </div>

            {editingNotes ? (
              <div className="space-y-2.5 text-xs">
                <textarea
                  rows={4}
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  className="w-full p-3 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-hidden focus:border-cyan-500 font-sans"
                />
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => {
                      setNotesValue(business.crm.internalNotes || '');
                      setEditingNotes(false);
                    }}
                    className="px-3 py-1.5 text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNotes}
                    className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer shadow-xs"
                  >
                    Save Notes
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold">Internal Notes:</span>
                  <button
                    onClick={() => setEditingNotes(true)}
                    className="text-cyan-700 hover:text-cyan-800 font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>
                <p className="text-slate-800 whitespace-pre-wrap leading-relaxed font-medium">
                  {business.crm.internalNotes || 'No notes added yet. Click edit to record proprietary CRM notes.'}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200">
                  {business.crm.tags.map((tag, idx) => (
                    <span key={idx} className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 text-[10px] font-bold">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* SECTION 13: AUDIT HISTORY */}
        {/* =================================================================== */}
        {isSectionVisible('audit') && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <History className="w-4 h-4 text-slate-500" />
                <span>13. Immutable Audit History</span>
              </div>
              <DataCategoryPill category="AUDIT_HISTORY" />
            </div>

            {auditLogs.length > 0 ? (
              <div className="space-y-2 text-xs">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1 font-mono">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-cyan-800 font-bold">{log.action}</span>
                      <span className="text-slate-500 text-[10px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-800 text-[11px]">{log.changeSummary}</p>
                    <div className="text-[10px] text-slate-500">Operator: {log.actorId}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-2">No explicit audit events recorded for this entity yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
