import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw, ShieldCheck } from 'lucide-react';
import { auditService } from '../audit';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught error:', error, errorInfo);

    try {
      auditService.log({
        actorId: 'system_error_boundary',
        actorType: 'SAFETY_GUARD',
        action: 'SAFETY_CHECK_TRIGGERED',
        entityType: 'SecurityGate',
        entityId: 'react_runtime_boundary',
        changeSummary: `React component caught runtime exception: ${error.message}`,
        newValue: {
          errorName: error.name,
          errorMessage: error.message,
          stackSnippet: error.stack?.slice(0, 300),
        },
        severity: 'CRITICAL',
      });
    } catch {
      // Ignore logging failures in error boundary
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleDismiss = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] w-full flex items-center justify-center p-6 bg-slate-50 rounded-2xl border border-rose-500/20">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 mx-auto flex items-center justify-center">
              <AlertOctagon className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {this.props.fallbackTitle || 'Safe-Mode Intercepted Error'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                The application error boundary contained this unexpected exception to prevent data loss.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-left">
                <div className="text-[11px] font-mono text-rose-600 font-semibold truncate">
                  {this.state.error.name}: {this.state.error.message}
                </div>
              </div>
            )}

            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                onClick={this.handleDismiss}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
              >
                Attempt Recovery
              </button>

              <button
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reload View</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
