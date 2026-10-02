import {
  AIAnalysis,
  Business,
  Contact,
  ExternalSource,
  FollowUp,
  Lead,
  LeadScore,
  OutreachActivity,
  Proposal,
  SocialAudit,
  WebsiteAudit,
} from '../types';

/**
 * HORUSCOPE - Production Seed Generator
 * Initial state contains 0 filler/demo records for immediate deployment readiness.
 * Real records are ingested via Google Places API discovery and CRM prospect intake.
 */
export function generateInitialSeedData(): {
  businesses: Business[];
  leads: Lead[];
  contacts: Contact[];
  externalSources: ExternalSource[];
  webAudits: WebsiteAudit[];
  socialAudits: SocialAudit[];
  aiAnalyses: AIAnalysis[];
  leadScores: LeadScore[];
  proposals: Proposal[];
  followUps: FollowUp[];
  outreachActivities: OutreachActivity[];
} {
  return {
    businesses: [],
    leads: [],
    contacts: [],
    externalSources: [],
    webAudits: [],
    socialAudits: [],
    aiAnalyses: [],
    leadScores: [],
    proposals: [],
    followUps: [],
    outreachActivities: [],
  };
}
