import React from 'react';
import { 
  Compass, 
  ShieldCheck, 
  FileSearch, 
  Target, 
  Sparkles, 
  Send, 
  CalendarClock, 
  Award,
  ChevronRight
} from 'lucide-react';
import { LeadPipelineStatus } from '../types';

interface PipelineLifecycleBannerProps {
  currentStage?: LeadPipelineStatus | string;
  onSelectStage?: (stage: LeadPipelineStatus) => void;
  interactive?: boolean;
  className?: string;
}

export interface LifecycleStep {
  id: LeadPipelineStatus;
  stepNumber: number;
  label: string;
  tagline: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  activeBg: string;
  activeText: string;
  activeBorder: string;
  badge: string;
}

export const ACQUISITION_LIFECYCLE_STEPS: LifecycleStep[] = [
  {
    id: 'Discover',
    stepNumber: 1,
    label: 'Discover',
    tagline: 'Google Places search & deduping',
    icon: Compass,
    color: 'text-sky-500',
    activeBg: 'bg-sky-50',
    activeText: 'text-sky-700',
    activeBorder: 'border-sky-300',
    badge: '1. Discover',
  },
  {
    id: 'Researching' as LeadPipelineStatus,
    stepNumber: 2,
    label: 'Verify',
    tagline: 'Segregate external data & review',
    icon: ShieldCheck,
    color: 'text-emerald-500',
    activeBg: 'bg-emerald-50',
    activeText: 'text-emerald-700',
    activeBorder: 'border-emerald-300',
    badge: '2. Verify',
  },
  {
    id: 'Qualify',
    stepNumber: 3,
    label: 'Analyze',
    tagline: 'Technical web & social UX audit',
    icon: FileSearch,
    color: 'text-indigo-500',
    activeBg: 'bg-indigo-50',
    activeText: 'text-indigo-700',
    activeBorder: 'border-indigo-300',
    badge: '3. Analyze',
  },
  {
    id: 'Qualified' as LeadPipelineStatus,
    stepNumber: 4,
    label: 'Qualify',
    tagline: 'Score deficiencies & potential',
    icon: Target,
    color: 'text-cyan-500',
    activeBg: 'bg-cyan-50',
    activeText: 'text-cyan-700',
    activeBorder: 'border-cyan-300',
    badge: '4. Qualify',
  },
  {
    id: 'Proposal',
    stepNumber: 5,
    label: 'Recommend',
    tagline: 'Palette, services & value pitch',
    icon: Sparkles,
    color: 'text-amber-500',
    activeBg: 'bg-amber-50',
    activeText: 'text-amber-700',
    activeBorder: 'border-amber-300',
    badge: '5. Recommend',
  },
  {
    id: 'Contact',
    stepNumber: 6,
    label: 'Contact',
    tagline: 'Personalized manual outreach',
    icon: Send,
    color: 'text-orange-500',
    activeBg: 'bg-orange-50',
    activeText: 'text-orange-700',
    activeBorder: 'border-orange-300',
    badge: '6. Contact',
  },
  {
    id: 'Follow-up',
    stepNumber: 7,
    label: 'Follow Up',
    tagline: 'Scheduled touchpoints & calls',
    icon: CalendarClock,
    color: 'text-purple-500',
    activeBg: 'bg-purple-50',
    activeText: 'text-purple-700',
    activeBorder: 'border-purple-300',
    badge: '7. Follow Up',
  },
  {
    id: 'Client',
    stepNumber: 8,
    label: 'Convert',
    tagline: 'Deal closed & kickoff started',
    icon: Award,
    color: 'text-teal-500',
    activeBg: 'bg-teal-50',
    activeText: 'text-teal-700',
    activeBorder: 'border-teal-300',
    badge: '8. Convert',
  },
];

export const PipelineLifecycleBanner: React.FC<PipelineLifecycleBannerProps> = ({
  currentStage,
  onSelectStage,
  interactive = true,
  className = '',
}) => {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-3 shadow-xs ${className}`}>
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500">
            Governing Acquisition Engine:
          </span>
          <span className="text-xs font-semibold text-slate-800 hidden sm:inline">
            Discover → Verify → Analyze → Qualify → Recommend → Contact → Follow Up → Convert
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 font-medium">
          Not: Scrape → Dump → Pray
        </span>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {ACQUISITION_LIFECYCLE_STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isCurrent = currentStage && (
            currentStage === step.id || 
            (step.label === 'Verify' && currentStage === 'Researching') ||
            (step.label === 'Qualify' && currentStage === 'Qualified') ||
            (step.label === 'Recommend' && (currentStage === 'Proposal' || currentStage === 'Proposal Sent')) ||
            (step.label === 'Convert' && (currentStage === 'Client' || currentStage === 'Won'))
          );

          return (
            <React.Fragment key={step.stepNumber}>
              <button
                type="button"
                disabled={!interactive}
                onClick={() => onSelectStage && onSelectStage(step.id)}
                className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-lg border text-left transition-all ${
                  interactive ? 'cursor-pointer hover:brightness-105' : 'cursor-default'
                } ${
                  isCurrent
                    ? `${step.activeBg} ${step.activeText} ${step.activeBorder} ring-1 ring-offset-1 ring-offset-white shadow-xs font-bold`
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className={`p-1 rounded-md ${isCurrent ? 'bg-white/80 shadow-xs' : 'bg-slate-200/60'}`}>
                  <Icon className={`w-3.5 h-3.5 ${step.color}`} />
                </div>
                <div className="whitespace-nowrap">
                  <div className="text-[11px] font-semibold leading-none flex items-center gap-1">
                    <span>{step.stepNumber}.</span>
                    <span>{step.label}</span>
                  </div>
                  <div className="text-[9px] opacity-70 leading-tight hidden md:block max-w-[120px] truncate">
                    {step.tagline}
                  </div>
                </div>
              </button>

              {idx < ACQUISITION_LIFECYCLE_STEPS.length - 1 && (
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
