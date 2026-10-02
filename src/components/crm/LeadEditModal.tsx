import React, { useState } from 'react';
import {
  X,
  Save,
  Tag,
  DollarSign,
  Percent,
  Calendar,
  User,
  AlertCircle,
  FileText,
  Compass,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Lead, LeadPipelineStatus } from '../../types';
import { MAIN_WORKFLOW_STAGES, PIPELINE_STAGES } from '../../config/pipeline';
import { leadService, businessService } from '../../services';

interface LeadEditModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const COMMON_SERVICES = [
  'Modern Mobile-First Redesign',
  'Patient / Client Online Booking',
  'Core Web Vitals Speed Boost',
  'Local SEO & Schema.org',
  'Emergency Dispatch Landing Page',
  'Interactive Portfolio Grid',
  'Confidential Client Intake Portal',
  'E-Commerce & Online Ordering',
  'Custom Interactive Menu',
];

const PRESET_OWNERS = [
  'Kieth Gonzales',
  'Sarah Chen',
  'Alex Morgan',
  'Unassigned',
];

const PRESET_SOURCES = [
  'Google Places API',
  'Referral',
  'Cold Outreach',
  'Manual Prospecting',
  'Inbound Inquiry',
  'Direct Website Lookup',
];

export const LeadEditModal: React.FC<LeadEditModalProps> = ({
  lead,
  isOpen,
  onClose,
  onSaved,
}) => {
  const business = businessService.getById(lead.businessId);
  const businessName = business?.crm.verifiedBusinessName || business?.external.tradeName || 'Prospect Lead';

  // 11 Form Fields state
  const [pipelineStatus, setPipelineStatus] = useState<LeadPipelineStatus>(lead.pipelineStatus || 'Discover');
  const [tags, setTags] = useState<string[]>(lead.tags || business?.crm.tags || []);
  const [newTagInput, setNewTagInput] = useState('');
  const [notes, setNotes] = useState<string>(lead.notes || business?.crm.internalNotes || '');
  const [priority, setPriority] = useState<Lead['priority']>(lead.priority || 'MEDIUM');
  const [owner, setOwner] = useState<string>(lead.owner || 'Kieth Gonzales');
  const [nextFollowUp, setNextFollowUp] = useState<string>(lead.nextFollowUp || lead.nextFollowUpDate || '');
  const [serviceInterest, setServiceInterest] = useState<string[]>(lead.serviceInterest || lead.servicesRecommended || []);
  const [newServiceInput, setNewServiceInput] = useState('');
  const [estimatedDealValueUSD, setEstimatedDealValueUSD] = useState<number>(lead.estimatedDealValueUSD || 3500);
  const [probability, setProbability] = useState<number>(lead.probability !== undefined ? lead.probability : 50);
  const [source, setSource] = useState<string>(lead.source || 'Google Places API');
  const [createdDate, setCreatedDate] = useState<string>(
    lead.createdAt ? lead.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddTag = () => {
    const trimmed = newTagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleToggleService = (service: string) => {
    if (serviceInterest.includes(service)) {
      setServiceInterest(serviceInterest.filter((s) => s !== service));
    } else {
      setServiceInterest([...serviceInterest, service]);
    }
  };

  const handleAddCustomService = () => {
    const trimmed = newServiceInput.trim();
    if (trimmed && !serviceInterest.includes(trimmed)) {
      setServiceInterest([...serviceInterest, trimmed]);
      setNewServiceInput('');
    }
  };

  const handleSetQuickFollowUp = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    setNextFollowUp(d.toISOString().split('T')[0]);
  };

  const handleSave = () => {
    setSaving(true);
    setError(null);
    try {
      leadService.update(lead.id, {
        pipelineStatus,
        status: pipelineStatus,
        tags,
        notes,
        priority,
        owner,
        nextFollowUp,
        nextFollowUpDate: nextFollowUp,
        serviceInterest,
        servicesRecommended: serviceInterest,
        estimatedDealValueUSD: Number(estimatedDealValueUSD) || 0,
        probability: Math.min(100, Math.max(0, Number(probability) || 0)),
        source,
      });

      // Also update business CRM tags & notes for persistence consistency
      if (business) {
        businessService.updateCRM(business.id, {
          tags,
          internalNotes: notes,
        });
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save lead changes');
    } finally {
      setSaving(false);
    }
  };

  const weightedValue = Math.round(((Number(estimatedDealValueUSD) || 0) * (Number(probability) || 0)) / 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div
        className="w-full max-w-3xl my-8 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2 text-xs font-mono text-cyan-600">
              <span className="font-bold">Lead CRM</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500 font-mono">ID: {lead.id}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <span>Edit Prospect: {businessName}</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="px-6 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-center space-x-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs bg-white">
          {/* Top Grid: 1. Lead Status & 4. Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Lead Status */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                <Compass className="w-3.5 h-3.5 text-cyan-600" />
                <span>1. Lead Status (Pipeline Stage)</span>
              </label>
              <select
                value={pipelineStatus}
                onChange={(e) => setPipelineStatus(e.target.value as LeadPipelineStatus)}
                className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 font-semibold focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                {MAIN_WORKFLOW_STAGES.map((st) => (
                  <option key={st} value={st}>
                    {st} — {PIPELINE_STAGES[st]?.description?.split('.')[0] || st}
                  </option>
                ))}
                <option value="Lost">Lost / Unqualified — Opportunity passed</option>
              </select>
            </div>

            {/* 4. Priority */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                4. Priority
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((pr) => {
                  const isSelected = priority === pr;
                  const colorMap = {
                    LOW: 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-400',
                    MEDIUM: 'bg-slate-50 border-slate-200 text-blue-700 hover:border-blue-400',
                    HIGH: 'bg-slate-50 border-slate-200 text-amber-700 hover:border-amber-400',
                    CRITICAL: 'bg-slate-50 border-slate-200 text-rose-700 hover:border-rose-400',
                  };
                  const activeColorMap = {
                    LOW: 'bg-slate-200 text-slate-900 border-slate-400 font-bold',
                    MEDIUM: 'bg-blue-50 text-blue-800 border-blue-400 font-bold',
                    HIGH: 'bg-amber-50 text-amber-800 border-amber-400 font-bold',
                    CRITICAL: 'bg-rose-50 text-rose-800 border-rose-400 font-bold',
                  };
                  return (
                    <button
                      key={pr}
                      type="button"
                      onClick={() => setPriority(pr)}
                      className={`py-2 px-2 rounded-lg border text-center font-medium transition-all cursor-pointer ${
                        isSelected ? activeColorMap[pr] : colorMap[pr]
                      }`}
                    >
                      {pr}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Grid: 5. Owner & 10. Source */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 5. Owner */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                <span>5. Owner / Assignee</span>
              </label>
              <div className="flex space-x-2">
                <select
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-cyan-500 cursor-pointer font-medium"
                >
                  {PRESET_OWNERS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Or custom owner..."
                  value={PRESET_OWNERS.includes(owner) ? '' : owner}
                  onChange={(e) => setOwner(e.target.value)}
                  className="w-1/2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500 font-medium"
                />
              </div>
            </div>

            {/* 10. Source */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                10. Lead Source
              </label>
              <div className="flex space-x-2">
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-cyan-500 cursor-pointer font-medium"
                >
                  {PRESET_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Or custom source..."
                  value={PRESET_SOURCES.includes(source) ? '' : source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-1/2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Grid: 8. Estimated Deal Value & 9. Probability */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            {/* 8. Estimated Deal Value */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>8. Estimated Deal Value (USD)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={estimatedDealValueUSD}
                  onChange={(e) => setEstimatedDealValueUSD(Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 font-bold text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex space-x-1.5 pt-1">
                {[2500, 4500, 6500, 8500, 12000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setEstimatedDealValueUSD(val)}
                    className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-[10px] text-slate-700 border border-slate-200 font-mono transition-colors"
                  >
                    ${(val / 1000).toFixed(1)}k
                  </button>
                ))}
              </div>
            </div>

            {/* 9. Probability */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                  <Percent className="w-3.5 h-3.5 text-cyan-600" />
                  <span>9. Win Probability</span>
                </label>
                <span className="font-mono text-cyan-600 font-bold">{probability}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={probability}
                onChange={(e) => setProbability(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                <span>Weighted Value:</span>
                <span className="font-mono font-bold text-emerald-600">${weightedValue.toLocaleString()} USD</span>
              </div>
            </div>
          </div>

          {/* Grid: 6. Next Follow-up & 11. Created Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 6. Next Follow-up */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-600" />
                <span>6. Next Follow-up Date</span>
              </label>
              <input
                type="date"
                value={nextFollowUp}
                onChange={(e) => setNextFollowUp(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-cyan-500 font-medium"
              />
              <div className="flex items-center space-x-1.5 pt-1">
                <span className="text-[10px] text-slate-500 font-medium">Quick set:</span>
                <button
                  type="button"
                  onClick={() => handleSetQuickFollowUp(1)}
                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] text-slate-700 font-medium"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickFollowUp(3)}
                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] text-slate-700 font-medium"
                >
                  +3 Days
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickFollowUp(7)}
                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] text-slate-700 font-medium"
                >
                  Next Week
                </button>
              </div>
            </div>

            {/* 11. Created Date */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                11. Created Date
              </label>
              <input
                type="date"
                value={createdDate}
                onChange={(e) => setCreatedDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-cyan-500 font-medium"
              />
              <div className="text-[10px] text-slate-500 pt-0.5">
                Timestamp: {lead.createdAt ? new Date(lead.createdAt).toLocaleTimeString() : 'Initial system registration'}
              </div>
            </div>
          </div>

          {/* 7. Service Interest */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>7. Service Interest</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_SERVICES.map((srv) => {
                const isSelected = serviceInterest.includes(srv);
                return (
                  <button
                    key={srv}
                    type="button"
                    onClick={() => handleToggleService(srv)}
                    className={`px-2.5 py-1 rounded-full text-xs transition-colors cursor-pointer border ${
                      isSelected
                        ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 font-medium'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {srv}
                  </button>
                );
              })}
            </div>
            {/* Add custom service */}
            <div className="flex space-x-2 pt-1">
              <input
                type="text"
                placeholder="Add custom service offering..."
                value={newServiceInput}
                onChange={(e) => setNewServiceInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomService())}
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500 font-medium"
              />
              <button
                type="button"
                onClick={handleAddCustomService}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors border border-slate-200"
              >
                Add Service
              </button>
            </div>
          </div>

          {/* 2. Tags */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
              <Tag className="w-3.5 h-3.5 text-cyan-600" />
              <span>2. Tags</span>
            </label>
            <div className="flex flex-wrap gap-1.5 min-h-[28px]">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-semibold"
                >
                  <span>{t}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-red-500 p-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {tags.length === 0 && <span className="text-slate-400 italic font-medium">No tags assigned yet.</span>}
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="New tag (e.g. Redesign Candidate, Medical, Center City)..."
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500 font-medium"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors border border-slate-200"
              >
                Add Tag
              </button>
            </div>
          </div>

          {/* 3. Notes */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>3. CRM Notes & Interaction Logs</span>
            </label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record outreach observations, key objections, decision maker preferences, proposal feedback..."
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-cyan-500 leading-relaxed font-sans font-medium"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium">
            Changes are logged to the immutable audit trail and synced across CRM layers.
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-bold transition-colors border border-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-md disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Prospect Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
