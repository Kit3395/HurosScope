import { LeadPipelineStatus, ALL_PIPELINE_STATUSES, MAIN_WORKFLOW_STAGES, MainWorkflowStage } from '../types';

export { ALL_PIPELINE_STATUSES, MAIN_WORKFLOW_STAGES };
export type { MainWorkflowStage };

export interface PipelineStageConfig {
  id: LeadPipelineStatus;
  label: string;
  order: number;
  category: 'PROSPECTING' | 'ENGAGEMENT' | 'OPPORTUNITY' | 'OUTCOME';
  description: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
}

export const PIPELINE_STAGES: Record<LeadPipelineStatus, PipelineStageConfig> = {
  // --- Phase 4 Canonical 6-Stage Workflow ---
  Discover: {
    id: 'Discover',
    label: 'Discover',
    order: 1,
    category: 'PROSPECTING',
    description: 'Fresh prospects identified via Google Places or manual search awaiting initial vetting.',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-700',
    badgeBorder: 'border-sky-200',
    dotColor: 'bg-sky-500',
  },
  Qualify: {
    id: 'Qualify',
    label: 'Qualify',
    order: 2,
    category: 'PROSPECTING',
    description: 'Prospect evaluated for web design deficiencies, high rating, and revenue opportunity.',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    badgeBorder: 'border-indigo-200',
    dotColor: 'bg-indigo-500',
  },
  Contact: {
    id: 'Contact',
    label: 'Contact',
    order: 3,
    category: 'ENGAGEMENT',
    description: 'First personalized outreach or value audit dispatched directly to business owner.',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-200',
    dotColor: 'bg-amber-500',
  },
  'Follow-up': {
    id: 'Follow-up',
    label: 'Follow-up',
    order: 4,
    category: 'ENGAGEMENT',
    description: 'Active touchpoint or scheduled check-in underway after initial presentation.',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-200',
    dotColor: 'bg-purple-500',
  },
  Proposal: {
    id: 'Proposal',
    label: 'Proposal',
    order: 5,
    category: 'OPPORTUNITY',
    description: 'Customized web design or marketing proposal formally presented for review.',
    badgeBg: 'bg-orange-50',
    badgeText: 'text-orange-700',
    badgeBorder: 'border-orange-200',
    dotColor: 'bg-orange-500',
  },
  Client: {
    id: 'Client',
    label: 'Client',
    order: 6,
    category: 'OUTCOME',
    description: 'Deal won! Client onboarded and project kickoff initialized.',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    dotColor: 'bg-emerald-500',
  },
  Lost: {
    id: 'Lost',
    label: 'Lost',
    order: 7,
    category: 'OUTCOME',
    description: 'Opportunity passed, competitor chosen, or deferred budget.',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    badgeBorder: 'border-slate-300',
    dotColor: 'bg-slate-500',
  },

  // --- Aliases for Legacy Compatibility ---
  New: {
    id: 'New',
    label: 'Discover',
    order: 1,
    category: 'PROSPECTING',
    description: 'Fresh business record identified, awaiting initial inspection.',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-700',
    badgeBorder: 'border-sky-200',
    dotColor: 'bg-sky-500',
  },
  Researching: {
    id: 'Researching',
    label: 'Discover',
    order: 1,
    category: 'PROSPECTING',
    description: 'Conducting website analysis, digital footprint check, and technical audit.',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-700',
    badgeBorder: 'border-sky-200',
    dotColor: 'bg-sky-500',
  },
  Qualified: {
    id: 'Qualified',
    label: 'Qualify',
    order: 2,
    category: 'PROSPECTING',
    description: 'Meets ideal client profile with clear digital design deficiencies.',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    badgeBorder: 'border-indigo-200',
    dotColor: 'bg-indigo-500',
  },
  Contacted: {
    id: 'Contacted',
    label: 'Contact',
    order: 3,
    category: 'ENGAGEMENT',
    description: 'First personalized outreach or value audit dispatched manually.',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-200',
    dotColor: 'bg-amber-500',
  },
  Responded: {
    id: 'Responded',
    label: 'Contact',
    order: 3,
    category: 'ENGAGEMENT',
    description: 'Prospect has replied with interest, questions, or dialogue opening.',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-200',
    dotColor: 'bg-amber-500',
  },
  Meeting: {
    id: 'Meeting',
    label: 'Follow-up',
    order: 4,
    category: 'ENGAGEMENT',
    description: 'Discovery call or strategy presentation scheduled or completed.',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-200',
    dotColor: 'bg-purple-500',
  },
  'Proposal Sent': {
    id: 'Proposal Sent',
    label: 'Proposal',
    order: 5,
    category: 'OPPORTUNITY',
    description: 'Customized web design or marketing proposal formally presented.',
    badgeBg: 'bg-orange-50',
    badgeText: 'text-orange-700',
    badgeBorder: 'border-orange-200',
    dotColor: 'bg-orange-500',
  },
  Negotiation: {
    id: 'Negotiation',
    label: 'Proposal',
    order: 5,
    category: 'OPPORTUNITY',
    description: 'Reviewing scope adjustments, pricing deliverables, and contract terms.',
    badgeBg: 'bg-orange-50',
    badgeText: 'text-orange-700',
    badgeBorder: 'border-orange-200',
    dotColor: 'bg-orange-500',
  },
  Won: {
    id: 'Won',
    label: 'Client',
    order: 6,
    category: 'OUTCOME',
    description: 'Proposal accepted and client kickoff initiated.',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    dotColor: 'bg-emerald-500',
  },
  'Not Interested': {
    id: 'Not Interested',
    label: 'Lost',
    order: 7,
    category: 'OUTCOME',
    description: 'Prospect explicitly declined or does not need web services.',
    badgeBg: 'bg-slate-500/10',
    badgeText: 'text-slate-400',
    badgeBorder: 'border-slate-500/30',
    dotColor: 'bg-slate-400',
  },
};

