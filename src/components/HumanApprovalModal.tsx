import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  X,
  Lock,
  UserCheck,
} from 'lucide-react';
import { humanApprovalGate } from '../security/approvalGate';
import { HumanApprovalRequest } from '../types';

export const HumanApprovalModal: React.FC = () => {
  const [request, setRequest] = useState<HumanApprovalRequest | null>(null);
  const [phraseInput, setPhraseInput] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return humanApprovalGate.subscribe((req) => {
      setRequest(req);
      setPhraseInput('');
      setAcknowledged(false);
      setError(null);
    });
  }, []);

  if (!request) return null;

  const isCritical = request.dangerLevel === 'CRITICAL';
  const requiresPhrase = Boolean(request.requiredConfirmationPhrase);
  const phraseMatches =
    !requiresPhrase ||
    phraseInput.trim().toUpperCase() === request.requiredConfirmationPhrase?.toUpperCase();

  const canApprove = (requiresPhrase ? phraseMatches : acknowledged);

  const handleApprove = () => {
    try {
      humanApprovalGate.grantApproval(phraseInput);
    } catch (err: any) {
      setError(err.message || 'Approval authorization failed');
    }
  };

  const handleDecline = () => {
    humanApprovalGate.rejectApproval('Declined by user in confirmation modal');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="approval-modal-title"
        className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div
          className={`p-5 flex items-start justify-between border-b ${
            isCritical
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : request.dangerLevel === 'WARNING'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-sky-50 border-sky-200 text-sky-700'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div
              className={`p-2.5 rounded-xl ${
                isCritical
                  ? 'bg-rose-100 text-rose-700'
                  : request.dangerLevel === 'WARNING'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-sky-100 text-sky-700'
              }`}
            >
              {isCritical ? (
                <ShieldAlert className="w-6 h-6" />
              ) : request.dangerLevel === 'WARNING' ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <Info className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 id="approval-modal-title" className="text-base font-bold text-slate-900">
                  {request.title}
                </h3>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                    isCritical
                      ? 'bg-rose-600 text-white'
                      : request.dangerLevel === 'WARNING'
                      ? 'bg-amber-600 text-white'
                      : 'bg-sky-600 text-white'
                  }`}
                >
                  {request.dangerLevel} GATE
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Explicit Human Approval Required Before Execution
              </p>
            </div>
          </div>

          <button
            onClick={handleDecline}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Operational Scope & Target
            </div>
            <div className="text-sm font-semibold text-slate-800">
              {request.targetSummary}
            </div>
            <p className="text-slate-600 text-xs leading-relaxed">
              {request.description}
            </p>
          </div>

          {/* Actor & Authorization Metadata */}
          <div className="flex items-center justify-between text-[11px] p-2.5 rounded-lg bg-slate-100 text-slate-600">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-emerald-500" />
              <span>
                Authorized by: <strong className="text-slate-900">{request.requestedBy.displayName}</strong>
              </span>
            </div>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-bold">
              ROLE: {request.requestedBy.role}
            </span>
          </div>

          {/* Confirmation Mechanism */}
          {requiresPhrase ? (
            <div className="space-y-2 pt-1">
              <label className="block text-slate-700 font-medium">
                To confirm this sensitive action, please type{' '}
                <span className="font-mono font-bold text-rose-600 bg-rose-500/10 px-1.5 py-0.5 rounded">
                  {request.requiredConfirmationPhrase}
                </span>{' '}
                below:
              </label>
              <input
                type="text"
                value={phraseInput}
                onChange={(e) => setPhraseInput(e.target.value)}
                placeholder={`Type "${request.requiredConfirmationPhrase}" to unlock`}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                autoFocus
              />
            </div>
          ) : (
            <label className="flex items-start space-x-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
              />
              <span className="text-slate-700 leading-snug">
                I acknowledge the commercial impact of this action and explicitly authorize the system to proceed.
              </span>
            </label>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={handleDecline}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Cancel Action
          </button>

          <button
            type="button"
            onClick={handleApprove}
            disabled={!canApprove}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-2 ${
              canApprove
                ? isCritical
                  ? 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer'
                  : 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer'
                : 'bg-slate-300 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Confirm & Execute</span>
          </button>
        </div>
      </div>
    </div>
  );
};
