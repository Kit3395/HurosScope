import React, { useState, useMemo } from 'react';
import {
  Building2,
  Calendar,
  DollarSign,
  User,
  Tag,
  Flame,
  ArrowRight,
  ArrowLeft,
  Edit3,
  ExternalLink,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Clock,
  Sparkles,
  FileText,
  Percent,
  ChevronDown,
  Layers,
  Archive,
  Trash2,
} from 'lucide-react';
import { Business, Lead, LeadPipelineStatus, MainWorkflowStage } from '../../types';
import { MAIN_WORKFLOW_STAGES, PIPELINE_STAGES, normalizePipelineStatus } from '../../config/pipeline';
import { leadService, businessService, intelligenceService } from '../../services';
import { LeadEditModal } from './LeadEditModal';
import { QuickAddLeadModal } from './QuickAddLeadModal';
import { formatPHP } from '../../utils/currency';

interface KanbanBoardProps {
  leads: Lead[];
  businesses: Business[];
  onLeadSelect: (leadId: string) => void;
  onRefresh: () => void;
}

const STAGE_COLORS: Record<MainWorkflowStage, { headerBg: string; border: string; accent: string; badge: string }> = {
  Discover: {
    headerBg: 'bg-sky-50',
    border: 'border-sky-200',
    accent: 'text-sky-700',
    badge: 'bg-sky-100 text-sky-800 border-sky-200',
  },
  Qualify: {
    headerBg: 'bg-indigo-50',
    border: 'border-indigo-200',
    accent: 'text-indigo-700',
    badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
  Contact: {
    headerBg: 'bg-amber-50',
    border: 'border-amber-200',
    accent: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  'Follow-up': {
    headerBg: 'bg-purple-50',
    border: 'border-purple-200',
    accent: 'text-purple-700',
    badge: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  Proposal: {
    headerBg: 'bg-orange-50',
    border: 'border-orange-200',
    accent: 'text-orange-700',
    badge: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  Client: {
    headerBg: 'bg-emerald-50',
    border: 'border-emerald-200',
    accent: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  leads,
  businesses,
  onLeadSelect,
  onRefresh,
}) => {
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOwner, setSelectedOwner] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [minDealValue, setMinDealValue] = useState<number>(0);
  const [showLostColumn, setShowLostColumn] = useState<boolean>(false);

  // Drag and drop state
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  // Modals state
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [quickAddStage, setQuickAddStage] = useState<LeadPipelineStatus | null>(null);

  // Map business by ID for O(1) lookups
  const businessMap = useMemo(() => {
    const map = new Map<string, Business>();
    for (const b of businesses) {
      map.set(b.id, b);
    }
    return map;
  }, [businesses]);

  // Unique owners for filter
  const allOwners = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.owner) set.add(l.owner);
    });
    return Array.from(set);
  }, [leads]);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (lead.isDeleted) return false;

      const biz = businessMap.get(lead.businessId);
      const name = biz?.crm.verifiedBusinessName || biz?.external.tradeName || '';
      const tags = [...(lead.tags || []), ...(biz?.crm.tags || [])];
      const notes = lead.notes || biz?.crm.internalNotes || '';

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = name.toLowerCase().includes(q);
        const matchTag = tags.some((t) => t.toLowerCase().includes(q));
        const matchNotes = notes.toLowerCase().includes(q);
        const matchOwner = (lead.owner || '').toLowerCase().includes(q);
        const matchService = (lead.serviceInterest || []).some((s) => s.toLowerCase().includes(q));
        if (!matchName && !matchTag && !matchNotes && !matchOwner && !matchService) {
          return false;
        }
      }

      if (selectedOwner !== 'ALL' && lead.owner !== selectedOwner) {
        return false;
      }

      if (selectedPriority !== 'ALL' && lead.priority !== selectedPriority) {
        return false;
      }

      if (minDealValue > 0 && (lead.estimatedDealValueUSD || 0) < minDealValue) {
        return false;
      }

      return true;
    });
  }, [leads, businessMap, searchQuery, selectedOwner, selectedPriority, minDealValue]);

  // Stage grouped leads
  const columnsData = useMemo(() => {
    const stages: Array<LeadPipelineStatus> = [...MAIN_WORKFLOW_STAGES];
    if (showLostColumn) {
      stages.push('Lost');
    }

    const grouped: Record<string, Lead[]> = {};
    for (const st of stages) {
      grouped[st] = [];
    }

    for (const lead of filteredLeads) {
      const canonical = normalizePipelineStatus(lead.pipelineStatus);
      if (grouped[canonical]) {
        grouped[canonical].push(lead);
      } else if (canonical === 'Lost') {
        if (showLostColumn) {
          grouped['Lost'].push(lead);
        }
      } else {
        // Default to Discover
        if (grouped['Discover']) {
          grouped['Discover'].push(lead);
        }
      }
    }

    return grouped;
  }, [filteredLeads, showLostColumn]);

  // Executive KPI summary calculations
  const boardMetrics = useMemo(() => {
    let totalPipelineValue = 0;
    let weightedForecast = 0;
    let activeProspectsCount = 0;
    let wonValue = 0;
    let wonCount = 0;

    for (const lead of filteredLeads) {
      const canonical = normalizePipelineStatus(lead.pipelineStatus);
      const val = lead.estimatedDealValueUSD || 0;
      const prob = lead.probability !== undefined ? lead.probability : 50;

      if (canonical === 'Client') {
        wonValue += val;
        wonCount++;
      } else if (canonical !== 'Lost') {
        totalPipelineValue += val;
        weightedForecast += (val * prob) / 100;
        activeProspectsCount++;
      }
    }

    const avgProbability =
      activeProspectsCount > 0
        ? Math.round(
            filteredLeads
              .filter((l) => normalizePipelineStatus(l.pipelineStatus) !== 'Lost' && normalizePipelineStatus(l.pipelineStatus) !== 'Client')
              .reduce((sum, l) => sum + (l.probability !== undefined ? l.probability : 50), 0) /
              (activeProspectsCount || 1)
          )
        : 0;

    return {
      totalPipelineValue,
      weightedForecast: Math.round(weightedForecast),
      activeProspectsCount,
      avgProbability,
      wonValue,
      wonCount,
    };
  }, [filteredLeads]);

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingLeadId(leadId);
  };

  const handleDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStage !== stage) {
      setDragOverStage(stage);
    }
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = (e: React.DragEvent, targetStage: LeadPipelineStatus) => {
    e.preventDefault();
    setDragOverStage(null);
    const leadId = e.dataTransfer.getData('text/plain') || draggingLeadId;
    setDraggingLeadId(null);

    if (leadId) {
      leadService.updatePipelineStatus(leadId, targetStage);
      onRefresh();
    }
  };

  // Step Move buttons
  const handleStepMove = (leadId: string, currentStage: LeadPipelineStatus, direction: 'prev' | 'next') => {
    const canonical = normalizePipelineStatus(currentStage);
    const currentIndex = MAIN_WORKFLOW_STAGES.indexOf(canonical as MainWorkflowStage);
    if (currentIndex === -1) return;

    let targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (targetIndex >= 0 && targetIndex < MAIN_WORKFLOW_STAGES.length) {
      const nextStage = MAIN_WORKFLOW_STAGES[targetIndex];
      leadService.updatePipelineStatus(leadId, nextStage);
      onRefresh();
    }
  };

  // Follow-up relative badge helper
  const getFollowUpStatus = (dateStr?: string) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: `Overdue (${Math.abs(diffDays)}d)`, color: 'bg-rose-500/15 text-rose-300 border-rose-500/30' };
    }
    if (diffDays === 0) {
      return { label: 'Today', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
    }
    if (diffDays === 1) {
      return { label: 'Tomorrow', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' };
    }
    if (diffDays <= 7) {
      return { label: `In ${diffDays}d`, color: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
    return { label: dateStr, color: 'bg-slate-800 text-slate-400 border-slate-700' };
  };

  return (
    <div className="space-y-4">
      {/* 1. PIPELINE KPI SUMMARY STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Active Prospects</div>
            <div className="text-xl font-black text-slate-900 tracking-tight">{boardMetrics.activeProspectsCount}</div>
            <div className="text-[10px] text-slate-500 font-medium">Across 5 stages</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Pipeline Value</div>
            <div className="text-lg font-black text-emerald-700 tracking-tight">
              {formatPHP(boardMetrics.totalPipelineValue)}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">Gross opportunity sum</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Weighted Forecast</div>
            <div className="text-lg font-black text-purple-800 tracking-tight">
              {formatPHP(boardMetrics.weightedForecast)}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">Value × Probability</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Avg. Probability</div>
            <div className="text-xl font-black text-amber-800 tracking-tight">{boardMetrics.avgProbability}%</div>
            <div className="text-[10px] text-slate-500 font-medium">Conversion confidence</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center space-x-3 col-span-2 sm:col-span-1">
          <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Clients Converted</div>
            <div className="text-lg font-black text-teal-700 tracking-tight">
              {formatPHP(boardMetrics.wonValue)}
            </div>
            <div className="text-[10px] text-teal-800 font-semibold">{boardMetrics.wonCount} won accounts</div>
          </div>
        </div>
      </div>

      {/* 2. BOARD FILTER & CONTROL BAR */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search prospect name, tags, owner, service interest, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-cyan-500"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Owner Filter */}
          <div className="flex items-center space-x-1.5">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedOwner}
              onChange={(e) => setSelectedOwner(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 font-medium focus:outline-hidden focus:border-cyan-500 cursor-pointer"
            >
              <option value="ALL">All Owners</option>
              {allOwners.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center space-x-1.5">
            <Flame className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 font-medium focus:outline-hidden focus:border-cyan-500 cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Deal Value Filter */}
          <div className="flex items-center space-x-1.5">
            <DollarSign className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={minDealValue}
              onChange={(e) => setMinDealValue(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 font-medium focus:outline-hidden focus:border-cyan-500 cursor-pointer"
            >
              <option value={0}>Any Deal Value</option>
              <option value={25000}>₱25,000+</option>
              <option value={50000}>₱50,000+</option>
              <option value={100000}>₱100,000+</option>
            </select>
          </div>

          {/* Toggle Lost Column */}
          <label className="flex items-center space-x-1.5 text-slate-600 hover:text-slate-900 cursor-pointer select-none px-1 font-medium">
            <input
              type="checkbox"
              checked={showLostColumn}
              onChange={(e) => setShowLostColumn(e.target.checked)}
              className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
            />
            <span>Show Lost ({leads.filter((l) => normalizePipelineStatus(l.pipelineStatus) === 'Lost').length})</span>
          </label>

          {/* Quick Add Button */}
          <button
            type="button"
            onClick={() => setQuickAddStage('Discover')}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center space-x-1 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Prospect</span>
          </button>
        </div>
      </div>

      {/* 3. KANBAN HORIZONTAL COLUMNS WORKSPACE */}
      <div className="overflow-x-auto pb-4 pt-1">
        <div className="flex items-start space-x-4 min-w-[1300px]">
          {([
            ...MAIN_WORKFLOW_STAGES,
            ...(showLostColumn ? (['Lost'] as LeadPipelineStatus[]) : []),
          ] as LeadPipelineStatus[]).map((stageKey, stageIdx) => {
            const stageLeads = columnsData[stageKey] || [];
            const stageConf = PIPELINE_STAGES[stageKey];
            const isCanonical = MAIN_WORKFLOW_STAGES.includes(stageKey as MainWorkflowStage);
            const style = isCanonical ? STAGE_COLORS[stageKey as MainWorkflowStage] : {
              headerBg: 'bg-slate-100',
              border: 'border-slate-200',
              accent: 'text-slate-700',
              badge: 'bg-slate-200 text-slate-700 border-slate-300',
            };

            const stageTotalValue = stageLeads.reduce((acc, l) => acc + (l.estimatedDealValueUSD || 0), 0);
            const stageWeightedValue = Math.round(
              stageLeads.reduce((acc, l) => acc + ((l.estimatedDealValueUSD || 0) * (l.probability !== undefined ? l.probability : 50)) / 100, 0)
            );

            const isDropTarget = dragOverStage === stageKey;

            return (
              <div
                key={stageKey}
                onDragOver={(e) => handleDragOver(e, stageKey)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stageKey)}
                className={`w-80 shrink-0 rounded-2xl border transition-all flex flex-col max-h-[820px] ${style.border} ${
                  isDropTarget
                    ? 'bg-cyan-50/50 ring-2 ring-cyan-500 shadow-xl shadow-cyan-500/10'
                    : 'bg-slate-100/60'
                }`}
              >
                {/* Column Header */}
                <div className={`p-4 rounded-t-2xl border-b border-slate-200 ${style.headerBg} space-y-2`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${stageConf.dotColor}`} />
                      <h3 className="font-bold text-slate-900 tracking-tight text-sm flex items-center space-x-1.5">
                        <span>{stageKey}</span>
                        {isCanonical && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            ({stageIdx + 1}/6)
                          </span>
                        )}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${style.badge}`}>
                        {stageLeads.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuickAddStage(stageKey)}
                        title={`Quick add prospect to ${stageKey}`}
                        className="p-1 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-200/60 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Stage Metrics */}
                  <div className="flex items-center justify-between text-[11px] pt-1 text-slate-600">
                    <span className="font-bold text-slate-900">
                      {formatPHP(stageTotalValue)}
                    </span>
                    <span className="text-slate-500">
                      Weighted: <strong className="text-emerald-700 font-bold">{formatPHP(stageWeightedValue)}</strong>
                    </span>
                  </div>
                </div>

                {/* Column Card Body */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[220px]">
                  {stageLeads.length === 0 ? (
                    <div className="h-40 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-center p-4 text-slate-400 text-xs">
                      <Building2 className="w-6 h-6 mb-1.5 opacity-40" />
                      <span className="font-medium">No prospects in {stageKey}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">Drag cards here or click +</span>
                    </div>
                  ) : (
                    stageLeads.map((lead) => {
                      const biz = businessMap.get(lead.businessId);
                      const bizName = biz?.crm.verifiedBusinessName || biz?.external.tradeName || 'Prospect Lead';
                      const followUpBadge = getFollowUpStatus(lead.nextFollowUp || lead.nextFollowUpDate);
                      const priorityColor = {
                        CRITICAL: 'bg-rose-50 text-rose-700 border-rose-200',
                        HIGH: 'bg-amber-50 text-amber-700 border-amber-200',
                        MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200',
                        LOW: 'bg-slate-100 text-slate-700 border-slate-200',
                      }[lead.priority || 'MEDIUM'];

                      const prob = lead.probability !== undefined ? lead.probability : 50;
                      const dealValue = lead.estimatedDealValueUSD || 45000;
                      const calculatedWeighted = Math.round((dealValue * prob) / 100);
                      const leadScore = intelligenceService.getLatestLeadScore(lead.businessId);

                      const isDragging = draggingLeadId === lead.id;

                      return (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          className={`p-3.5 rounded-xl border bg-white border-slate-200 hover:border-slate-300 transition-all shadow-xs hover:shadow-md group cursor-grab active:cursor-grabbing space-y-2.5 ${
                            isDragging ? 'opacity-40 scale-95' : ''
                          }`}
                        >
                          {/* Card Header: Business Name & Edit / Details Button */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4
                                onClick={() => onLeadSelect(lead.id)}
                                title="Click to open full 13-section technical dossier"
                                className="font-bold text-slate-900 text-sm tracking-tight truncate hover:text-cyan-700 transition-colors cursor-pointer flex items-center space-x-1"
                              >
                                <span className="truncate">{bizName}</span>
                                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-cyan-600" />
                              </h4>
                              <div className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                                {biz?.external.primaryCategoryCode || 'Local Business'} •{' '}
                                {biz?.external.externalAddress?.locality || 'Philippines'}
                              </div>
                            </div>

                            {/* Priority Badge */}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${priorityColor}`}>
                              {lead.priority || 'MED'}
                            </span>
                          </div>

                          {/* Financials & Probability */}
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 text-sm">
                                {formatPHP(dealValue)}
                              </span>
                              <span className="text-[11px] font-mono text-cyan-800 font-bold">
                                {prob}% prob
                              </span>
                            </div>

                            {/* Probability Progress Bar */}
                            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-slate-900 h-full rounded-full transition-all duration-300"
                                style={{ width: `${prob}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                              <span>Forecast Value:</span>
                              <span className="font-mono text-emerald-700 font-bold">
                                {formatPHP(calculatedWeighted)}
                              </span>
                            </div>
                          </div>

                          {/* AI Lead Score  */}
                          {leadScore && (
                            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-cyan-50/70 border border-cyan-200 text-[11px]">
                              <div className="flex items-center space-x-1.5 text-slate-600">
                                <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                                <span className="text-[10px] font-bold tracking-wider text-slate-700">AI Score</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <span className="font-bold text-cyan-800 font-mono text-xs">
                                  {leadScore.overallProspectScore || leadScore.overallScore}/100
                                </span>
                                {leadScore.grade && (
                                  <span className="px-1.5 py-0.2 rounded bg-cyan-100 text-cyan-900 text-[9px] font-bold border border-cyan-300">
                                    {leadScore.grade}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Owner & Follow-up Row */}
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            {/* Owner */}
                            <div className="flex items-center space-x-1.5 truncate text-slate-700 font-medium">
                              <User className="w-3 h-3 text-indigo-600 shrink-0" />
                              <span className="truncate" title={lead.owner || 'Kieth Ryan Gonzales'}>
                                {lead.owner || 'Kieth Ryan Gonzales'}
                              </span>
                            </div>

                            {/* Next Follow-up */}
                            {followUpBadge ? (
                              <div
                                className={`flex items-center justify-end space-x-1 px-1.5 py-0.5 rounded border text-[10px] font-medium ${followUpBadge.color}`}
                                title={`Next follow-up: ${lead.nextFollowUp || lead.nextFollowUpDate}`}
                              >
                                <Calendar className="w-3 h-3 shrink-0" />
                                <span className="truncate">{followUpBadge.label}</span>
                              </div>
                            ) : (
                              <div className="text-right text-[10px] text-slate-400">No follow-up set</div>
                            )}
                          </div>

                          {/* Service Interest Chips */}
                          {lead.serviceInterest && lead.serviceInterest.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {lead.serviceInterest.slice(0, 2).map((srv) => (
                                <span
                                  key={srv}
                                  className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold truncate max-w-[200px]"
                                  title={srv}
                                >
                                  {srv}
                                </span>
                              ))}
                              {lead.serviceInterest.length > 2 && (
                                <span className="text-[10px] text-slate-500 self-center font-medium">
                                  +{lead.serviceInterest.length - 2}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Tags */}
                          {lead.tags && lead.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {lead.tags.slice(0, 2).map((t) => (
                                <span
                                  key={t}
                                  className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold truncate max-w-[140px]"
                                >
                                  #{t}
                                </span>
                              ))}
                              {lead.tags.length > 2 && (
                                <span className="text-[10px] text-slate-500 self-center font-medium">
                                  +{lead.tags.length - 2}
                                </span>
                              )}
                            </div>
                          )}

                          {/* CRM Notes Excerpt */}
                          {lead.notes && (
                            <p className="text-[11px] text-slate-600 line-clamp-2 italic bg-slate-50 p-2 rounded-lg border border-slate-200 font-sans">
                              "{lead.notes}"
                            </p>
                          )}

                          {/* Card Footer: Step Controls & Quick Edit */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                            {/* Move Left Button */}
                            <button
                              type="button"
                              onClick={() => handleStepMove(lead.id, stageKey, 'prev')}
                              disabled={stageKey === 'Discover'}
                              title="Move back one stage"
                              className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                            </button>

                            {/* Middle: Source and Quick Edit */}
                            <div className="flex items-center space-x-1.5 text-[10px] text-slate-500">
                              <span className="truncate max-w-[90px]" title={lead.source || 'Places API'}>
                                {lead.source || 'Places API'}
                              </span>
                              <span>•</span>
                              <button
                                type="button"
                                onClick={() => setEditingLead(lead)}
                                className="text-cyan-700 hover:text-cyan-800 font-bold flex items-center space-x-0.5 hover:underline cursor-pointer"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                            </div>

                            {/* Move Right Button */}
                            <button
                              type="button"
                              onClick={() => handleStepMove(lead.id, stageKey, 'next')}
                              disabled={stageKey === 'Client'}
                              title="Progress to next stage"
                              className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. MODALS */}
      {editingLead && (
        <LeadEditModal
          lead={editingLead}
          isOpen={Boolean(editingLead)}
          onClose={() => setEditingLead(null)}
          onSaved={onRefresh}
        />
      )}

      {quickAddStage && (
        <QuickAddLeadModal
          initialStage={quickAddStage}
          isOpen={Boolean(quickAddStage)}
          onClose={() => setQuickAddStage(null)}
          onCreated={(newLeadId) => {
            onRefresh();
            onLeadSelect(newLeadId);
          }}
        />
      )}
    </div>
  );
};
