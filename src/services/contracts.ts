/**
 * Database and Service Layer Abstraction Interfaces (Contracts)
 * 
 * ARCHITECTURAL GOAL:
 * Decouples the UI layer and domain logic from the underlying storage mechanism.
 * The application currently operates against an in-memory repository with local storage backups,
 * but implementing these contracts ensures that future migration to Firestore, Supabase,
 * PostgreSQL, or Airtable requires zero UI modifications—only a new adapter implementation.
 *
 * GOVERNING ACQUISITION LIFECYCLE:
 * Discover → Verify → Analyze → Qualify → Recommend → Contact → Follow Up → Convert
 */

import {
  Business,
  Lead,
  Contact,
  WebsiteAudit,
  SocialAudit,
  AIAnalysis,
  LeadScore,
  Proposal,
  OutreachActivity,
  FollowUp,
  AuditLog,
  SystemSetting,
  LeadPipelineStatus,
} from '../types';

/**
 * Common CRUD & Query Operations for any entity
 */
export interface IEntityReader<T> {
  getAll(includeDeleted?: boolean): T[];
  getById(id: string): T | undefined;
}

export interface IEntityWriter<T> {
  create(entity: T): T;
  update(id: string, updates: Partial<T>): T;
  softDelete(id: string, operatorId?: string): boolean;
  restore(id: string): boolean;
}

export interface ICrudRepository<T> extends IEntityReader<T>, IEntityWriter<T> {}

/**
 * 1. Business Service Contract
 */
export interface IBusinessService {
  getAll(includeDeleted?: boolean): Business[];
  getById(id: string): Business | undefined;
  create(business: Business): Business;
  update(id: string, updates: Partial<Business>): Business;
  softDelete(id: string): boolean;
  restore(id: string): boolean;
  verifyCrmData(id: string, verifiedData: Partial<Business['crm']>): Business;
}

/**
 * 2. Lead & Acquisition Pipeline Service Contract
 */
export interface ILeadService {
  getAll(includeDeleted?: boolean): Lead[];
  getById(id: string): Lead | undefined;
  getByBusinessId(businessId: string): Lead | undefined;
  create(lead: Lead): Lead;
  update(id: string, updates: Partial<Lead>): Lead;
  updatePipelineStatus(id: string, newStatus: LeadPipelineStatus, reason?: string): Lead;
  bulkUpdateStatus(ids: string[], status: LeadPipelineStatus): number;
  bulkDelete(ids: string[]): number;
  merge(primaryId: string, secondaryId: string): Lead;
}

/**
 * 3. Intelligence & Audit Service Contract
 */
export interface IIntelligenceService {
  getWebsiteAudit(businessId: string): WebsiteAudit | undefined;
  getSocialAudit(businessId: string): SocialAudit | undefined;
  getAIAnalysis(businessId: string): AIAnalysis | undefined;
  getLeadScore(businessId: string): LeadScore | undefined;
  runWebsiteAudit(businessId: string, url: string): Promise<WebsiteAudit>;
  runSocialAudit(businessId: string): Promise<SocialAudit>;
  runAIAnalysis(businessId: string): Promise<AIAnalysis>;
}

/**
 * 4. Proposal Service Contract
 */
export interface IProposalService {
  getAll(includeDeleted?: boolean): Proposal[];
  getById(id: string): Proposal | undefined;
  getByBusinessId(businessId: string): Proposal[];
  create(proposal: Proposal): Proposal;
  update(id: string, updates: Partial<Proposal>): Proposal;
  finalize(id: string): Proposal;
}

/**
 * 5. Complete Database Repository Interface
 * This is the contract any database driver (In-Memory, Firestore, Supabase, Cloud SQL) must implement.
 */
export interface ICRMRepository {
  // Businesses
  getAllBusinesses(includeDeleted?: boolean): Business[];
  getBusinessById(id: string): Business | undefined;
  addBusiness(biz: Business): Business;
  updateBusiness(id: string, updates: Partial<Business>): Business;
  softDeleteBusiness(id: string, operatorId?: string): boolean;
  restoreBusiness(id: string): boolean;

  // Leads
  getAllLeads(includeDeleted?: boolean): Lead[];
  getLeadById(id: string): Lead | undefined;
  getLeadByBusinessId(businessId: string): Lead | undefined;
  addLead(lead: Lead): Lead;
  updateLead(id: string, updates: Partial<Lead>): Lead;
  softDeleteLead(id: string, operatorId?: string): boolean;
  restoreLead(id: string): boolean;
  mergeLeads(primaryId: string, secondaryId: string): Lead;

  // Contacts
  getContactsForBusiness(businessId: string): Contact[];
  addContact(contact: Contact): Contact;

  // Intelligence & Audits
  getWebsiteAuditByBusinessId(businessId: string): WebsiteAudit | undefined;
  setWebsiteAudit(audit: WebsiteAudit): void;
  getSocialAuditByBusinessId(businessId: string): SocialAudit | undefined;
  setSocialAudit(audit: SocialAudit): void;
  getAIAnalysisByBusinessId(businessId: string): AIAnalysis | undefined;
  setAIAnalysis(analysis: AIAnalysis): void;
  getLeadScoreByBusinessId(businessId: string): LeadScore | undefined;
  setLeadScore(score: LeadScore): void;

  // Proposals
  getAllProposals(includeDeleted?: boolean): Proposal[];
  getProposalById(id: string): Proposal | undefined;
  getProposalsForBusiness(businessId: string): Proposal[];
  addProposal(proposal: Proposal): Proposal;
  updateProposal(id: string, updates: Partial<Proposal>): Proposal;

  // Outreach & Follow-Ups
  getOutreachForLead(leadId: string): OutreachActivity[];
  addOutreachActivity(activity: OutreachActivity): OutreachActivity;
  getFollowUpsForLead(leadId: string): FollowUp[];
  addFollowUp(followUp: FollowUp): FollowUp;

  // State Dumps & Disaster Recovery
  getCompleteDump(): {
    businesses: Business[];
    leads: Lead[];
    contacts: Contact[];
    proposals: Proposal[];
    outreachActivities: OutreachActivity[];
    followUps: FollowUp[];
    webAudits: WebsiteAudit[];
    socialAudits: SocialAudit[];
    aiAnalyses: AIAnalysis[];
    leadScores?: LeadScore[];
    auditLogs: AuditLog[];
    systemSettings?: SystemSetting[];
  };
  restoreFromCompleteDump(dump: any): { restoredCounts: Record<string, number> };
}
