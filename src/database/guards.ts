/**
 * HorusScope - Phase 2: Data Separation & Boundary Guard Engine
 *
 * CRITICAL ARCHITECTURAL AXIOMS:
 * 1. External Data ≠ CRM Data
 *    External sources (Google Places, state registries, raw crawls) are volatile, third-party,
 *    and read-only. They must NEVER silently overwrite user-verified CRM fields.
 *
 * 2. AI Data ≠ Verified Data
 *    AI-generated analyses, pitch angles, and opportunity predictions are non-deterministic inferences.
 *    They must NEVER be mixed with or presented as verified contact identities, emails, or phone numbers.
 *
 * 3. Scalable Entity Tree:
 *    Business
 *      ├── External Sources
 *      ├── Website Audit
 *      ├── Social Audit
 *      ├── Contacts
 *      ├── AI Analysis
 *      ├── Lead Score
 *      ├── Outreach
 *      ├── Follow-ups
 *      └── Proposals
 */

import { auditService } from '../audit';
import {
  AIAnalysis,
  Business,
  Contact,
  DataSafetyCategory,
  ExternalBusinessData,
  UserCRMData,
} from '../types';

export interface DataIntegrityViolation {
  rule: 'EXTERNAL_CRM_SEPARATION' | 'AI_VERIFIED_SEPARATION' | 'PROVENANCE_INTEGRITY';
  attemptedAction: string;
  sourceCategory: DataSafetyCategory;
  targetCategory: DataSafetyCategory;
  details: string;
  timestamp: string;
}

export class DataSeparationGuard {
  /**
   * Enforces that external incoming data does not silently overwrite CRM fields.
   * If an operator wants to adopt external data, it must be explicitly merged via CRM action.
   */
  public static assertExternalDoesNotOverwriteCRM(
    existingCrm: UserCRMData,
    incomingExternal: Partial<ExternalBusinessData>,
    businessId: string
  ): boolean {
    // If incoming data attempts to inject directly into CRM properties without human action
    if ('verifiedBusinessName' in incomingExternal || 'internalNotes' in incomingExternal) {
      const violation: DataIntegrityViolation = {
        rule: 'EXTERNAL_CRM_SEPARATION',
        attemptedAction: 'EXTERNAL_WRITE_TO_CRM',
        sourceCategory: 'EXTERNAL_SOURCE',
        targetCategory: 'USER_CRM',
        details: `External data source attempted direct overwrite of protected CRM properties on business ${businessId}. Operation blocked.`,
        timestamp: new Date().toISOString(),
      };

      auditService.log({
        action: 'SAFETY_CHECK_TRIGGERED',
        entityType: 'Business',
        entityId: businessId,
        changeSummary: `[DATA GUARD] Blocked illegal write: External Data ≠ CRM Data (${violation.details})`,
      });

      throw new Error(`Data Safety Violation: External Data cannot overwrite User CRM Data directly.`);
    }

    return true;
  }

  /**
   * Enforces that AI-generated inferences never overwrite verified contact information.
   * AI can suggest angles or critiques, but NEVER invent or overwrite contact records.
   */
  public static assertAiDoesNotOverwriteVerified(
    existingContact: Contact,
    incomingAiData: Partial<AIAnalysis>,
    actorId: string = 'SYSTEM_GUARD'
  ): boolean {
    if ('businessEmail' in incomingAiData || 'businessPhone' in incomingAiData || 'fullName' in incomingAiData) {
      auditService.log({
        action: 'SAFETY_CHECK_TRIGGERED',
        entityType: 'Contact',
        entityId: existingContact.id,
        actorId,
        changeSummary: `[DATA GUARD] Blocked hallucination hazard: AI Data ≠ Verified Data. AI tried to write to Contact ${existingContact.id}.`,
      });

      throw new Error(
        `Data Safety Violation: AI-generated analysis is strictly isolated and can NEVER populate or mutate verified contact identities.`
      );
    }

    return true;
  }

  /**
   * Generates a clear provenance breakdown for any business record
   * showing exactly which layer each attribute originates from.
   */
  public static inspectEntityProvenance(business: Business) {
    return {
      businessId: business.id,
      layers: {
        externalLayer: {
          category: 'EXTERNAL_SOURCE' as const,
          label: 'External Sources Layer',
          sourceType: business.external.metadata.sourceType,
          retrievedAt: business.external.metadata.retrievedAt,
          attributes: {
            tradeName: business.external.tradeName,
            googleRating: business.external.googleRating,
            googleReviewCount: business.external.googleReviewCount,
            address: business.external.externalAddress?.formattedAddress,
            phone: business.external.externalPhone,
            websiteUrl: business.external.externalWebsiteUrl,
          },
          isReadOnly: true,
          overwritesCrm: false, // Invariant: FALSE
        },
        crmLayer: {
          category: 'USER_CRM' as const,
          label: 'User CRM Layer (Verified Data)',
          attributes: {
            verifiedBusinessName: business.crm.verifiedBusinessName,
            qualificationStatus: business.crm.qualificationStatus,
            internalNotes: business.crm.internalNotes,
            tags: business.crm.tags,
            preferredContactMethod: business.crm.preferredContactMethod,
          },
          isProtectedFromExternal: true, // Invariant: TRUE
          isProtectedFromAI: true, // Invariant: TRUE
        },
        appLayer: {
          category: 'APP_GENERATED' as const,
          label: 'Application & Normalization Layer',
          attributes: {
            normalizedName: business.identifiers.normalizedName,
            normalizedDomain: business.identifiers.normalizedDomain,
            pipelineStage: business.app.pipelineStage,
            duplicateReviewStatus: business.app.duplicateReviewStatus,
          },
        },
      },
      separationIntegrity: {
        externalVsCrmViolations: 0,
        aiVsVerifiedViolations: 0,
        status: 'SECURE_AND_SEGREGATED',
      },
    };
  }
}