/**
 * Normalizes any legacy status or string to a canonical MainWorkflowStage
 */
export function normalizePipelineStatus(raw?: string | null): LeadPipelineStatus {
  if (!raw) return 'Discover';

  const clean = raw.trim();

  // Canonical matches
  if (clean === 'Discover' || clean === 'Qualify' || clean === 'Contact' || clean === 'Follow-up' || clean === 'Proposal' || clean === 'Client' || clean === 'Lost') {
    return clean as LeadPipelineStatus;
  }

  const upper = clean.toUpperCase();
  if (upper.includes('DISCOVER') || upper === 'NEW' || upper.includes('IDENTIFIED') || upper.includes('RESEARCH')) {
    return 'Discover';
  }
  if (upper.includes('QUALIF') || upper.includes('AUDIT') || upper === 'PITCH_READY') {
    return 'Qualify';
  }
  if (upper.includes('OUTREACH') || upper.includes('CONTACT') || upper.includes('RESPOND')) {
    return 'Contact';
  }
  if (upper.includes('FOLLOW') || upper.includes('MEETING')) {
    return 'Follow-up';
  }
  if (upper.includes('PROPOSAL') || upper.includes('NEGOTIAT')) {
    return 'Proposal';
  }
  if (upper.includes('CLIENT') || upper.includes('WON') || upper.includes('CONVERT')) {
    return 'Client';
  }
  if (upper.includes('LOST') || upper.includes('NOT_INTERESTED') || upper.includes('DECLINE')) {
    return 'Lost';
  }

  if (ALL_PIPELINE_STATUSES.includes(clean as LeadPipelineStatus)) {
    return clean as LeadPipelineStatus;
  }

  return 'Discover';
}

export function getPipelineStageConfig(status?: string | null): PipelineStageConfig {
  const canonical = normalizePipelineStatus(status);
  return PIPELINE_STAGES[canonical] || PIPELINE_STAGES.Discover;
}

