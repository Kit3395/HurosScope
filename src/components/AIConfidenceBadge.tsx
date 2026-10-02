import React from 'react';
import { AIConfidenceLevel } from '../types';
import { CheckCircle2, AlertCircle, HelpCircle, ShieldAlert } from 'lucide-react';

interface AIConfidenceBadgeProps {
  confidence?: AIConfidenceLevel | string;
  showIcon?: boolean;
  className?: string;
}

export const AIConfidenceBadge: React.FC<AIConfidenceBadgeProps> = ({
  confidence = 'UNVERIFIED',
  showIcon = true,
  className = '',
}) => {
  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-300'
  let Icon = HelpCircle;
  let label = confidence;

  if (confidence === 'HIGH CONFIDENCE') {
    badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300'
    Icon = CheckCircle2;
  } else if (confidence === 'MEDIUM CONFIDENCE') {
    badgeStyle = 'bg-amber-50 text-amber-800 border-amber-300'
    Icon = AlertCircle;
  } else if (confidence === 'LOW CONFIDENCE') {
    badgeStyle = 'bg-orange-50 text-orange-800 border-orange-300'
    Icon = AlertCircle;
  } else if (confidence === 'UNVERIFIED' || confidence === 'Not verified') {
    badgeStyle = 'bg-rose-50 text-rose-800 border-rose-300'
    Icon = ShieldAlert;
    label = 'Not verified';
  }

  return (
    <span
      className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wider border uppercase ${badgeStyle} ${className}`}
      title="AI-generated analytical assessment confidence"
    >
      {showIcon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
      <span>{label}</span>
    </span>
  );
};
