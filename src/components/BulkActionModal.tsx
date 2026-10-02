import React, { useState } from 'react';
import { AlertOctagon, X, CheckSquare } from 'lucide-react';

interface BulkActionModalProps {
  isOpen: boolean;
  actionTitle: string;
  affectedCount: number;
  entityName: string;
  requiredPhrase?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const BulkActionModal: React.FC<BulkActionModalProps> = ({
  isOpen,
  actionTitle,
  affectedCount,
  entityName,
  requiredPhrase = 'CONFIRM BULK',
  onConfirm,
  onCancel,
}) => {
  const [typedInput, setTypedInput] = useState('');

  if (!isOpen) return null;

  const isPhraseMatched = typedInput.trim() === requiredPhrase;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 text-amber-700">
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
              <AlertOctagon className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Bulk Action Safeguard</h3>
              <p className="text-xs text-amber-800 font-medium">Secondary Verification Required</p>
            </div>
          </div>
          <button
            onClick={() => {
              setTypedInput('');
              onCancel();
            }}
            className="text-slate-400 hover:text-slate-700 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-sm text-slate-700">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>Action:</span>
            <span className="font-bold text-amber-800 uppercase">{actionTitle}</span>
          </div>
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>Affected Entities:</span>
            <span className="font-bold text-slate-900">{affectedCount} {entityName}(s)</span>
          </div>
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>Audit Trail:</span>
            <span className="text-emerald-700 font-mono font-semibold">Individual log entry per item</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700">
            Type <span className="font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-bold select-all">{requiredPhrase}</span> below to authorize this bulk operation:
          </label>
          <input
            id="bulk-confirmation-input"
            type="text"
            value={typedInput}
            onChange={(e) => setTypedInput(e.target.value)}
            placeholder={`Type ${requiredPhrase}`}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-xl text-sm text-slate-900 font-mono placeholder:text-slate-400 outline-none transition-all"
            autoFocus
          />
        </div>

        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setTypedInput('');
              onCancel();
            }}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="execute-bulk-action-btn"
            type="button"
            disabled={!isPhraseMatched}
            onClick={() => {
              setTypedInput('');
              onConfirm();
            }}
            className={`inline-flex items-center space-x-2 px-5 py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
              isPhraseMatched
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Execute Bulk Action</span>
          </button>
        </div>
      </div>
    </div>
  );
};
