import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface AuthStatusProps {
  type?: 'error' | 'success' | 'info';
  message: string | null;
  className?: string;
}

export const AuthStatus: React.FC<AuthStatusProps> = ({
  type = 'error',
  message,
  className = '',
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
          : 'bg-slate-50 border-slate-200 text-slate-800'
      } ${className}`}
    >
      {isError ? (
        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
      ) : isSuccess ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
      ) : null}

      <span className="font-medium text-xs">{message}</span>
    </div>
  );
};
