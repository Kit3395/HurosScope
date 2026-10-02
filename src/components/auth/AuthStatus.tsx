import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

interface AuthStatusProps {
  type?: 'error' | 'success' | 'info';
  message: string | null;
  className?: string;
  onDismiss?: () => void;
}

export const AuthStatus: React.FC<AuthStatusProps> = ({
  type = 'error',
  message,
  className = '',
  onDismiss,
}) => {
  if (!message) return null;

  const isError = type === 'error';
  const isSuccess = type === 'success';

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-start space-x-2.5 ${
        isError
          ? 'bg-rose-50 border-rose-200 text-rose-800'
          : isSuccess
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
          : 'bg-amber-50 border-amber-200 text-amber-900'
      } ${className}`}
    >
      {isError ? (
        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
      ) : isSuccess ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
      ) : (
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
      )}

      <span className="font-medium text-xs flex-1">{message}</span>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notice"
          className="shrink-0 -mr-1 -mt-0.5 p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};
