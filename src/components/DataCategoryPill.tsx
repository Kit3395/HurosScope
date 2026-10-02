import React from 'react';
import { DataSafetyCategory } from '../types';
import { Globe, Sparkles, UserCheck, Cpu, Settings, History } from 'lucide-react';

interface DataCategoryPillProps {
  category: DataSafetyCategory;
  compact?: boolean;
}

const CATEGORY_CONFIG: Record<
  DataSafetyCategory,
  { label: string; bg: string; text: string; border: string; icon: React.FC<{ className?: string }> }
> = {
  EXTERNAL_SOURCE: {
    label: '1. External Source',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    icon: Globe,
  },
  AI_ANALYSIS: {
    label: '2. AI Analysis',
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
    icon: Sparkles,
  },
  USER_CRM: {
    label: '3. User CRM',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    icon: UserCheck,
  },
  APP_GENERATED: {
    label: '4. App Generated',
    bg: 'bg-cyan-50',
    text: 'text-cyan-800',
    border: 'border-cyan-200',
    icon: Cpu,
  },
  SYSTEM_CONFIG: {
    label: '5. System Config',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    icon: Settings,
  },
  AUDIT_HISTORY: {
    label: '6. Audit History',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    icon: History,
  },
};

export const DataCategoryPill: React.FC<DataCategoryPillProps> = ({ category, compact = false }) => {
  const conf = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.SYSTEM_CONFIG;
  const Icon = conf.icon;

  return (
    <span
      className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border ${conf.bg} ${conf.text} ${conf.border}`}
      title={`Architectural Data Category: ${conf.label}`}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span>{compact ? conf.label.split('. ')[1] : conf.label}</span>
    </span>
  );
};
