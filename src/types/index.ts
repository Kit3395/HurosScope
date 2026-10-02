/**
 * HorusScope - Core Architecture Entity & Domain Models
 * Phase 0: Technical Architecture & Foundation
 * 
 * CORE ARCHITECTURAL PRINCIPLE:
 * The system strictly distinguishes between:
 * 1. External/third-party business information
 * 2. AI-generated analysis
 * 3. User-entered CRM information
 * 4. Application-generated records
 * 5. System configuration
 * 6. Audit history
 * 
 * These categories MUST NEVER be mixed together into a single flat model.
 */

// ============================================================================
// 0. CATEGORY DISCRIMINATOR
// ============================================================================

export type DataSafetyCategory =
  | 'EXTERNAL_SOURCE'
  | 'AI_ANALYSIS'
  | 'USER_CRM'
  | 'APP_GENERATED'
  | 'SYSTEM_CONFIG'
  | 'AUDIT_HISTORY';

// ============================================================================
// 1. BASE REPOSITORY & SAFETY INTERFACES
// ============================================================================

export interface AuditableEntity {
  id: string;
  createdAt: string; // ISO-8601 UTC
  updatedAt: string; // ISO-8601 UTC
  version: number;
}

export interface SoftDeletable {
  isDeleted: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
}

// ============================================================================
// 2. USER ENTITY
// ============================================================================

export interface User extends AuditableEntity, SoftDeletable {
  category: 'SYSTEM_CONFIG';
  email: string;
  displayName: string;
  role: 'OWNER' | 'ADMIN' | 'OPERATOR';
  preferences: {
    theme: 'dark' | 'light' | 'system';
    defaultLeadView: 'list' | 'board';
    notificationThreshold: 'ALL' | 'HIGH_CONFIDENCE_ONLY';
  };
}

// ============================================================================
// 3. BUSINESS & BUSINESS SOURCES (Category 1: External Information)
// ============================================================================

export type BusinessSourceType =
  | 'GOOGLE_PLACES_API'
  | 'OFFICIAL_REGISTRY'
  | 'DIRECT_WEBSITE_LOOKUP'
  | 'MANUAL_IMPORT';

export interface BusinessSourceMetadata {
  sourceType: BusinessSourceType;
  sourceId: string; // e.g. Google Place ID or Registry number
  sourceUrl?: string;
  retrievedAt: string;
  rawPayloadHash: string; // SHA-256 for integrity & change detection
  attributionText?: string;
  expiresAt?: string; // Cache TTL to respect external terms of service
}

export interface ExternalBusinessData {
  category: 'EXTERNAL_SOURCE';
  metadata: BusinessSourceMetadata;
  googlePlaceId?: string; // Canonical external ID where applicable
  legalOrRegisteredName?: string;
  tradeName?: string;
  externalAddress?: {
    formattedAddress?: string;
    streetNumber?: string;
    route?: string;
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
  externalPhone?: string;
  externalWebsiteUrl?: string;
  googleRating?: number;
  googleReviewCount?: number;
  primaryCategoryCode?: string;
  additionalCategories?: string[];
  businessStatus?: 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';
}

export interface ExternalSource extends AuditableEntity, SoftDeletable {
  category: 'EXTERNAL_SOURCE';
  businessId: string;
  sourceType: BusinessSourceType;
  sourceId: string; // Canonical external ID (e.g. Google Place ID, Registry #)
  sourceUrl?: string;
  retrievedAt: string;
  rawPayloadHash: string;
  attributionText?: string;
  expiresAt?: string;
  payload: {
    tradeName?: string;
    legalName?: string;
    formattedAddress?: string;
    phone?: string;
    websiteUrl?: string;
    rating?: number;
    reviewCount?: number;
    primaryCategory?: string;
    categories?: string[];
    businessStatus?: string;
    rawAttributes?: Record<string, unknown>;
  };
  isPrimarySource: boolean;
}

// User-Entered CRM Data (Category 3: User CRM)
export interface UserCRMData {
  category: 'USER_CRM';
  verifiedBusinessName: string;
  internalNotes: string;
  qualificationStatus: 'NEW' | 'QUALIFIED' | 'DISQUALIFIED' | 'NURTURING';
  tags: string[];
  preferredContactMethod: 'EMAIL' | 'PHONE' | 'LINKEDIN' | 'IN_PERSON';
  assignedUserId?: string;
  customFields: Record<string, string | number | boolean>;
  lastContactedAt?: string | null;
}

// Application-Generated Data (Category 4: App Generated)
export interface AppGeneratedBusinessData {
  category: 'APP_GENERATED';
  normalizedBusinessName: string;
  normalizedPhone: string;
  normalizedDomain: string;
  pipelineStage: 'DISCOVERY' | 'QUALIFIED' | 'AUDIT_READY' | 'CONTACTED' | 'PROPOSAL_SENT' | 'WON' | 'LOST';
  duplicateReviewStatus: 'NONE' | 'FLAGGED_POTENTIAL_DUPLICATE' | 'REVIEWED_CONFIRMED' | 'RESOLVED_DISTINCT';
  duplicateFlagReason?: string;
  duplicateCandidateIds?: string[];
}

export interface Business extends AuditableEntity, SoftDeletable {
  // Stable internal ID - NEVER uses business name as primary key
  id: string; // e.g., "biz_01HQXZ..."

