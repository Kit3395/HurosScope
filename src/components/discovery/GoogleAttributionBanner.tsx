/**
 * HorusScope - Google Maps Platform Official Attribution & Compliance Banner
 * Ensures compliance with Google Maps Platform Terms of Service:
 * - Clear "Powered by Google" attribution
 * - Accurate attribution tracking (?utm_campaign=gmp_mcp_codeassist_v1_aistudio)
 * - Notice on data usage, no unauthorized scraping, and server-side credential isolation.
 */

import React from 'react';
import { ExternalLink, ShieldCheck, Info } from 'lucide-react';

interface Props {
  source?: 'OFFICIAL_GOOGLE_PLACES_API_NEW' | 'SANDBOX_DIAGNOSTIC';
  isSandbox?: boolean;
  className?: string;
}

export const GoogleAttributionBanner: React.FC<Props> = ({
  source = 'OFFICIAL_GOOGLE_PLACES_API_NEW',
  isSandbox = false,
  className = '',
}) => {
  return (
    <div
      id="google-attribution-banner"
      className={`rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-xs text-slate-600 backdrop-blur-sm ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* Official Google Badge style */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-medium shadow-xs">
            <span className="text-slate-500">Powered by</span>
            <span className="font-semibold text-slate-800">Google</span>
            <span className="text-[10px] font-semibold text-blue-600">Maps Platform</span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span className="font-medium text-slate-700">Places API (New)</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500">Secure Backend Proxy (Zero Frontend Key Exposure)</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isSandbox && (
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              <Info className="h-3 w-3" />
              Sandbox Diagnostic Mode (API Key Optional)
            </span>
          )}

          <a
            href="https://developers.google.com/maps/documentation/places/web-service/overview?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            Places API (New) Docs
            <ExternalLink className="h-3 w-3" />
          </a>

          <a
            href="https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 hover:underline"
          >
            Google Maps Platform ToS
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      <p className="mt-2.5 text-[11px] leading-relaxed text-slate-500">
        Compliant with Google Maps Platform policies. All business discovery requests utilize field-masking, rate limiting, and server-side request throttling. External Place IDs are preserved as immutable external anchors without mutating CRM records. Web scraping of Google Maps interfaces is strictly prohibited.
      </p>
    </div>
  );
};
