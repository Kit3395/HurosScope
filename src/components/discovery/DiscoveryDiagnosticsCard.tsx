/**
 * HorusScope - Phase 3: Discovery Diagnostics & Test Suite
 * Provides verification harness for:
 * 1. Test query for a small location ("Cebu City")
 * 2. Verification of duplicate detection logic
 * 3. Resiliency testing for invalid API configuration (403/429 simulation)
 * 4. Google Maps Platform Places API (New) status monitoring
 */

import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertOctagon,
  CheckCircle2,
  Gauge,
  Key,
  Layers,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { DiscoveryApiStatus } from '../../types';
import { discoveryService } from '../../services';

interface Props {
  onRunTestQuery: (location: string, category: string, keyword?: string) => void;
  onSimulateError: (type: 'INVALID_KEY' | 'RATE_LIMIT' | 'QUOTA_EXCEEDED') => void;
  isSearching: boolean;
}

export const DiscoveryDiagnosticsCard: React.FC<Props> = ({
  onRunTestQuery,
  onSimulateError,
  isSearching,
}) => {
  const [apiStatus, setApiStatus] = useState<DiscoveryApiStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchStatus = async () => {
    setLoadingStatus(true);
    try {
      const status = await discoveryService.getApiStatus();
      setApiStatus(status);
    } catch {
      // Ignored
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div
      id="discovery-diagnostics-card"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Gauge className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">API Safety & Diagnostics</h3>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                Active Proxy
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Google Places API (New) • Field-Mask Enforced • Rate-Limited Server Proxy
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchStatus}
            disabled={loadingStatus}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
            Refresh Status
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50"
          >
            {isOpen ? 'Hide Test Suite' : 'Open Test Suite'}
          </button>
        </div>
      </div>

      {/* Quota and Rate Limit Quick Stats Bar */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 border-t border-slate-100 pt-3 text-xs">
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
          <span className="text-[10px] uppercase font-semibold text-slate-400">Google API Key</span>
          <div className="mt-0.5 flex items-center gap-1.5 font-semibold text-slate-800">
            {apiStatus?.hasApiKey ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700">Configured</span>
              </>
            ) : (
              <>
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-amber-700">Sandbox Ready</span>
              </>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
          <span className="text-[10px] uppercase font-semibold text-slate-400">Rate Limit Window</span>
          <div className="mt-0.5 font-semibold text-slate-800">
            {apiStatus ? `${apiStatus.remainingThisMinute} / 30 req left` : '30 req/min'}
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
          <span className="text-[10px] uppercase font-semibold text-slate-400">Session Searches</span>
          <div className="mt-0.5 font-semibold text-slate-800">
            {apiStatus?.sessionRequestsCount || 0} executed
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
          <span className="text-[10px] uppercase font-semibold text-slate-400">Field Mask</span>
          <div className="mt-0.5 flex items-center gap-1 font-semibold text-slate-700 truncate">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-600 shrink-0" />
            <span className="truncate">Strict Masking</span>
          </div>
        </div>
      </div>

      {/* Expandable Test Verification Suite */}
      {isOpen && (
        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
          <div className="flex items-center gap-2 mb-2 font-semibold text-xs text-blue-900">
            <Activity className="h-4 w-4 text-blue-600" />
            <span>Requirement Verification Actions</span>
          </div>
          <p className="text-[11px] text-slate-600 mb-3">
            Use these 1-click test actions to verify search execution, multi-signal duplicate detection, and API error resiliency.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isSearching}
              onClick={() => onRunTestQuery('Cebu City', 'Restaurants', '')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-2xs hover:bg-blue-50"
            >
              <MapPin className="h-3.5 w-3.5 text-blue-600" />
              Test Small Location: "Cebu City"
            </button>

            <button
              type="button"
              disabled={isSearching}
              onClick={() => onRunTestQuery('Philadelphia, PA', 'Dentists', 'Meridian')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-2xs hover:bg-amber-50"
            >
              <Layers className="h-3.5 w-3.5 text-amber-600" />
              Test Duplicate Detection: "Meridian Dental"
            </button>

            <button
              type="button"
              disabled={isSearching}
              onClick={() => onSimulateError('INVALID_KEY')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-2xs hover:bg-red-50"
            >
              <Key className="h-3.5 w-3.5 text-red-600" />
              Simulate Invalid API Key (403)
            </button>

            <button
              type="button"
              disabled={isSearching}
              onClick={() => onSimulateError('RATE_LIMIT')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
            >
              <AlertOctagon className="h-3.5 w-3.5 text-slate-600" />
              Simulate Rate Limit (429)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