  // Segregated sub-domains to prevent mixing
  external: ExternalBusinessData;
  crm: UserCRMData;
  app: AppGeneratedBusinessData;

  // Composite duplicate keys (indexed internally)
  identifiers: {
    internalId: string;
    googlePlaceId?: string;
    normalizedName: string;
    normalizedPhone?: string;
    normalizedDomain?: string;
  };
}

// ============================================================================
// 4. CONTACT & CONTACT SOURCES (Legitimate Business Prospecting Only)
// ============================================================================

export type ContactVerificationStatus =
  | 'VERIFIED'
  | 'UNVERIFIED'
  | 'FLAGGED';

export type ContactSource =
  | 'PUBLIC_COMPANY_WEBSITE'
  | 'DIRECT_INQUIRY'
  | 'BUSINESS_CARD'
  | 'OFFICIAL_REGISTRATION'
  | 'USER_ENTERED';

export interface Contact extends AuditableEntity, SoftDeletable {
  category: 'USER_CRM';
  businessId: string;
  
  // Explicitly legitimate business fields
  fullName: string;
  jobTitle?: string;
  department?: string;
  
  // Strictly validated business communication channels
  businessEmail?: string;
  businessPhone?: string;
  linkedInCompanyProfileUrl?: string;

  // Safety & provenance
  source: ContactSource;
  sourceUrl?: string;
  verificationStatus: ContactVerificationStatus;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  notes?: string;

  // Privacy compliance assertion (No personal credentials/IDs ever stored)
  complianceStatement: 'LEGITIMATE_BUSINESS_PROSPECT_ONLY';
}

// ============================================================================
// 5. LEAD & LEAD SCORING
// ============================================================================

export type MainWorkflowStage =
  | 'Discover'
  | 'Qualify'
  | 'Contact'
  | 'Follow-up'
  | 'Proposal'
  | 'Client';

export const MAIN_WORKFLOW_STAGES: readonly MainWorkflowStage[] = [
  'Discover',
  'Qualify',
  'Contact',
  'Follow-up',
  'Proposal',
  'Client',
] as const;

export type LeadPipelineStatus =
  | 'Discover'
  | 'Qualify'
  | 'Contact'
  | 'Follow-up'
  | 'Proposal'
  | 'Client'
  | 'Lost'
  | 'New'
  | 'Researching'
  | 'Qualified'
  | 'Contacted'
  | 'Responded'
  | 'Meeting'
  | 'Proposal Sent'
  | 'Negotiation'
  | 'Won'
  | 'Not Interested';

export const ALL_PIPELINE_STATUSES: readonly LeadPipelineStatus[] = [
  'Discover',
  'Qualify',
  'Contact',
  'Follow-up',
  'Proposal',
  'Client',
  'Lost',
] as const;

export const LEGACY_PIPELINE_STATUSES: readonly LeadPipelineStatus[] = [
  'New',
  'Researching',
  'Qualified',
  'Contacted',
  'Responded',
  'Meeting',
  'Proposal Sent',
  'Negotiation',
  'Won',
  'Not Interested',
] as const;

export interface LeadScoreCriteria {
  websiteHealthWeight: number;    // 0-100
  socialPresenceWeight: number;   // 0-100
  digitalMarketingGapWeight: number; // 0-100
  businessSizeWeight: number;     // 0-100
  responseLikelihoodWeight: number; // 0-100
}

// ============================================================================
// PHASE 7: MULTI-DIMENSIONAL AI LEAD SCORING TYPES
// ============================================================================

export interface AILeadScoreDimension {
  name:
    | 'Digital Opportunity'
    | 'Website Opportunity'
    | 'Social Opportunity'
    | 'Business Strength'
    | 'Contactability'
    | 'Overall Prospect Score';
  score: number; // 0 - 100
  tier: 'EXCEPTIONAL' | 'HIGH' | 'MODERATE' | 'LOW';
  rationale: string;
  keySignals?: string[];
}

export interface AILeadScoreExplanation {
  overallScore: number; // 0 - 100
  verdictHeadline: string; // e.g. "Prime Acquisition Prospect (92/100)"
  narrative: string; // e.g. "Strong prospect because the business has 300+ customer reviews, an active social presence, and no dedicated website. A website could consolidate its existing online reputation into a professional conversion-focused presence."
  whyThisScore: string[];
  recommendedPitchAngle: string;
  actionableNextStep: string;
}

export interface AILeadScoreData {
  digitalOpportunity: number; // 0 - 100
  websiteOpportunity: number; // 0 - 100
  socialOpportunity: number;  // 0 - 100
  businessStrength: number;   // 0 - 100
  contactability: number;     // 0 - 100
  overallProspectScore: number; // 0 - 100

