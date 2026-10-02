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
} from 'lucide-react';
import { proposalService, businessService } from '../services';
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
  const [customTotalPHP, setCustomTotalPHP] = useState<number>(selectedProp?.totalUSD || 45000);
  const [customItemPrices, setCustomItemPrices] = useState<Record<string, number>>({});

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
            Proposals are drafted directly from qualified leads in the Leads Workspace after reviewing audit findings and business needs.
          </p>
        </div>
      )}
    </div>
  );
};
