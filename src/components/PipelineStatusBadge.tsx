import React from 'react';
import { LeadPipelineStatus } from '../types';
import { getPipelineStageConfig, MAIN_WORKFLOW_STAGES } from '../config/pipeline';
import { ChevronDown } from 'lucide-react';

interface PipelineStatusBadgeProps {
  status: string | LeadPipelineStatus;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onStatusChange?: (newStatus: LeadPipelineStatus) => void;
  className?: string;
  showCategory?: boolean;
}

const SELECTABLE_STATUSES: LeadPipelineStatus[] = [...MAIN_WORKFLOW_STAGES, 'Lost'];

export const PipelineStatusBadge: React.FC<PipelineStatusBadgeProps> = ({
  status,
  size = 'md',
  interactive = false,
  onStatusChange,
  className = '',
  showCategory = false,
}) => {
  const config = getPipelineStageConfig(status);
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 space-x-1.5',
    md: 'text-xs px-2.5 py-1 space-x-2',
    lg: 'text-sm px-3 py-1.5 space-x-2.5',
  }[size];

  const dotSize = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  }[size];

  if (interactive && onStatusChange) {
    return (
      <div className={`relative inline-block ${className}`} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`inline-flex items-center rounded-md border font-medium cursor-pointer transition-all hover:brightness-110 ${config.badgeBg} ${config.badgeText} ${config.badgeBorder} ${sizeClasses}`}
        >
          <span className={`rounded-full ${config.dotColor} ${dotSize}`} />
          <span className="font-semibold">{config.label}</span>
          <ChevronDown className="w-3 h-3 opacity-70 ml-0.5" />
        </button>

        {isOpen && (
          <div className="absolute left-0 mt-1.5 w-56 rounded-xl bg-white border border-slate-200 shadow-2xl py-1.5 z-50 text-xs">
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-100">
              Update Pipeline Status
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {SELECTABLE_STATUSES.map((st) => {
                const stageConf = getPipelineStageConfig(st);
                const isSelected = stageConf.id === config.id;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      onStatusChange(st);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 flex items-center space-x-2 hover:bg-slate-100 transition-colors cursor-pointer ${
                      isSelected ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-700 font-medium'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${stageConf.dotColor}`} />
                    <div className="flex-1 truncate">
                      <span>{stageConf.label}</span>
                      {showCategory && (
                        <span className="ml-1.5 text-[10px] text-slate-500 uppercase">
                          ({stageConf.category.toLowerCase()})
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-md border font-medium ${config.badgeBg} ${config.badgeText} ${config.badgeBorder} ${sizeClasses} ${className}`}
    >
      <span className={`rounded-full ${config.dotColor} ${dotSize}`} />
      <span>{config.label}</span>
    </span>
  );
};