  explanation: AILeadScoreExplanation;

  dimensions: {
    digitalOpportunity: AILeadScoreDimension;
    websiteOpportunity: AILeadScoreDimension;
    socialOpportunity: AILeadScoreDimension;
    businessStrength: AILeadScoreDimension;
    contactability: AILeadScoreDimension;
    overallProspectScore: AILeadScoreDimension;
  };

  engine: 'GEMINI_FLASH_3_8' | 'DETERMINISTIC_HEURISTIC';
  calculatedAt: string;
  confidence: 'HIGH CONFIDENCE' | 'MEDIUM CONFIDENCE' | 'LOW CONFIDENCE';
  modelIdentifier: string;
}

export interface LeadScore extends AuditableEntity {
  category: 'APP_GENERATED';
  businessId: string;
  leadId: string;
  overallScore: number; // 0 - 100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

  // Multi-Dimensional Scores
  digitalOpportunity?: number; // 0 - 100
  websiteOpportunity?: number; // 0 - 100
  socialOpportunity?: number;  // 0 - 100
  businessStrength?: number;   // 0 - 100
  contactability?: number;     // 0 - 100
  overallProspectScore?: number; // 0 - 100

  aiScoreData?: AILeadScoreData;

  breakdown?: {
    websiteDesignDeficiencyScore: number; // Higher means greater need for web design
    seoDeficiencyScore: number;
    mobileReadinessScore: number;
    conversionOpportunityScore: number;
  };
  calculatedAt: string;
  calculationModelVersion: string;
}

export interface Lead extends AuditableEntity, SoftDeletable {
  category: 'APP_GENERATED';
  businessId: string;
  primaryContactId?: string;
  status: LeadPipelineStatus | 'IDENTIFIED' | 'ENRICHED' | 'AUDIT_COMPLETE' | 'PITCH_READY' | 'ACTIVE_OUTREACH' | 'CONVERTED' | 'ARCHIVED';
  pipelineStatus: LeadPipelineStatus;
  
  // Lead CRM Attributes
  tags?: string[];
  notes?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  owner?: string;
  nextFollowUp?: string;
  nextFollowUpDate?: string;
  serviceInterest?: string[];
  estimatedDealValueUSD?: number;
  probability?: number; // 0-100%
  source?: string;

