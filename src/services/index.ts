/**
 * HorusScope - Domain Services Layer
 * Phase 2: Database Foundation & Layer Segregation
 */

import { createSafeAnalyticalCritique, sanitizeAndValidateAIOutput } from '../ai';
import { auditService } from '../audit';
import { BusinessEntityTree, DatabaseScaleMetrics, repository } from '../database';
import { aiRateLimiter } from '../security';
import {
  AIAnalysis,
  Business,
  Contact,
  ExternalSource,
  FollowUp,
  Lead,
  LeadPipelineStatus,
  LeadScore,
  OutreachActivity,
  Proposal,
  SocialAudit,
  SystemHealth,
  WebsiteAudit,
} from '../types';

export const businessService = {
  getAll: (includeDeleted = false): Business[] => {
    return repository.getAllBusinesses(includeDeleted);
  },

  getById: (id: string): Business | undefined => {
    return repository.getBusinessById(id);
  },

  getEntityTree: (businessId: string): BusinessEntityTree | undefined => {
    return repository.getBusinessEntityTree(businessId);
  },

  getExternalSources: (businessId: string): ExternalSource[] => {
    return repository.getExternalSourcesForBusiness(businessId);
  },

  register: (params: Parameters<typeof repository.registerBusiness>[0]) => {
    return repository.registerBusiness(params);
  },

  updateCRM: (id: string, updates: Parameters<typeof repository.updateBusinessCRM>[1]) => {
    return repository.updateBusinessCRM(id, updates);
  },

  adoptExternalData: (
    businessId: string,
    fields: { name?: boolean; phone?: boolean; address?: boolean }
  ) => {
    return repository.adoptExternalDataToCRM(businessId, fields);
  },

  softDelete: (id: string, actorId?: string) => {
    return repository.softDeleteBusiness(id, actorId);
  },

  restore: (id: string) => {
    return repository.restoreBusiness(id);
  },

  purgeToCleanProductionState: () => {
    repository.purgeToCleanProductionState();
  },
};

export const leadService = {
  getAll: (includeDeleted = false, includeArchived = true): Lead[] => {
    return repository.getAllLeads(includeDeleted, includeArchived);
  },

  getById: (id: string): Lead | undefined => {
    return repository.getLeadById(id);
  },

  getByBusinessId: (businessId: string): Lead | undefined => {
    return repository.getLeadByBusinessId(businessId);
  },

  updatePipelineStatus: (id: string, status: LeadPipelineStatus, actorId?: string): Lead => {
    return repository.updateLeadPipelineStatus(id, status, actorId);
  },

  update: (id: string, updates: Partial<Lead>, actorId?: string): Lead => {
    return repository.updateLead(id, updates, actorId);
  },

  archive: (id: string, actorId?: string): boolean => {
    return repository.archiveLead(id, actorId);
  },

  unarchive: (id: string, actorId?: string): boolean => {
    return repository.unarchiveLead(id, actorId);
  },

  softDelete: (id: string, actorId?: string): boolean => {
    return repository.softDeleteLead(id, actorId);
  },

  restore: (id: string, actorId?: string): boolean => {
    return repository.restoreLead(id, actorId);
  },

  bulkDelete: (ids: string[], actorId?: string): number => {
    return repository.bulkDeleteLeads(ids, actorId);
  },

  bulkUpdate: (
    ids: string[],
    updates: { pipelineStatus?: LeadPipelineStatus; priority?: Lead['priority']; tag?: string },
    actorId?: string
  ): number => {
    return repository.bulkUpdateLeads(ids, updates, actorId);
  },

  merge: (primaryId: string, secondaryId: string, actorId?: string) => {
    return repository.mergeLeads(primaryId, secondaryId, actorId);
  },

  import: (
    records: Array<{
      name: string;
      website?: string;
      phone?: string;
      email?: string;
      address?: string;
      notes?: string;
      pipelineStatus?: LeadPipelineStatus;
      priority?: Lead['priority'];
      dealValue?: number;
    }>,
    actorId?: string
  ) => {
    return repository.importLeads(records, actorId);
  },

  getAllFollowUps: (includeCompleted = true): FollowUp[] => {
    return repository.getAllFollowUps(includeCompleted);
  },

  getFollowUpsForLead: (leadId: string): FollowUp[] => {
    return repository.getFollowUpsForLead(leadId);
  },

  addFollowUp: (params: Parameters<typeof repository.addFollowUp>[0]): FollowUp => {
    return repository.addFollowUp(params);
  },

  toggleFollowUp: (id: string): FollowUp | undefined => {
    return repository.toggleFollowUp(id);
  },

  getAllOutreach: (): OutreachActivity[] => {
    return repository.getAllOutreachActivities();
  },

  getOutreachForLead: (leadId: string): OutreachActivity[] => {
    return repository.getOutreachActivitiesForLead(leadId);
  },

  addOutreach: (params: Parameters<typeof repository.addOutreachActivity>[0]): OutreachActivity => {
    return repository.addOutreachActivity(params);
  },
};

export { intelligenceService } from './intelligenceService';

export const contactService = {
  getAll: (includeDeleted = false): Contact[] => {
    return repository.getAllContacts(includeDeleted);
  },

  getByBusiness: (businessId: string): Contact[] => {
    return repository.getContactsForBusiness(businessId);
  },

  create: (contact: Contact): Contact => {
    return repository.addContact(contact);
  },
};

export const proposalService = {
  getAll: (includeDeleted = false): Proposal[] => {
    return repository.getAllProposals(includeDeleted);
  },

  getByBusiness: (businessId: string): Proposal[] => {
    return repository.getProposalsForBusiness(businessId);
  },
  
  create: (proposal: Proposal): Proposal => {
    return repository.addProposal(proposal);
  },
  
  update: (id: string, updates: Partial<Proposal>): Proposal => {
    return repository.updateProposal(id, updates);
  }
};

export const databaseScaleService = {
  getMetrics: (): DatabaseScaleMetrics => {
    return repository.getDatabaseScaleMetrics();
  },

  seedScaleSimulation: (count: number = 250) => {
    return repository.seedScaleSimulation(count);
  },
};

export const systemHealthService = {
  getStatus: (): SystemHealth => {
    return repository.getSystemHealth();
  },
};

export { discoveryService } from './discoveryService';
export * from './contracts';
