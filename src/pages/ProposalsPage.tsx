import React, { useState } from 'react';
import {
  FileText,
  Lock,
  DollarSign,
  CheckCircle2,
  Layers,
  ShieldAlert,
  Download,
  Edit3,
  Save,
  X,
  Plus,
} from 'lucide-react';
import { proposalService, businessService, intelligenceService, leadService } from '../services';
import { humanApprovalGate } from '../security/approvalGate';
import { Proposal } from '../types';
import { PipelineLifecycleBanner } from '../components/PipelineLifecycleBanner';
import { formatPHP } from '../utils/currency';

export const ProposalsPage: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const proposals = proposalService.getAll(false);
  
  // Find updated selected proposal after refresh
  const currentSelectedId = proposals[0]?.id;
  const [selectedPropId, setSelectedPropId] = useState<string | null>(currentSelectedId || null);
  
  const selectedProp = proposals.find(p => p.id === selectedPropId) || proposals[0] || null;

  const associatedBiz = selectedProp ? businessService.getById(selectedProp.businessId) : null;

  // Manual Pricing editing state
  const [isEditingPricing, setIsEditingPricing] = useState(false);
  const [customTotalPHP, setCustomTotalPHP] = useState<number>(selectedProp?.totalUSD ?? 0);
  const [customItemPrices, setCustomItemPrices] = useState<Record<string, number>>({});

  // New-proposal creation modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createBusinessId, setCreateBusinessId] = useState('');
  const [createTitle, setCreateTitle] = useState('');
  const [createAmount, setCreateAmount] = useState('45000');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const qualifiedBusinesses = businessService.getAll(false).filter(
    (b) => b.crm.qualificationStatus === 'QUALIFIED' || leadService.getByBusinessId(b.id)
  );

  const handleCreateProposal = async (mode: 'ai' | 'blank') => {
    if (!createBusinessId) {
      setCreateError('Select a business first.');
      return;
    }
    setIsCreating(true);
    setCreateError(null);
    try {
      let proposal: Proposal;
      if (mode === 'ai') {
        proposal = await intelligenceService.generateProposal(createBusinessId);
        if (createTitle.trim()) {
          proposal = proposalService.update(proposal.id, { title: createTitle.trim() });
        }
      } else {
        const biz = businessService.getById(createBusinessId);
        const bizName = biz?.crm.verifiedBusinessName || biz?.external.tradeName || 'Client';
        const lead = leadService.getByBusinessId(createBusinessId);
        const amount = Math.max(0, Number(createAmount) || 0);
        const now = new Date();
        proposal = proposalService.create({
          id: `prop_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
          category: 'USER_CRM',
          businessId: createBusinessId,
          leadId: lead?.id || `lead_${createBusinessId}`,
          proposalNumber: `PROP-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          title: createTitle.trim() || `Proposal for ${bizName}`,
          clientExecutiveSummary: '',
          items: amount > 0 ? [{
            id: `item_${Date.now().toString(36)}`,
            title: 'Project Scope',
            description: 'As discussed.',
            itemType: 'CUSTOM_DESIGN',
            deliverables: [],
            fixedPriceUSD: amount,
            estimatedHours: 0,
          }] : [],
          subtotalUSD: amount,
          totalUSD: amount,
          validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'DRAFT',
          paymentProcessingActive: false,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          isDeleted: false,
        } as Proposal);
      }
      setSelectedPropId(proposal.id);
      setIsCreateOpen(false);
      setCreateBusinessId('');
      setCreateTitle('');
      setCreateAmount('45000');
      setRefreshKey((prev) => prev + 1);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create the proposal.');
    } finally {
      setIsCreating(false);
    }
  };

  const startEditPricing = () => {
    if (!selectedProp) return;
    setCustomTotalPHP(selectedProp.totalUSD);
    const initialItems: Record<string, number> = {};
    selectedProp.items.forEach(it => {
      initialItems[it.id] = it.fixedPriceUSD;
    });
    setCustomItemPrices(initialItems);
    setIsEditingPricing(true);
  };

  const handleSavePricing = () => {
    if (!selectedProp) return;
    const updatedItems = selectedProp.items.map(it => ({
      ...it,
      fixedPriceUSD: customItemPrices[it.id] !== undefined ? customItemPrices[it.id] : it.fixedPriceUSD,
    }));
    const newSubtotal = updatedItems.reduce((acc, curr) => acc + curr.fixedPriceUSD, 0);
    const newTotal = customTotalPHP || newSubtotal;

    proposalService.update(selectedProp.id, {
      items: updatedItems,
      subtotalUSD: newSubtotal,
      totalUSD: newTotal,
    });
    setIsEditingPricing(false);
    setRefreshKey(prev => prev + 1);
  };

  const handleApprove = async () => {
    if (!selectedProp) return;

    const approved = await humanApprovalGate.requestApproval({
      actionType: 'PROPOSAL_FINALIZATION',
      targetSummary: `Proposal: "${selectedProp.title}" (${formatPHP(selectedProp.totalUSD)})`,
      customDescription: `Finalizing this proposal marks it as REVIEWED and locks deliverables and commercial investment of ${formatPHP(selectedProp.totalUSD)}.`,
    });
    if (!approved) return;

    proposalService.update(selectedProp.id, { status: 'REVIEWED' });
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Proposals & Scopes of Work</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-mono font-bold">
              SCOPE ARCHITECTURE
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
            Bespoke web design and digital marketing scopes, deliverables, and investment breakdowns.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Proposal</span>
          </button>
          <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
            <Lock className="w-3.5 h-3.5" />
            <span>Payment Processing Locked</span>
          </span>
        </div>
      </div>

      {/* Governing Acquisition Principle Bar */}
      <PipelineLifecycleBanner currentStage="Proposal" />

      {/* Safety Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2 shadow-xs">
        <div className="flex items-center space-x-2 text-amber-700 font-bold text-sm">
          <ShieldAlert className="w-4 h-4" />
          <span>Payment Processing Invariant</span>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed">
          HORUSCOPE focuses on scope drafting, deliverable itemization, and client value proposition framing. Live credit card processing, merchant integrations, and automated invoicing are strictly omitted.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Proposal list sidebar */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2 max-h-[70vh] overflow-y-auto">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider px-1">
            All Proposals ({proposals.length})
          </div>
          {proposals.length === 0 && (
            <p className="text-[11px] text-slate-500 px-1">No proposals yet.</p>
          )}
          {proposals.map((p) => {
            const isActive = p.id === selectedProp?.id;
            const biz = businessService.getById(p.businessId);
            const bizName = biz?.crm.verifiedBusinessName || biz?.external.tradeName || 'Unknown client';
            return (
              <button
                key={p.id}
                onClick={() => { setSelectedPropId(p.id); setIsEditingPricing(false); }}
                className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-900'
                }`}
              >
                <div className="text-xs font-bold truncate">{p.title}</div>
                <div className={`text-[10px] truncate mt-0.5 ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                  {bizName}
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className={`text-[10px] font-mono font-bold ${isActive ? 'text-amber-300' : 'text-slate-500'}`}>
                    {p.proposalNumber}
                  </span>
                  <span className={`text-[10px] font-bold ${isActive ? 'text-slate-200' : 'text-slate-600'}`}>
                    {formatPHP(p.totalUSD)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-3 space-y-6 min-w-0">
      {/* Proposal Scope View */}
      {selectedProp && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono text-amber-600 font-bold">
                  {selectedProp.proposalNumber}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-slate-100 text-slate-700">
                  {selectedProp.status}
                </span>
                {selectedProp.status === 'DRAFT' && selectedProp.isAiDraft && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                    REQUIRES APPROVAL
                  </span>
                )}
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-1">{selectedProp.title}</h2>
              <div className="text-xs text-slate-600 mt-1">
                Client: <strong className="text-slate-900">{associatedBiz?.crm.verifiedBusinessName}</strong>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Investment</div>
                {isEditingPricing ? (
                  <div className="flex items-center space-x-1.5 mt-1">
                    <span className="font-bold text-slate-700 text-lg">₱</span>
                    <input
                      type="number"
                      value={customTotalPHP}
                      onChange={(e) => setCustomTotalPHP(Math.max(0, Number(e.target.value)))}
                      className="w-36 px-2.5 py-1 text-xl font-black text-slate-900 border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-cyan-500 text-right"
                    />
                  </div>
                ) : (
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {formatPHP(selectedProp.totalUSD)}
                  </div>
                )}
                <div className="text-[11px] text-slate-500 font-mono mt-0.5 font-medium">
                  Subtotal: {formatPHP(selectedProp.subtotalUSD)}
                </div>
              </div>
              
              <div className="flex flex-col gap-1.5">
                {isEditingPricing ? (
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={handleSavePricing}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs flex items-center space-x-1 transition-colors cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save PHP</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingPricing(false)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={startEditPricing}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-xs flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Edit Pricing (PHP)</span>
                  </button>
                )}

                {selectedProp.status === 'DRAFT' && !isEditingPricing && (
                  <button
                    onClick={handleApprove}
                    className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    Approve Draft
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Client Executive Summary
            </div>
            <p className="text-sm text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-200 leading-relaxed font-medium">
              {selectedProp.clientExecutiveSummary}
            </p>
          </div>

          {selectedProp.isAiDraft && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Why They Need It
                </div>
                <p className="text-sm text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-200 leading-relaxed h-full font-medium">
                  {selectedProp.whyItNeedsIt}
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Design Direction
                </div>
                <p className="text-sm text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-200 leading-relaxed h-full font-medium">
                  {selectedProp.recommendedDesignDirection}
                </p>
              </div>
            </div>
          )}

          {/* Proposal Deliverables Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Project Deliverables & Milestones ({selectedProp.items.length})
              </div>
              {isEditingPricing && (
                <span className="text-[11px] font-semibold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-200">
                  Editing milestone prices in PHP
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedProp.items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs shadow-xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-900 text-sm">{item.title}</span>
                    {isEditingPricing ? (
                      <div className="flex items-center space-x-1">
                        <span className="text-slate-600 font-bold">₱</span>
                        <input
                          type="number"
                          value={customItemPrices[item.id] !== undefined ? customItemPrices[item.id] : item.fixedPriceUSD}
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value));
                            setCustomItemPrices(prev => ({ ...prev, [item.id]: val }));
                          }}
                          className="w-24 px-2 py-0.5 text-xs font-mono font-bold text-slate-900 border border-slate-300 rounded bg-white text-right focus:outline-hidden focus:border-cyan-500"
                        />
                      </div>
                    ) : (
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {formatPHP(item.fixedPriceUSD)}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">{item.description}</p>
                  <div className="pt-2 space-y-1">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Deliverables:</div>
                    <div className="flex flex-wrap gap-1">
                      {item.deliverables.map((deliv, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 text-[10px] font-semibold"
                        >
                          ✓ {deliv}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {selectedProp.isAiDraft && selectedProp.suggestedFeatures && (
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Suggested Features
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedProp.suggestedFeatures.map((feature, idx) => (
                  <span key={idx} className="px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-xs font-medium">
                    {feature}
                  </span>
                ))}
              </div>
              {selectedProp.estimatedProjectScope && (
                <div className="text-xs text-slate-500 italic pt-2">
                  Estimated Scope: {selectedProp.estimatedProjectScope}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs text-slate-500 font-mono">
            <span>Valid Until: {new Date(selectedProp.validUntil).toLocaleDateString()}</span>
            <span>paymentProcessingActive: false (Lock)</span>
          </div>
        </div>
      )}

      {!selectedProp && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 space-y-3">
          <FileText className="w-12 h-12 mx-auto text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-800">No Proposals Drafted Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Create one with the New Proposal button above, or generate an AI draft from a qualified lead.
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Proposal</span>
          </button>
        </div>
      )}
        </div>
      </div>

      {/* New Proposal creation modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="new-proposal-title">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div>
              <h3 id="new-proposal-title" className="text-sm font-bold text-slate-900">New Proposal</h3>
              <p className="text-xs text-slate-500 mt-1">Pick a business, then generate an AI draft or start from a blank proposal.</p>
            </div>

            <div>
              <label htmlFor="np-business" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Business
              </label>
              <select
                id="np-business"
                value={createBusinessId}
                onChange={(e) => setCreateBusinessId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">Select a business…</option>
                {qualifiedBusinesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.crm.verifiedBusinessName || b.external.tradeName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="np-title" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Title <span className="text-slate-400 font-medium normal-case">(optional)</span>
              </label>
              <input
                id="np-title"
                type="text"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="e.g. Website Redesign for Acme Corp"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label htmlFor="np-amount" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Starting Amount (PHP) <span className="text-slate-400 font-medium normal-case">— blank proposals only</span>
              </label>
              <input
                id="np-amount"
                type="number"
                min={0}
                value={createAmount}
                onChange={(e) => setCreateAmount(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {createError && (
              <p className="text-xs text-rose-600 font-medium" role="alert">{createError}</p>
            )}

            <div className="flex items-center justify-end space-x-2 pt-1">
              <button
                onClick={() => { setIsCreateOpen(false); setCreateError(null); }}
                disabled={isCreating}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCreateProposal('blank')}
                disabled={isCreating || !createBusinessId}
                className="px-4 py-2 rounded-lg border border-slate-900 text-slate-900 text-xs font-bold hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Creating…' : 'Blank Proposal'}
              </button>
              <button
                onClick={() => handleCreateProposal('ai')}
                disabled={isCreating || !createBusinessId}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Generating…' : 'Generate AI Draft'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