  dealType: 'NEW_WEBSITE' | 'REDESIGN' | 'SEO_AUDIT' | 'FULL_DIGITAL_SUITE';
  currentScoreId?: string;
  aiScoreData?: AILeadScoreData;
  isArchived?: boolean;
  archivedAt?: string | null;
  temperature?: 'COLD' | 'WARM' | 'HOT';
  servicesRecommended?: string[];
  lastActivityAt?: string;
}

// ============================================================================
// 6. WEBSITE & SOCIAL AUDIT (Category 4: Application Generated Records)
// ============================================================================

export type WebsiteStatusTier =
  | 'NO_WEBSITE'
  | 'WEBSITE_EXISTS'
  | 'POTENTIALLY_OUTDATED'
  | 'GOOD_WEBSITE';

export interface WebsiteAuditCriteria {
  mobileResponsive: {
    passed: boolean | 'Not verified';
    details: string;
  };
  https: {
    passed: boolean | 'Not verified';
    hasValidCertificate: boolean | 'Not verified';
    details: string;
  };
  pageTitle: {
    title?: string;
    status: 'OPTIMIZED' | 'GENERIC' | 'MISSING' | 'Not verified';
    details: string;
  };
  metadata: {
    hasDescription: boolean;
    descriptionSnippet?: string;
    hasOpenGraph: boolean;
    status: 'OPTIMIZED' | 'INCOMPLETE' | 'MISSING';
    details: string;
  };
  navigation: {
    status: 'MODERN_STREAMLINED' | 'CLUTTERED' | 'MISSING_MOBILE_MENU' | 'Not verified';
    details: string;
  };
  callToAction: {
    presence: 'CLEAR_PRIMARY_CTA' | 'WEAK_VAGUE_CTA' | 'NO_VISIBLE_CTA';
    label?: string;
    placement: 'ABOVE_THE_FOLD' | 'BELOW_THE_FOLD' | 'NONE';
    details: string;
  };
  contactAccessibility: {
    hasClickToCall: boolean;
    hasVisibleEmail: boolean;
    hasMapOrDirections: boolean;
    hasContactForm: boolean;
    details: string;
  };
  visualConsistency: {
    status: 'MODERN_COHESIVE' | 'POTENTIALLY_OUTDATED_PATTERNS' | 'HIGHLY_INCONSISTENT' | 'Not verified';
    assessmentLanguage: string; // e.g. "AI assessment indicates the website may have outdated design patterns."
    details: string;
  };
  contentQuality: {
    clearValueProposition: boolean;
    structuredServices: boolean;
    recencySignal: 'ACTIVE' | 'UNCLEAR' | 'STALE';
    details: string;
  };
  performanceIndicators: {
    estimatedLoadTimeSeconds?: number;
    performanceGrade: 'FAST' | 'MODERATE' | 'SLOW' | 'CRITICAL_LAG';
    details: string;
  };
  accessibilityIndicators: {
    contrastCompliance: boolean | 'Not verified';
    estimatedScore: number; // 0-100
    details: string;
  };
  socialIntegration: {
    hasSocialLinks: boolean;
    linkedPlatforms: string[];
    details: string;
  };
  bookingOrderFunctionality: {
    status: 'INTEGRATED_PORTAL' | 'BASIC_FORM' | 'PHONE_ONLY' | 'NONE';
    systemName?: string;
    details: string;
  };
}

export interface WebsiteAudit extends AuditableEntity, SoftDeletable {
  category: 'APP_GENERATED';
  businessId: string;
  targetUrl: string;
  auditDate: string;

  // Status Classification
  websiteStatus: WebsiteStatusTier;

  // Website Opportunity Score (0 - 100)
  opportunityScore: number;
  opportunityGrade: 'HIGH_OPPORTUNITY' | 'MEDIUM_OPPORTUNITY' | 'LOW_OPPORTUNITY';
  opportunityScoreBreakdown: Array<{
    factor: string;
    pointsAwarded: number;
    maxPoints: number;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
    reason: string;
  }>;

  // Cautious AI Design Assessment Directive
  // Mandatory language format: "AI assessment indicates the website may have outdated design patterns."
  // Strictly prohibits speculative age claims like "Website was built in 2017."
  designPatternAssessment: string;

  // Comprehensive 13-criteria audit
  criteria: WebsiteAuditCriteria;

  // Objective technical benchmarks (backward-compatible)
  metrics: {
    mobileResponsive: boolean | 'Not verified';
    hasSslCertificate: boolean | 'Not verified';
    estimatedLoadTimeSeconds?: number;
    cmsIdentified?: string;
    hasModernViewportMeta: boolean | 'Not verified';
    hasStructuredData: boolean | 'Not verified';
    hasAnalyticsInstalled: boolean | 'Not verified';
    accessibilityScore?: number; // 0-100
  };

  identifiedIssues: Array<{
    id: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    category: 'PERFORMANCE' | 'MOBILE_UX' | 'SEO' | 'BRANDING' | 'SECURITY';
    description: string;
    opportunityTitle: string;
  }>;
}

// ============================================================================
// PHASE 6: SOCIAL INTELLIGENCE MODELS
// ============================================================================

export type SocialPlatformType =
  | 'FACEBOOK'
  | 'INSTAGRAM'
  | 'TIKTOK'
  | 'GOOGLE_BUSINESS'
  | 'LINKEDIN'
  | 'YOUTUBE'
  | 'X_TWITTER';

export type SocialPlatformPresenceStatus =
  | 'ACTIVE'
  | 'DORMANT'
  | 'UNKNOWN'
  | 'NONE';

export interface SocialChannelPresence {
  platform: SocialPlatformType;
  platformDisplayName: string;
  status: SocialPlatformPresenceStatus;
  url?: string;
  handle?: string;
  isClaimed: boolean | 'Not verified';
  audienceMetric?: string; // e.g. "1.4k followers", "420 reviews • 4.8★"
  activityIndicator?: string; // e.g. "Active posts within 7 days", "Last activity > 180 days"
  notes?: string;
}

export interface SocialSalesInsight {
  id: string;
  headline: string; // e.g., "Strong Facebook presence but no dedicated website."
  salesOpportunityType:
    | 'MISSING_WEBSITE_WITH_ACTIVE_SOCIAL'
    | 'SOCIAL_TRAFFIC_CONVERSION_FUNNEL'
    | 'OUTDATED_SITE_DROP_OFF'
    | 'HIGH_RATING_NO_DIGITAL_HUB'
    | 'MULTI_CHANNEL_EXPANSION';
  narrative: string;
  actionablePitchAngle: string;
  recommendedServices: string[];
  confidence: AIConfidenceLevel;
}

export interface SocialAudit extends AuditableEntity, SoftDeletable {
  category: 'APP_GENERATED';
  businessId: string;
  auditDate: string;

