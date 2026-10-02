import React, { useState } from 'react';
import {
  X,
  Plus,
  Building2,
  Globe,
  Phone,
  Compass,
  DollarSign,
  User,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { LeadPipelineStatus } from '../../types';
import { MAIN_WORKFLOW_STAGES } from '../../config/pipeline';
import { businessService, leadService } from '../../services';

interface QuickAddLeadModalProps {
  initialStage?: LeadPipelineStatus;
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newLeadId: string) => void;
}

export const QuickAddLeadModal: React.FC<QuickAddLeadModalProps> = ({
  initialStage = 'Discover',
  isOpen,
  onClose,
  onCreated,
}) => {
  const [businessName, setBusinessName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [locality, setLocality] = useState('Philadelphia');
  const [pipelineStatus, setPipelineStatus] = useState<LeadPipelineStatus>(initialStage);
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [owner, setOwner] = useState('Kieth Gonzales');
  const [estimatedDealValueUSD, setEstimatedDealValueUSD] = useState(4500);
  const [probability, setProbability] = useState(40);
  const [source, setSource] = useState('Manual Prospecting');
  const [tagInput, setTagInput] = useState('High Intent, Local Business');
  const [notes, setNotes] = useState('');
  const [nextFollowUp, setNextFollowUp] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      setError('Business name is required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // 1. Register business entity
      const { business } = businessService.register({
        name: businessName.trim(),
        website: websiteUrl.trim() || undefined,
        phone: phone.trim() || undefined,
        address: locality.trim() ? { locality: locality.trim(), country: 'US' } : undefined,
        sourceType: 'MANUAL_IMPORT',
        tags: tagInput.split(',').map((t) => t.trim()).filter(Boolean),
        notes: notes.trim() || undefined,
      });

      // 2. Find and update lead
      const lead = leadService.getByBusinessId(business.id);
      if (lead) {
        leadService.update(lead.id, {
          pipelineStatus,
          status: pipelineStatus,
          priority,
          owner,
          estimatedDealValueUSD: Number(estimatedDealValueUSD) || 3500,
          probability: Number(probability) || 50,
          source,
          nextFollowUp,
          nextFollowUpDate: nextFollowUp,
          tags: tagInput.split(',').map((t) => t.trim()).filter(Boolean),
          notes: notes.trim(),
          serviceInterest: ['Modern Mobile-First Redesign', 'Local SEO'],
        });
        onCreated(lead.id);
      } else {
        onCreated(business.id);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create prospect');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
      <div
        className="w-full max-w-xl my-8 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-700 font-bold">
              Pipeline Entry
            </span>
            <h2 className="text-lg font-bold text-slate-900">Add New Prospect to CRM</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="px-6 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
              Business Name *
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="e.g. Center City Orthodontics"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 text-sm font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Website URL
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="https://..."
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="+63 9... or +1 ..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Workflow Stage
              </label>
              <select
                value={pipelineStatus}
                onChange={(e) => setPipelineStatus(e.target.value as LeadPipelineStatus)}
                className="w-full px-2.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 font-medium focus:outline-none focus:border-cyan-600 cursor-pointer"
              >
                {MAIN_WORKFLOW_STAGES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-2.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 font-medium focus:outline-none focus:border-cyan-600 cursor-pointer"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Owner
              </label>
              <select
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 font-medium focus:outline-none focus:border-cyan-600 cursor-pointer"
              >
                <option value="Kieth Ryan Gonzales">Kieth Ryan Gonzales</option>
                <option value="Account Owner">Account Owner</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Estimated Project Price (PHP ₱)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₱</span>
                <input
                  type="number"
                  step="500"
                  value={estimatedDealValueUSD}
                  onChange={(e) => setEstimatedDealValueUSD(Number(e.target.value))}
                  placeholder="Set your project price in PHP"
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 font-bold focus:outline-none focus:border-cyan-600"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Win Probability ({probability}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={probability}
                onChange={(e) => setProbability(Number(e.target.value))}
                className="w-full accent-cyan-600 mt-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Next Follow-up
              </label>
              <input
                type="date"
                value={nextFollowUp}
                onChange={(e) => setNextFollowUp(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-cyan-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="e.g. Redesign, High-Ticket"
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-cyan-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
              Initial Notes & Proposal Scope
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Scope details, opportunity drivers, custom pricing notes..."
              className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-600"
            />
          </div>

          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {saving ? 'Creating...' : 'Create Prospect Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
