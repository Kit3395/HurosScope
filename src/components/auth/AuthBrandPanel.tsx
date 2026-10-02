import React from 'react';
import { AuthLogo } from './AuthLogo';
import { Compass, BarChart3, Users } from 'lucide-react';

export const AuthBrandPanel: React.FC = () => {
  return (
    <div className="flex flex-col justify-between h-full p-8 sm:p-10 lg:p-12 text-slate-900">
      {/* Top Brand Block */}
      <div className="space-y-8">
        {/* Prominent Logo */}
        <div>
          <AuthLogo size="xl" showWordmark={true} theme="light" />
        </div>

        {/* Tagline Pill */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full border border-amber-300/80 bg-amber-50 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[#B48C36] animate-pulse" />
          <span className="text-xs font-semibold tracking-[0.2em] text-[#926C15] uppercase font-mono">
            FIND • ANALYZE • CONNECT • GROW
          </span>
        </div>

        {/* Statement & Supporting Content */}
        <div className="space-y-3.5 max-w-md pt-1">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight font-sans">
            SEE THE OPPORTUNITY.
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Discover businesses, analyze digital presence, identify opportunities, and organize potential clients in one focused workspace.
          </p>
        </div>

        {/* Core Capabilities - High Contrast Scannable Blocks */}
        <div className="space-y-3 pt-2 max-w-md">
          <div className="flex items-start space-x-3.5 p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-xs">
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-200/80 text-[#B48C36] shrink-0 mt-0.5">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 block text-sm">Precision Market Discovery</span>
              <span className="text-slate-500 text-xs leading-relaxed">Verified business records and spatial data intelligence.</span>
            </div>
          </div>

          <div className="flex items-start space-x-3.5 p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-xs">
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-200/80 text-[#B48C36] shrink-0 mt-0.5">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 block text-sm">Digital Footprint Diagnostics</span>
              <span className="text-slate-500 text-xs leading-relaxed">Audit website readiness, review trends, and reach gaps.</span>
            </div>
          </div>

          <div className="flex items-start space-x-3.5 p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-xs">
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-200/80 text-[#B48C36] shrink-0 mt-0.5">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 block text-sm">Client Conversion Pipeline</span>
              <span className="text-slate-500 text-xs leading-relaxed">Track prospect stages with CRM intelligence and proposals.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Supporting Line at Bottom of Brand Area */}
      <div className="pt-8 sm:pt-10 border-t border-slate-200">
        <div className="flex items-center space-x-2 text-xs font-mono tracking-wider text-slate-600 uppercase">
          <span className="w-2 h-2 rounded-full bg-[#B48C36]" />
          <span>Enterprise Intelligence Workspace</span>
        </div>
      </div>
    </div>
  );
};