  // Structured Multi-Platform Analysis
  channels: SocialChannelPresence[];

  // Cross-reference with website status
  websiteCorrelationStatus: WebsiteStatusTier;

  // AI-Derived Sales Insights (e.g. "Strong Facebook presence but no dedicated website.")
  salesInsights: SocialSalesInsight[];

  // Quick scannable presence string
  crossChannelSummary: string; // e.g., "Facebook: Active | Instagram: Active | TikTok: Unknown | Website: None | Google Profile: Active"

  overallSocialPresenceGrade: 'ACTIVE' | 'MODERATE' | 'DORMANT' | 'NEGLIGENT' | 'UNVERIFIED';

  // Backward-compatible channelsFound
  channelsFound: Array<{
    platform: 'LINKEDIN' | 'FACEBOOK' | 'INSTAGRAM' | 'X_TWITTER' | 'YOUTUBE' | 'GOOGLE_BUSINESS';
    url: string;
    isClaimed: boolean | 'Not verified';
    lastActivityEstimate?: string | 'Not verified';
  }>;
}

// ============================================================================
// 7. AI ANALYSIS & SAFETY (Category 2: AI-Generated Analysis)
// ============================================================================

export type AIConfidenceLevel =
  | 'HIGH CONFIDENCE'
  | 'MEDIUM CONFIDENCE'
  | 'LOW CONFIDENCE'
  | 'UNVERIFIED';

export interface DesignRecommendation {
  id: string;
  title: string;
  targetArea: 'HERO_SECTION' | 'MOBILE_NAVIGATION' | 'CTA_PLACEMENT' | 'TYPOGRAPHY' | 'SPEED' | 'OFFER_CLARITY';
  currentObservation: string;
  proposedRedesignConcept: string;
  confidence: AIConfidenceLevel;
  potentialImpact: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface RecommendedColor {
  name: string;
  hexCode: string;
}

export interface DesignIntelligence {
  industry: string;
  brandPersonality: string;
  targetAudience: string;
  existingBranding: string;
  recommendedColors: RecommendedColor[];
  typographyDirection: string;
  uiStyle: string;
  photographyDirection: string;
  ctaStyle: string;
  designRationale: string;
}

export interface AIAnalysis extends AuditableEntity {
  category: 'AI_ANALYSIS';
  businessId: string;
  promptIntent: 'WEBSITE_CRITIQUE' | 'OUTREACH_ANGLE' | 'VALUE_PROPOSITION_MATCH';
  
  // Mandatory AI Safety Indicators
  isAiGenerated: true;
  modelIdentifier: string;
  confidence: AIConfidenceLevel;
  confidenceRationale: string;

  // Strict non-fabrication assertion
  verificationStatement: 'No contact identities, emails, or personal data were generated or assumed.';

  // Analysis payload
  summary: string;
  strengths: string[];
  vulnerabilities: string[];
  pitchAngles: string[];
  recommendations: DesignRecommendation[];
  designIntelligence?: DesignIntelligence;

