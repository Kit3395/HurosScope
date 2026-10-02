import React, { useState, useMemo } from 'react';
import {
  Building2,
  Trash2,
  RotateCcw,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  CheckCircle,
  Tag,
  CheckSquare,
  Sparkles,
  Plus,
  Search,
  Filter,
  Flame,
  Archive,
  Download,
  Upload,
  Merge,
  ChevronRight,
  X,
  Layers,
  ArrowUpDown,
} from 'lucide-react';
import { businessService, leadService } from '../services';
import { humanApprovalGate } from '../security/approvalGate';
import { Business, Lead, LeadPipelineStatus } from '../types';
import { ALL_PIPELINE_STATUSES, PIPELINE_STAGES, normalizePipelineStatus } from '../config/pipeline';
import { PipelineStatusBadge } from '../components/PipelineStatusBadge';
import { ActionConfirmationModal } from '../components/ActionConfirmationModal';
import { BulkActionModal } from '../components/BulkActionModal';
import { LeadDetailPanel } from '../components/LeadDetailPanel';
import { PipelineLifecycleBanner } from '../components/PipelineLifecycleBanner';

interface LeadsPageProps {
  initialLeadId?: string;
  initialFilterStatus?: LeadPipelineStatus;
}

export const LeadsPage: React.FC<LeadsPageProps> = ({
  initialLeadId,
  initialFilterStatus,
}) => {
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>(initialFilterStatus || 'ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Multi-selection for bulk operations
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  // Selected lead for detail panel
  const leads = leadService.getAll(includeDeleted, includeArchived);
  const businesses = businessService.getAll(includeDeleted);

  const [activeLeadId, setActiveLeadId] = useState<string | null>(
    () => initialLeadId || (leads[0]?.id ?? null)
  );

  // Modal states for safety dialogs
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetDeleteLeadId, setTargetDeleteLeadId] = useState<string | null>(null);

  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [targetArchiveLeadId, setTargetArchiveLeadId] = useState<string | null>(null);

  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);

  const [bulkUpdateModalOpen, setBulkUpdateModalOpen] = useState(false);
  const [bulkTargetStatus, setBulkTargetStatus] = useState<LeadPipelineStatus>('Qualified');

  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [mergeSecondaryId, setMergeSecondaryId] = useState<string>('');

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importText, setImportText] = useState(
    'Beacon Hill Dental, https://beaconhilldental.com, +1 215-555-0811, Center City practice\nIndependence Law Group, https://independencelaw.com, +1 215-555-0922, Corporate legal firm'
  );

  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const biz = businesses.find((b) => b.id === lead.businessId);
      const name = biz?.crm.verifiedBusinessName || biz?.external.tradeName || '';

      if (statusFilter !== 'ALL' && normalizePipelineStatus(lead.pipelineStatus) !== statusFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = name.toLowerCase().includes(q);
        const matchDomain = biz?.identifiers.normalizedDomain.toLowerCase().includes(q);
        const matchTag = biz?.crm.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchName && !matchDomain && !matchTag) return false;
      }

      return true;
    });
  }, [leads, businesses, statusFilter, searchQuery, refreshTrigger]);

  const activeLead = leads.find((l) => l.id === activeLeadId) || filteredLeads[0] || null;
  const activeBusiness = activeLead ? businesses.find((b) => b.id === activeLead.businessId) : null;

  const refreshAll = () => {
    setRefreshTrigger((k) => k + 1);
  };

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeadIds(filteredLeads.map((l) => l.id));
    } else {
      setSelectedLeadIds([]);
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Single Status Change
  const handleStatusChange = (leadId: string, newStatus: LeadPipelineStatus) => {
    leadService.updatePipelineStatus(leadId, newStatus);
    refreshAll();
  };

  // Single Soft-Delete Confirmation
  const handlePromptDelete = (leadId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTargetDeleteLeadId(leadId);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!targetDeleteLeadId) return;
    leadService.softDelete(targetDeleteLeadId);
    setDeleteModalOpen(false);
    setTargetDeleteLeadId(null);
    refreshAll();
  };

  const handleRestoreLead = (leadId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    leadService.restore(leadId);
    refreshAll();
  };

  // Single Archive Confirmation
  const handlePromptArchive = (leadId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTargetArchiveLeadId(leadId);
    setArchiveModalOpen(true);
  };

  const handleConfirmArchive = () => {
    if (!targetArchiveLeadId) return;
    const target = leadService.getById(targetArchiveLeadId);
    if (target?.isArchived) {
      leadService.unarchive(targetArchiveLeadId);
    } else {
      leadService.archive(targetArchiveLeadId);
    }
    setArchiveModalOpen(false);
    setTargetArchiveLeadId(null);
    refreshAll();
  };

  // Bulk Soft-Delete
  const handleConfirmBulkDelete = async () => {
    const approved = await humanApprovalGate.requestApproval({
      actionType: 'BULK_DELETE',
      targetSummary: `${selectedLeadIds.length} Leads selected for soft deletion`,
      itemCount: selectedLeadIds.length,
      customDescription: `This action will soft-delete ${selectedLeadIds.length} leads and cascade soft-deletion to their anchor businesses. Data remains recoverable in the Recycle Bin.`,
    });
    if (!approved) return;

    leadService.bulkDelete(selectedLeadIds);
    setSelectedLeadIds([]);
    setBulkDeleteModalOpen(false);
    refreshAll();
  };

  // Bulk Status Update
  const handleConfirmBulkUpdate = () => {
    leadService.bulkUpdate(selectedLeadIds, { pipelineStatus: bulkTargetStatus });
    setSelectedLeadIds([]);
    setBulkUpdateModalOpen(false);
    refreshAll();
  };

  // Merge Leads
  const handleConfirmMerge = async () => {
    if (!activeLeadId || !mergeSecondaryId || activeLeadId === mergeSecondaryId) return;

    const approved = await humanApprovalGate.requestApproval({
      actionType: 'MERGE',
      targetSummary: `Consolidating Secondary Lead [${mergeSecondaryId}] into Primary Lead [${activeLeadId}]`,
      customDescription: `All contact history, website audits, and proposals from the secondary record will be consolidated into the primary record.`,
    });
    if (!approved) return;

    leadService.merge(activeLeadId, mergeSecondaryId);
    setMergeModalOpen(false);
    setMergeSecondaryId('');
    refreshAll();
  };

  // Import Leads
  const handleConfirmImport = () => {
    const lines = importText.split('\n').map((l) => l.trim()).filter(Boolean);
    const parsedRecords = lines.map((line) => {
      const parts = line.split(',').map((p) => p.trim());
      return {
        name: parts[0] || 'Imported Prospect',
        website: parts[1] || '',
        phone: parts[2] || '',
        notes: parts[3] || 'Imported batch prospect',
        pipelineStatus: 'New' as LeadPipelineStatus,
      };
    });

    leadService.import(parsedRecords);
    setImportModalOpen(false);
    refreshAll();
  };

  // Export Leads
  const handleDownloadExport = () => {
    const exportData = filteredLeads.map((l) => {
      const b = businesses.find((biz) => biz.id === l.businessId);
      return {
        leadId: l.id,
        businessId: l.businessId,
        businessName: b?.crm.verifiedBusinessName || b?.external.tradeName,
        website: b?.external.externalWebsiteUrl,
        pipelineStatus: l.pipelineStatus,
        priority: l.priority,
        estimatedDealValueUSD: l.estimatedDealValueUSD,
        createdAt: l.createdAt,
      };
    });

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `horusscope_leads_export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setExportModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-xs text-blue-700 font-bold uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" />
            <span>Lead Lifecycle & CRM Command</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Pipeline Prospect Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Track, audit, score, and progress web design acquisition targets across the standardized pipeline stages.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          <button
            onClick={() => setImportModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 hover:text-slate-900 flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs font-semibold"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Import</span>
          </button>
          <button
            onClick={() => setExportModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 hover:text-slate-900 flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export</span>
          </button>
          {activeLead && (
            <button
              onClick={() => setMergeModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-800 flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs font-semibold"
            >
              <Merge className="w-3.5 h-3.5" />
              <span>Merge</span>
            </button>
          )}
        </div>
      </div>

      {/* Governing Acquisition Principle Bar */}
      <PipelineLifecycleBanner
        currentStage={statusFilter === 'ALL' ? undefined : (statusFilter as LeadPipelineStatus)}
        onSelectStage={(stage) => setStatusFilter(stage)}
      />

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by business name, domain, or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Toggle Switches: Soft-Deleted & Archived */}
          <div className="flex items-center space-x-4 text-xs text-slate-600 select-none font-medium">
            <label className="flex items-center space-x-2 cursor-pointer hover:text-slate-900">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Archived</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer hover:text-slate-900">
              <input
                type="checkbox"
                checked={includeDeleted}
                onChange={(e) => setIncludeDeleted(e.target.checked)}
                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <span>Soft-Deleted</span>
            </label>
          </div>
        </div>

        {/* Pipeline Stages Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs no-scrollbar pt-1 border-t border-slate-100">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200'
            }`}
          >
            All Stages ({leads.length})
          </button>
          {ALL_PIPELINE_STATUSES.map((statusKey) => {
            const count = leads.filter(
              (l) => normalizePipelineStatus(l.pipelineStatus) === statusKey
            ).length;
            const isSelected = statusFilter === statusKey;
            return (
              <button
                key={statusKey}
                onClick={() => setStatusFilter(statusKey)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200'
                }`}
              >
                <span>{statusKey}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${isSelected ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bulk Action Controls Bar (when rows are selected) */}
      {selectedLeadIds.length > 0 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center space-x-2 text-blue-900 font-semibold">
            <CheckSquare className="w-4 h-4 text-blue-600" />
            <span>{selectedLeadIds.length} lead(s) selected</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setBulkUpdateModalOpen(true)}
              className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
            >
              Bulk Update Stage
            </button>
            <button
              onClick={() => setBulkDeleteModalOpen(true)}
              className="px-3 py-1.5 rounded bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-medium transition-colors"
            >
              Bulk Soft-Delete
            </button>
            <button
              onClick={() => setSelectedLeadIds([])}
              className="px-2 py-1.5 text-slate-600 hover:text-slate-900"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* MASTER-DETAIL WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[680px]">
        {/* LEFT COLUMN: Lead Directory List (5 cols) */}
        <div className="lg:col-span-5 space-y-3 flex flex-col">
          <div className="flex items-center justify-between px-1 text-xs font-semibold text-slate-500">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={
                  filteredLeads.length > 0 && selectedLeadIds.length === filteredLeads.length
                }
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="uppercase tracking-wider text-slate-700">Select All ({filteredLeads.length})</span>
            </label>
            <span className="text-[11px] text-slate-500">Click to view 13-section dossier</span>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[760px] pr-1">
            {filteredLeads.length === 0 ? (
              <div className="p-12 text-center bg-white border border-slate-200 rounded-xl space-y-3 shadow-xs">
                <Building2 className="w-10 h-10 mx-auto text-slate-400" />
                <p className="text-sm text-slate-800 font-bold">No prospects match your criteria.</p>
                <p className="text-xs text-slate-500">
                  Try clearing the status filter or importing initial business records.
                </p>
              </div>
            ) : (
              filteredLeads.map((lead) => {
                const biz = businesses.find((b) => b.id === lead.businessId);
                const isSelected = activeLead?.id === lead.id;
                const isChecked = selectedLeadIds.includes(lead.id);
                const bizName = biz?.crm.verifiedBusinessName || biz?.external.tradeName || 'Prospect Lead';

                return (
                  <div
                    key={lead.id}
                    onClick={() => setActiveLeadId(lead.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2.5 group ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-500 shadow-md ring-1 ring-blue-500/30'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs hover:bg-slate-50'
                    } ${lead.isDeleted ? 'opacity-60 border-red-200 bg-red-50' : ''} ${
                      lead.isArchived ? 'opacity-70 bg-slate-100' : ''
                    }`}
                  >
                    {/* Item Row Top */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start space-x-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleSelectOne(lead.id);
                          }}
                          className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-700 transition-colors">
                              {bizName}
                            </h3>
                            {lead.isDeleted && (
                              <span className="px-1.5 py-0.2 rounded bg-red-100 text-red-700 text-[10px] font-bold border border-red-300">
                                DELETED
                              </span>
                            )}
                            {lead.isArchived && (
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-300">
                                ARCHIVED
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                            {biz?.external.externalAddress?.locality || 'Philadelphia'} •{' '}
                            {biz?.identifiers.normalizedDomain || 'No website'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-black text-slate-900">
                          ${(lead.estimatedDealValueUSD || 3500).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-rose-600 font-bold flex items-center justify-end space-x-0.5">
                          <Flame className="w-3 h-3" />
                          <span>{lead.temperature || 'WARM'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Item Row Bottom: Interactive Status Badge & Action triggers */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                      <PipelineStatusBadge
                        status={lead.pipelineStatus}
                        size="sm"
                        interactive={true}
                        onStatusChange={(newStatus) => handleStatusChange(lead.id, newStatus)}
                      />

                      <div className="flex items-center space-x-1">
                        {lead.isDeleted ? (
                          <button
                            onClick={(e) => handleRestoreLead(lead.id, e)}
                            title="Restore Lead"
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => handlePromptDelete(lead.id, e)}
                            title="Soft Delete Lead"
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-700 transition-colors" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: 13-Section Detailed Dossier (7 cols) */}
        <div className="lg:col-span-7 flex flex-col">
          {activeLead && activeBusiness ? (
            <LeadDetailPanel
              lead={activeLead}
              business={activeBusiness}
              onStatusChange={(newStatus) => handleStatusChange(activeLead.id, newStatus)}
              onArchive={() => handlePromptArchive(activeLead.id)}
              onDelete={() => handlePromptDelete(activeLead.id)}
              onLeadUpdated={refreshAll}
            />
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 flex flex-col items-center justify-center h-full">
              <Building2 className="w-12 h-12 text-slate-400 mb-3" />
              <p className="text-sm font-bold text-slate-800">No Lead Selected</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Select any business record on the left to inspect the complete 13-section technical & CRM dossier.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* SAFETY DIALOGS & CONFIRMATION MODALS */}
      {/* =================================================================== */}

      {/* 1. Single Soft-Delete Modal */}
      <ActionConfirmationModal
        isOpen={deleteModalOpen}
        title="Soft Delete Lead Prospect"
        description="Are you sure you want to soft-delete this lead? In accordance with safety architecture, all data is retained, immutable audit history is recorded, and the record can be restored at any time."
        confirmLabel="Soft Delete Lead"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />

      {/* 2. Archive / Unarchive Modal */}
      <ActionConfirmationModal
        isOpen={archiveModalOpen}
        title={leadService.getById(targetArchiveLeadId || '')?.isArchived ? 'Unarchive Lead' : 'Archive Lead'}
        description={
          leadService.getById(targetArchiveLeadId || '')?.isArchived
            ? 'This will restore the lead to active pipeline views and summaries.'
            : 'Archiving hides the lead from active pipeline boards while preserving all audits, notes, contacts, and proposals intact.'
        }
        confirmLabel={leadService.getById(targetArchiveLeadId || '')?.isArchived ? 'Unarchive' : 'Archive'}
        isDestructive={false}
        onConfirm={handleConfirmArchive}
        onCancel={() => setArchiveModalOpen(false)}
      />

      {/* 3. Bulk Soft-Delete Modal */}
      <BulkActionModal
        isOpen={bulkDeleteModalOpen}
        actionTitle="Bulk Soft-Delete"
        affectedCount={selectedLeadIds.length}
        entityName="Lead Prospect"
        requiredPhrase="CONFIRM BULK"
        onConfirm={handleConfirmBulkDelete}
        onCancel={() => setBulkDeleteModalOpen(false)}
      />

      {/* 4. Bulk Update Stage Modal */}
      {bulkUpdateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Bulk Update Pipeline Stage</h3>
              <button
                onClick={() => setBulkUpdateModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300">
              Apply a new pipeline stage across all <strong>{selectedLeadIds.length}</strong> selected leads simultaneously.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Target Pipeline Stage</label>
              <select
                value={bulkTargetStatus}
                onChange={(e) => setBulkTargetStatus(e.target.value as LeadPipelineStatus)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {ALL_PIPELINE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status} ({PIPELINE_STAGES[status].category})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setBulkUpdateModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkUpdate}
                className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg"
              >
                Apply to {selectedLeadIds.length} Leads
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Merge Leads Modal */}
      {mergeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-indigo-500/50 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-indigo-400 font-bold">
                <Merge className="w-5 h-5" />
                <h3 className="text-base text-white">Non-Destructive Lead Merge</h3>
              </div>
              <button
                onClick={() => setMergeModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Merging combines verified contacts, CRM notes, and tags into the primary lead. The secondary lead will be archived non-destructively with an audit reference.
            </p>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs">
              <span className="text-slate-400">Primary Surviving Lead:</span>
              <div className="font-bold text-white mt-0.5">
                {activeBusiness?.crm.verifiedBusinessName} ({activeLead?.id})
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Select Secondary Lead to Merge:</label>
              <select
                value={mergeSecondaryId}
                onChange={(e) => setMergeSecondaryId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">-- Choose secondary lead --</option>
                {leads
                  .filter((l) => l.id !== activeLeadId && !l.isDeleted)
                  .map((l) => {
                    const b = businesses.find((biz) => biz.id === l.businessId);
                    return (
                      <option key={l.id} value={l.id}>
                        {b?.crm.verifiedBusinessName || l.id} (${l.estimatedDealValueUSD || 0})
                      </option>
                    );
                  })}
              </select>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setMergeModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!mergeSecondaryId}
                onClick={handleConfirmMerge}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg"
              >
                Confirm Merge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Import Leads Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-cyan-400 font-bold">
                <Upload className="w-5 h-5" />
                <h3 className="text-base text-white">Import Business Prospects</h3>
              </div>
              <button
                onClick={() => setImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Format: <code>Business Name, Website, Phone, Notes</code> (one per line). All records are checked for duplicate domains and phones automatically.
            </p>

            <textarea
              rows={6}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            />

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg"
              >
                Import Records
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Export Confirmation Modal */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-cyan-400 font-bold">
                <Download className="w-5 h-5" />
                <h3 className="text-base text-white">Export Lead Data</h3>
              </div>
              <button
                onClick={() => setExportModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Exporting <strong>{filteredLeads.length}</strong> currently filtered lead records to formatted JSON.
            </p>

            <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-300 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Compliance Notice: Export contains verified business contact data only. No sensitive personal identifiers.</span>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDownloadExport}
                className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg"
              >
                Download JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