  // User interaction with AI analysis
  userFeedback?: 'HELPFUL' | 'INACCURATE' | 'NEEDS_REVISION';
  userNotes?: string;
  isDismissed: boolean;
}

// ============================================================================
// 8. OUTREACH ACTIVITY & FOLLOW-UP (Category 3: User CRM)
// ============================================================================

export type OutreachChannel = 'CALL' | 'EMAIL' | 'FACEBOOK' | 'MESSENGER' | 'SMS' | 'MEETING' | 'PROPOSAL' | 'FOLLOW_UP';
export type OutreachStatus = 'DRAFT' | 'READY_FOR_MANUAL_SEND' | 'COMPLETED' | 'NO_ANSWER' | 'REPLIED' | 'OPTED_OUT';

export interface OutreachActivity extends AuditableEntity, SoftDeletable {
  category: 'USER_CRM';
  businessId: string;
  contactId?: string;
  leadId: string;
  channel: OutreachChannel;
  status: OutreachStatus;
  subject?: string;
  messageBody: string;
  sentAt?: string | null;
  scheduledFor?: string | null;
  outcomeNotes?: string;
  nextAction?: string;
  requiresManualAction: true; // Hard safety: automated sending strictly prohibited in Phase 0
}

export interface FollowUp extends AuditableEntity, SoftDeletable {
  category: 'USER_CRM';
  businessId: string;
  leadId: string;
  outreachActivityId?: string;
  scheduledDate: string;
  reason: string;
  priority: 'LOW' | 'NORMAL' | 'URGENT';
  isCompleted: boolean;
  completedAt?: string | null;
  reminderSent: boolean;
}

// ============================================================================
// 9. PROPOSAL & PROPOSAL ITEM (Category 3: User CRM / App Generated)
// ============================================================================

export interface ProposalItem {
  id: string;
  title: string;
  description: string;
  itemType: 'DISCOVERY_AND_STRATEGY' | 'CUSTOM_DESIGN' | 'DEVELOPMENT' | 'SEO_FOUNDATION' | 'HOSTING_AND_CARE';
  deliverables: string[];
  estimatedHours?: number;
  fixedPriceUSD: number;
}

export interface Proposal extends AuditableEntity, SoftDeletable {
  category: 'USER_CRM';
  businessId: string;
  leadId: string;
  proposalNumber: string; // e.g. "PROP-2026-001"
  title: string;
  clientExecutiveSummary: string;
  items: ProposalItem[];
  subtotalUSD: number;
  discountUSD?: number;
  totalUSD: number;
  validUntil: string;
  status: 'DRAFT' | 'REVIEWED' | 'CLIENT_SENT' | 'ACCEPTED' | 'DECLINED' | 'SUPERSEDED';
  paymentProcessingActive: false;

  // Proposal Generator Data
  isAiDraft?: boolean;
  recommendedPackage?: string;
  whyItNeedsIt?: string;
  recommendedDesignDirection?: string;
  suggestedFeatures?: string[];
  estimatedProjectScope?: string;
}

// ============================================================================
// 10. SYSTEM SETTINGS (Category 5: System Configuration)
// ============================================================================

export interface RateLimitSetting {
  maxRequestsPerMinute: number;
  burstAllowance: number;
  backoffFactor: number;
  cooldownSeconds: number;
}

export interface SystemSetting extends AuditableEntity {
  category: 'SYSTEM_CONFIG';
  key: string;
  value: string | number | boolean | Record<string, unknown>;
  description: string;
  isEncrypted: boolean;
  requiresRestart: boolean;
}

export interface SystemHealth {
  apiStatus: 'HEALTHY' | 'DEGRADED' | 'OFFLINE';
  databaseStatus: 'CONNECTED' | 'READ_ONLY' | 'ERROR';
  aiStatus: 'AVAILABLE' | 'RATE_LIMITED' | 'KEY_MISSING' | 'DISABLED';
  lastSynchronization: string;
  errorCount: number;
  activeRateLimits: {
    googlePlacesBudgetRemaining: number;
    aiTokenBudgetRemaining: number;
    webAuditQueueSize: number;
  };
  storageStatus: {
    businessesCount: number;
    leadsCount: number;
    contactsCount: number;
    auditLogsCount: number;
  };
  phase: '- Architectural Foundation';
}

// ============================================================================
// 11. AUDIT LOG (Category 6: Audit History)
// ============================================================================

export type AuditActionType =
  | 'ENTITY_CREATED'
  | 'ENTITY_UPDATED'
  | 'ENTITY_SOFT_DELETED'
  | 'ENTITY_RESTORED'
  | 'DUPLICATE_FLAGGED'
  | 'DUPLICATE_RESOLVED'
  | 'AI_ANALYSIS_GENERATED'
  | 'SAFETY_CHECK_TRIGGERED'
  | 'RATE_LIMIT_HIT'
  | 'SETTINGS_CHANGED'
  | 'LEAD_ARCHIVED'
  | 'LEAD_UNARCHIVED'
  | 'LEAD_STATUS_CHANGED'
  | 'LEADS_BULK_UPDATED'
  | 'LEADS_BULK_DELETED'
  | 'LEADS_MERGED'
  | 'LEADS_IMPORTED'
  | 'LEADS_EXPORTED'
  | 'DISCOVERY_SEARCH_EXECUTED'
  | 'DISCOVERY_BUSINESS_IMPORTED'
  | 'PROPOSAL_GENERATED'
  | 'PROPOSAL_UPDATED'
  | 'DISCOVERY_BATCH_IMPORTED'
  | 'DUPLICATE_REVIEWED'
  | 'HUMAN_APPROVAL_GRANTED'
  | 'HUMAN_APPROVAL_REJECTED'
  | 'AI_SAFETY_VIOLATION_BLOCKED'
  | 'BACKUP_CREATED'
  | 'BACKUP_RESTORED'
  | 'EXTERNAL_API_CALL_LOGGED'
  | 'EXTERNAL_API_CIRCUIT_BROKEN'
  | 'AUTH_ROLE_SWITCHED'
  | 'PRICING_MODIFIED'
  | 'CONFIGURATION_CHANGED'
  | 'SENT_MESSAGE'
  | 'BATCH_OUTREACH_QUEUED';

export interface AuditLog {
  id: string;
  category: 'AUDIT_HISTORY';
  timestamp: string; // ISO-8601
  actorId: string;
  actorType: 'USER' | 'SYSTEM_CRON' | 'SAFETY_GUARD';
  action: AuditActionType;
  entityType:
    | 'Business'
    | 'Lead'
    | 'Contact'
    | 'WebsiteAudit'
    | 'SocialAudit'
    | 'AIAnalysis'
    | 'OutreachActivity'
    | 'Proposal'
    | 'SystemSetting'
    | 'SecurityGate'
    | 'BackupSnapshot'
    | 'ExternalApiCall';
  entityId: string;
  previousValueSnapshot?: Record<string, unknown> | null;
  newValueSnapshot?: Record<string, unknown> | null;
  changeSummary: string;
  ipAddressOrOrigin?: string;
  severity?: 'INFO' | 'WARNING' | 'CRITICAL' | 'LOW' | 'MEDIUM' | 'HIGH';
}

// ============================================================================
// 12. DUPLICATE DETECTION MODEL
// ============================================================================

export interface DuplicateMatchDetail {
  matchedField: 'internalId' | 'googlePlaceId' | 'normalizedDomain' | 'normalizedPhone' | 'normalizedName' | 'nameAndLocation';
  existingRecordId: string;
  existingValue: string;
  incomingValue: string;
  confidenceScore: number; // 0.0 to 1.0
}

export interface DuplicateDetectionResult {
  hasPotentialDuplicate: boolean;
  highestConfidence: number;
  matches: DuplicateMatchDetail[];
  recommendation: 'PROCEED' | 'FLAG_FOR_REVIEW' | 'REJECT_EXACT_DUPLICATE';
}

// ============================================================================
// 13. PHASE 3: BUSINESS DISCOVERY MODELS (Official Google Places API New)
// ============================================================================

export interface DiscoveredBusiness {
  id: string; // Primary external reference (Google Place ID)
  googlePlaceId: string;
  name: string;
  formattedAddress: string;
  locality?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  phone?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  businessHours?: {
    openNow?: boolean;
    weekdayDescriptions?: string[];
  };
  googleMapsUri?: string;
  primaryType?: string;
  types?: string[];
  businessStatus?: 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';

  // Digital Presence & Opportunity Scoring
  websiteStatus: 'NO_WEBSITE' | 'HAS_WEBSITE';
  opportunityScore: number; // 0 - 100
  opportunityGrade: 'HIGH_OPPORTUNITY' | 'MEDIUM_OPPORTUNITY' | 'LOW_OPPORTUNITY';
  opportunityReasons: string[];

  // Deduplication Signals & CRM State
  duplicateStatus: 'NEW' | 'POTENTIAL_DUPLICATE' | 'EXISTING_IN_CRM';
  duplicateMatches?: DuplicateMatchDetail[];
  matchedExistingBusinessId?: string;
  matchedExistingBusinessName?: string;
  existingLeadId?: string;

  // Metadata & Attribution
  attributionText: string;
  retrievedAt: string;
  isSandboxData?: boolean;
}

export interface DiscoverySearchParams {
  location: string;
  category: string;
  keyword: string;
  radiusKm: number;
  minRating: number; // 0, 3.5, 4.0, 4.5
  minReviews: number; // 0, 5, 20, 50, 100
  websiteStatus: 'ALL' | 'NO_WEBSITE' | 'HAS_WEBSITE';
  socialPresence: 'ALL' | 'DETECTED' | 'MISSING';
  leadStatus: 'ALL' | 'NOT_IN_CRM' | 'IN_CRM';
  opportunityFilter: 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW';
  pageSize?: number;
  pageToken?: string;
}

export interface DiscoverySearchResult {
  places: DiscoveredBusiness[];
  nextPageToken?: string;
  totalReturned: number;
  source: 'OFFICIAL_GOOGLE_PLACES_API_NEW' | 'SANDBOX_DIAGNOSTIC';
  isSandboxData: boolean;
  notice?: string;
  attribution: string;
  sessionMeta: {
    queryText: string;
    timestamp: string;
    durationMs: number;
    quotaUsedThisSession: number;
  };
}

export interface DiscoveryApiStatus {
  hasApiKey: boolean;
  placesApiVersion: string;
  requestsThisMinute: number;
  remainingThisMinute: number;
  minuteResetSeconds: number;
  sessionRequestsCount: number;
  isDiagnosticsModeAvailable: boolean;
  throttlingDelayMs: number;
  attributionNotice: string;
}

// ============================================================================
// 14. SECURITY, RBAC & SAFETY-NET GOVERNANCE
// ============================================================================

export type UserRole = 'OWNER' | 'ADMIN' | 'OPERATOR' | 'VIEWER';

export type UserPermission =
  | 'VIEW_RECORDS'
  | 'EDIT_RECORDS'
  | 'DELETE_LEADS'
  | 'MERGE_RECORDS'
  | 'SEND_OUTREACH'
  | 'BULK_OUTREACH'
  | 'CHANGE_PRICING'
  | 'FINALIZE_PROPOSAL'
  | 'BULK_IMPORT'
  | 'BULK_DELETE'
  | 'CHANGE_SYSTEM_CONFIG'
  | 'MANAGE_BACKUPS'
  | 'OVERRIDE_AI_GUARDRAILS'
  | 'MANAGE_USERS'
  | 'APPROVE_USER_REQUESTS';

export type UserAccountStatus = 'APPROVED' | 'PENDING' | 'REJECTED' | 'SUSPENDED';

export interface UserAccount {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserAccountStatus;
  organization?: string;
  avatarUrl?: string;
  passwordHash?: string; // Salted SHA-256 / PBKDF2 stretched password hash
  passwordSalt?: string; // Cryptographic salt
  isPasswordSet?: boolean;
  failedLoginAttempts?: number;
  lockoutUntil?: string | null;
  googleId?: string; // Linked Google account sub ID
  googleEmail?: string; // Linked Google verified email
  isGoogleConnected?: boolean;
  googleLinkedAt?: string;
  requestedRole?: UserRole;
  requestMessage?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
}

export interface UserAccessRequest {
  id: string;
  email: string;
  fullName: string;
  organization: string;
  requestedRole: UserRole;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

export interface SupabaseConfigStatus {
  isConfigured: boolean;
  url?: string;
  hasAnonKey: boolean;
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'UNCONFIGURED';
  lastCheckedAt?: string;
  error?: string;
}

export interface CurrentUserSession {
  userId: string;
  displayName: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  organization?: string;
  sessionStartedAt: string;
  ipAddress: string;
  activePermissions: UserPermission[];
  authProvider?: 'LOCAL' | 'SUPABASE' | 'GOOGLE';
  isGoogleConnected?: boolean;
}

export type ApprovalActionType =
  | 'BULK_IMPORT'
  | 'BULK_DELETE'
  | 'MERGE'
  | 'PROPOSAL_FINALIZATION'
  | 'EXTERNAL_COMMUNICATION'
  | 'BULK_OUTREACH'
  | 'CHANGING_PRICING'
  | 'CHANGING_SYSTEM_CONFIG';

export interface HumanApprovalRequest {
  id: string;
  actionType: ApprovalActionType;
  title: string;
  description: string;
  targetSummary: string;
  itemCount?: number;
  dangerLevel: 'INFO' | 'WARNING' | 'CRITICAL';
  requiredConfirmationPhrase?: string; // e.g. "CONFIRM" or "DELETE"
  requestedBy: {
    userId: string;
    displayName: string;
    role: UserRole;
  };
  requestedAt: string;
  payload?: Record<string, unknown>;
}

export interface ExternalApiCallMetadata {
  id: string;
  service: 'GOOGLE_MAPS_PLACES' | 'GEMINI_AI' | 'WEBSITE_AUDITOR' | 'EMAIL_GATEWAY';
  endpoint: string;
  timestamp: string;
  durationMs: number;
  statusCode: number;
  wasThrottled: boolean;
  retryCount: number;
  quotaRemaining: number;
  error?: string;
  usedFallback: boolean;
}

export interface BackupSnapshot {
  id: string;
  version: string;
  createdAt: string;
  createdBy: string;
  schemaVersion: number;
  checksum: string;
  totalEntitiesCount: number;
  entitiesSummary: Record<string, number>;
  data: {
    businesses: any[];
    leads: any[];
    contacts: any[];
    externalSources?: any[];
    proposals: any[];
    outreachActivities: any[];
    followUps: any[];
    webAudits: any[];
    socialAudits: any[];
    aiAnalyses: any[];
    leadScores?: any[];
    auditLogs: any[];
    systemSettings?: any[];
  };
}

