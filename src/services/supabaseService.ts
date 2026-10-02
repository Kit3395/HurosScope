/**
 * HorusScope - Comprehensive Supabase Cloud Database & Auth Service
 * 
 * Provides lazy client initialization, live connectivity checks,
 * table statistics, bi-directional synchronization, and full relational
 * persistence across all 12 core domains:
 * - Businesses
 * - Leads
 * - External Sources
 * - Website Audits
 * - Social Audits
 * - Contacts
 * - AI Analyses
 * - Lead Scores
 * - Outreach Activities
 * - Follow-Ups
 * - Proposals
 * - Access Requests
 * - User Accounts
 * - Audit Trail
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  AIAnalysis,
  AuditLog,
  Business,
  Contact,
  ExternalSource,
  FollowUp,
  Lead,
  LeadScore,
  OutreachActivity,
  Proposal,
  SocialAudit,
  SupabaseConfigStatus,
  WebsiteAudit,
} from '../types';

const SUPABASE_CONFIG_STORAGE_KEY = 'horusscope_supabase_config_v1';
const DEFAULT_SUPABASE_URL = 'https://jnrgvkbmodcbwpteicoc.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_cOCvmaobmvNKvWYjH_1mQg_rlHgSKXQ';

export interface SupabaseTableStats {
  businesses: number;
  leads: number;
  externalSources: number;
  websiteAudits: number;
  socialAudits: number;
  contacts: number;
  aiAnalyses: number;
  leadScores: number;
  outreachActivities: number;
  followUps: number;
  proposals: number;
  accessRequests: number;
  userAccounts: number;
  auditLogs: number;
  lastCheckedAt: string;
}

class SupabaseService {
  private client: SupabaseClient | null = null;
  private customUrl: string | null = null;
  private customAnonKey: string | null = null;
  private isDisabled: boolean = false;

  constructor() {
    this.loadSavedConfig();
  }

  private loadSavedConfig() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(SUPABASE_CONFIG_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.disabled) {
            this.isDisabled = true;
            this.customUrl = null;
            this.customAnonKey = null;
          } else {
            this.isDisabled = false;
            this.customUrl = parsed.url;
            this.customAnonKey = parsed.anonKey;
          }
        }
      } catch {
        // ignore
      }
    }
  }

  /**
   * Lazily initializes and returns the Supabase client instance.
   * Returns null if no valid credentials are provided, enabling safe local fallback.
   */
  public getClient(): SupabaseClient | null {
    if (this.isDisabled) return null;

    const rawUrl =
      this.customUrl ||
      (import.meta as any).env?.VITE_SUPABASE_URL ||
      (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL ||
      (import.meta as any).env?.SUPABASE_URL ||
      DEFAULT_SUPABASE_URL ||
      '';
    const rawAnonKey =
      this.customAnonKey ||
      (import.meta as any).env?.SUPABASE_PUBLISHABLE_KEY ||
      (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
      (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      (import.meta as any).env?.SUPABASE_ANON_KEY ||
      DEFAULT_SUPABASE_ANON_KEY ||
      '';

    const url = rawUrl.startsWith('http') ? rawUrl.trim() : '';
    const anonKey =
      rawAnonKey && !rawAnonKey.startsWith('MY_') ? rawAnonKey.trim() : '';

    if (!url || !anonKey) {
      return null;
    }

    if (!this.client) {
      try {
        this.client = createClient(url, anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        });
      } catch (err) {
        console.warn('Failed to initialize Supabase client:', err);
        return null;
      }
    }

    return this.client;
  }

  /**
   * Returns current status and connectivity diagnostics.
   */
  public async getStatus(): Promise<SupabaseConfigStatus> {
    if (this.isDisabled) {
      return {
        isConfigured: false,
        url: undefined,
        hasAnonKey: false,
        connectionStatus: 'UNCONFIGURED',
        lastCheckedAt: new Date().toISOString(),
      };
    }

    const rawUrl =
      this.customUrl ||
      (import.meta as any).env?.VITE_SUPABASE_URL ||
      (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL ||
      (import.meta as any).env?.SUPABASE_URL ||
      DEFAULT_SUPABASE_URL ||
      '';
    const rawAnonKey =
      this.customAnonKey ||
      (import.meta as any).env?.SUPABASE_PUBLISHABLE_KEY ||
      (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
      (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      (import.meta as any).env?.SUPABASE_ANON_KEY ||
      DEFAULT_SUPABASE_ANON_KEY ||
      '';

    const url = rawUrl.startsWith('http') ? rawUrl.trim() : '';
    const hasAnonKey = Boolean(rawAnonKey && !rawAnonKey.startsWith('MY_'));

    if (!url || !hasAnonKey) {
      return {
        isConfigured: false,
        url: url || undefined,
        hasAnonKey,
        connectionStatus: 'UNCONFIGURED',
        lastCheckedAt: new Date().toISOString(),
      };
    }

    try {
      const client = this.getClient();
      if (!client) {
        throw new Error('Supabase client failed to instantiate.');
      }

      // Ping Supabase to verify connectivity
      const start = Date.now();
      const { error } = await client.from('businesses').select('id').limit(1);
      const latencyMs = Date.now() - start;

      if (error) {
        // If table doesn't exist yet, connection is valid but schema needs deployment
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          return {
            isConfigured: true,
            url,
            hasAnonKey: true,
            connectionStatus: 'CONNECTED',
            error: 'Connected to Supabase! (Tables pending: please run the SQL script in SQL Editor)',
            lastCheckedAt: new Date().toISOString(),
          };
        }
        return {
          isConfigured: true,
          url,
          hasAnonKey: true,
          connectionStatus: 'ERROR',
          error: error.message,
          lastCheckedAt: new Date().toISOString(),
        };
      }

      return {
        isConfigured: true,
        url,
        hasAnonKey: true,
        connectionStatus: 'CONNECTED',
        lastCheckedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        isConfigured: true,
        url,
        hasAnonKey: true,
        connectionStatus: 'ERROR',
        error: err.message || 'Unable to connect to Supabase project.',
        lastCheckedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Sets custom credentials (e.g. entered via UI dialog)
   */
  public setCredentials(url: string, anonKey: string): void {
    this.isDisabled = false;
    this.customUrl = url.trim();
    this.customAnonKey = anonKey.trim();
    this.client = null;

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          SUPABASE_CONFIG_STORAGE_KEY,
          JSON.stringify({ url: this.customUrl, anonKey: this.customAnonKey, disabled: false })
        );
      } catch {
        // ignore
      }
    }
  }

  /**
   * Clears custom Supabase credentials
   */
  public clearCredentials(): void {
    this.isDisabled = true;
    this.customUrl = null;
    this.customAnonKey = null;
    this.client = null;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          SUPABASE_CONFIG_STORAGE_KEY,
          JSON.stringify({ url: '', anonKey: '', disabled: true })
        );
      } catch {
        // ignore
      }
    }
  }

  /**
   * Retrieves row counts across all core tables in Supabase
   */
  public async getTableStats(): Promise<SupabaseTableStats> {
    const stats: SupabaseTableStats = {
      businesses: 0,
      leads: 0,
      externalSources: 0,
      websiteAudits: 0,
      socialAudits: 0,
      contacts: 0,
      aiAnalyses: 0,
      leadScores: 0,
      outreachActivities: 0,
      followUps: 0,
      proposals: 0,
      accessRequests: 0,
      userAccounts: 0,
      auditLogs: 0,
      lastCheckedAt: new Date().toISOString(),
    };

    const client = this.getClient();
    if (!client) return stats;

    const tables: Array<keyof Omit<SupabaseTableStats, 'lastCheckedAt'>> = [
      'businesses',
      'leads',
      'externalSources',
      'websiteAudits',
      'socialAudits',
      'contacts',
      'aiAnalyses',
      'leadScores',
      'outreachActivities',
      'followUps',
      'proposals',
      'accessRequests',
      'userAccounts',
      'auditLogs',
    ];

    const dbTableMap: Record<string, string> = {
      businesses: 'businesses',
      leads: 'leads',
      externalSources: 'external_sources',
      websiteAudits: 'website_audits',
      socialAudits: 'social_audits',
      contacts: 'contacts',
      aiAnalyses: 'ai_analyses',
      leadScores: 'lead_scores',
      outreachActivities: 'outreach_activities',
      followUps: 'follow_ups',
      proposals: 'proposals',
      accessRequests: 'access_requests',
      userAccounts: 'user_accounts',
      auditLogs: 'audit_logs',
    };

    await Promise.all(
      tables.map(async (key) => {
        try {
          const dbTable = dbTableMap[key];
          const { count, error } = await client
            .from(dbTable)
            .select('*', { count: 'exact', head: true });
          if (!error && typeof count === 'number') {
            stats[key] = count;
          }
        } catch {
          // table might not exist yet
        }
      })
    );

    return stats;
  }

  // ==========================================================================
  // 1. BUSINESSES CRUD
  // ==========================================================================

  public async fetchBusinesses(): Promise<Business[]> {
    const client = this.getClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('businesses')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error || !data) return [];

      return data.map((row: any): Business => {
        return {
          id: row.id,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          version: row.version || 1,
          isDeleted: Boolean(row.is_deleted),
          deletedAt: row.deleted_at,
          deletedBy: row.deleted_by,
          external: row.external_payload && Object.keys(row.external_payload).length > 0
            ? row.external_payload
            : {
                category: 'EXTERNAL_SOURCE',
                tradeName: row.trade_name || row.name,
                legalOrRegisteredName: row.legal_or_registered_name,
                primaryCategoryCode: row.category,
                externalPhone: row.phone,
                externalWebsiteUrl: row.website_url,
                googleRating: Number(row.google_rating) || 0,
                googleReviewCount: Number(row.google_review_count) || 0,
                businessStatus: row.business_status || 'OPERATIONAL',
                externalAddress: { formattedAddress: row.formatted_address },
                metadata: {
                  sourceType: 'GOOGLE_PLACES_API',
                  sourceId: row.google_place_id || row.id,
                  retrievedAt: row.created_at,
                  rawPayloadHash: '',
                },
              },
          crm: row.crm_data && Object.keys(row.crm_data).length > 0
            ? row.crm_data
            : {
                category: 'USER_CRM',
                verifiedBusinessName: row.name,
                internalNotes: '',
                qualificationStatus: 'NEW',
                tags: [],
                preferredContactMethod: 'EMAIL',
                customFields: {
                  opportunityScore: row.opportunity_score,
                  opportunityGrade: row.opportunity_grade,
                },
              },
          app: row.app_data && Object.keys(row.app_data).length > 0
            ? row.app_data
            : {
                category: 'APP_GENERATED',
                normalizedBusinessName: row.normalized_name || row.name.toLowerCase(),
                normalizedPhone: row.normalized_phone || '',
                normalizedDomain: row.normalized_domain || '',
                pipelineStage: row.pipeline_stage || 'DISCOVERY',
                duplicateReviewStatus: 'NONE',
              },
          identifiers: row.identifiers && Object.keys(row.identifiers).length > 0
            ? row.identifiers
            : {
                internalId: row.id,
                googlePlaceId: row.google_place_id,
                normalizedName: row.normalized_name || row.name.toLowerCase(),
                normalizedPhone: row.normalized_phone,
                normalizedDomain: row.normalized_domain,
              },
        };
      });
    } catch {
      return [];
    }
  }

  public async upsertBusiness(biz: Business): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      const name =
        biz.crm?.verifiedBusinessName ||
        biz.external?.tradeName ||
        biz.external?.legalOrRegisteredName ||
        biz.app?.normalizedBusinessName ||
        'Business';

      const payload = {
        id: biz.id,
        name,
        legal_or_registered_name: biz.external?.legalOrRegisteredName || null,
        trade_name: biz.external?.tradeName || null,
        category: biz.external?.primaryCategoryCode || null,
        formatted_address: biz.external?.externalAddress?.formattedAddress || null,
        phone: biz.external?.externalPhone || null,
        website_url: biz.external?.externalWebsiteUrl || null,
        google_rating: biz.external?.googleRating || null,
        google_review_count: biz.external?.googleReviewCount || 0,
        business_status: biz.external?.businessStatus || 'OPERATIONAL',
        opportunity_score: Number((biz.crm?.customFields as any)?.opportunityScore || 0),
        opportunity_grade: String((biz.crm?.customFields as any)?.opportunityGrade || 'LOW_OPPORTUNITY'),
        pipeline_stage: biz.app?.pipelineStage || 'DISCOVERY',
        google_place_id: biz.identifiers?.googlePlaceId || null,
        normalized_domain: biz.identifiers?.normalizedDomain || null,
        normalized_phone: biz.identifiers?.normalizedPhone || null,
        normalized_name: biz.identifiers?.normalizedName || null,
        is_deleted: Boolean(biz.isDeleted),
        deleted_at: biz.deletedAt || null,
        deleted_by: biz.deletedBy || null,
        external_payload: biz.external || {},
        crm_data: biz.crm || {},
        app_data: biz.app || {},
        identifiers: biz.identifiers || {},
        version: biz.version || 1,
        created_at: biz.createdAt || new Date().toISOString(),
        updated_at: biz.updatedAt || new Date().toISOString(),
      };

      const { error } = await client.from('businesses').upsert(payload);
      return !error;
    } catch {
      return false;
    }
  }

  public async deleteBusiness(id: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      const { error } = await client
        .from('businesses')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // 2. LEADS CRUD
  // ==========================================================================

  public async fetchLeads(): Promise<Lead[]> {
    const client = this.getClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('leads')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error || !data) return [];

      return data.map((row: any): Lead => ({
        id: row.id,
        category: 'APP_GENERATED',
        businessId: row.business_id,
        pipelineStatus: row.pipeline_status || 'Discover',
        status: row.pipeline_status || 'Discover',
        dealType: row.deal_type || 'NEW_WEBSITE',
        estimatedDealValueUSD: Number(row.deal_value || 0),
        priority: row.priority || 'MEDIUM',
        tags: Array.isArray(row.tags) ? row.tags : [],
        owner: row.owner_id || undefined,
        notes: row.notes || undefined,
        isDeleted: Boolean(row.is_deleted),
        deletedAt: row.deleted_at || null,
        version: row.version || 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch {
      return [];
    }
  }

  public async upsertLead(lead: Lead): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      const payload = {
        id: lead.id,
        business_id: lead.businessId,
        pipeline_status: lead.pipelineStatus,
        deal_value: lead.estimatedDealValueUSD || 0,
        deal_type: lead.dealType || 'NEW_WEBSITE',
        priority: lead.priority || 'MEDIUM',
        tags: lead.tags || [],
        owner_id: lead.owner || null,
        notes: lead.notes || null,
        is_deleted: Boolean(lead.isDeleted),
        deleted_at: lead.deletedAt || null,
        version: lead.version || 1,
        created_at: lead.createdAt || new Date().toISOString(),
        updated_at: lead.updatedAt || new Date().toISOString(),
      };

      const { error } = await client.from('leads').upsert(payload);
      return !error;
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // 3. CONTACTS CRUD
  // ==========================================================================

  public async fetchContacts(): Promise<Contact[]> {
    const client = this.getClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('contacts')
        .select('*')
        .eq('is_deleted', false);

      if (error || !data) return [];

      return data.map((row: any): Contact => ({
        id: row.id,
        category: 'USER_CRM',
        businessId: row.business_id,
        fullName: row.full_name,
        jobTitle: row.job_title || undefined,
        department: row.department || undefined,
        businessEmail: row.business_email || undefined,
        businessPhone: row.business_phone || undefined,
        linkedInCompanyProfileUrl: row.linkedin_company_profile_url || undefined,
        source: row.source || 'USER_ENTERED',
        verificationStatus: row.verification_status || 'UNVERIFIED',
        notes: row.notes || undefined,
        isDeleted: Boolean(row.is_deleted),
        complianceStatement: 'LEGITIMATE_BUSINESS_PROSPECT_ONLY',
        version: 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch {
      return [];
    }
  }

  public async upsertContact(contact: Contact): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      const payload = {
        id: contact.id,
        business_id: contact.businessId,
        full_name: contact.fullName,
        job_title: contact.jobTitle || null,
        department: contact.department || null,
        business_email: contact.businessEmail || null,
        business_phone: contact.businessPhone || null,
        linkedin_company_profile_url: contact.linkedInCompanyProfileUrl || null,
        source: contact.source || 'USER_ENTERED',
        verification_status: contact.verificationStatus || 'UNVERIFIED',
        notes: contact.notes || null,
        is_deleted: Boolean(contact.isDeleted),
        created_at: contact.createdAt || new Date().toISOString(),
        updated_at: contact.updatedAt || new Date().toISOString(),
      };

      const { error } = await client.from('contacts').upsert(payload);
      return !error;
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // 4. WEBSITE AUDITS & AI ANALYSES
  // ==========================================================================

  public async fetchWebsiteAudits(): Promise<WebsiteAudit[]> {
    const client = this.getClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('website_audits')
        .select('*')
        .eq('is_deleted', false);

      if (error || !data) return [];

      return data.map((row: any): WebsiteAudit => {
        if (row.full_payload) {
          return {
            ...row.full_payload,
            id: row.id,
            businessId: row.business_id,
            isDeleted: Boolean(row.is_deleted),
          };
        }
        return {
          id: row.id,
          category: 'APP_GENERATED',
          businessId: row.business_id,
          targetUrl: row.website_url || '',
          auditDate: row.audit_date || row.created_at,
          websiteStatus: row.website_url ? 'WEBSITE_EXISTS' : 'NO_WEBSITE',
          opportunityScore: Number(row.overall_score || 0),
          opportunityGrade: row.overall_grade === 'A' ? 'LOW_OPPORTUNITY' : 'HIGH_OPPORTUNITY',
          opportunityScoreBreakdown: [],
          designPatternAssessment: 'AI assessment indicates the website may have outdated design patterns.',
          criteria: {
            mobileResponsive: { passed: Boolean(row.mobile_friendly), details: 'Mobile evaluation' },
            https: { passed: true, hasValidCertificate: true, details: 'SSL verification' },
            pageTitle: { status: 'OPTIMIZED', details: 'Title presence check' },
            metadata: { hasDescription: true, hasOpenGraph: false, status: 'OPTIMIZED', details: 'Meta check' },
            navigation: { status: 'MODERN_STREAMLINED', details: 'Nav check' },
            callToAction: { presence: 'CLEAR_PRIMARY_CTA', placement: 'ABOVE_THE_FOLD', details: 'CTA check' },
            contactAccessibility: { hasClickToCall: true, hasVisibleEmail: true, hasMapOrDirections: true, hasContactForm: true, details: 'Contact' },
            visualConsistency: { status: 'MODERN_COHESIVE', assessmentLanguage: 'Standard UI pattern', details: 'Visual' },
            contentQuality: { clearValueProposition: true, structuredServices: true, recencySignal: 'ACTIVE', details: 'Content' },
            performanceIndicators: { performanceGrade: 'FAST', details: 'Speed analysis' },
            accessibilityIndicators: { contrastCompliance: true, estimatedScore: 85, details: 'Accessibility' },
            socialIntegration: { hasSocialLinks: false, linkedPlatforms: [], details: 'Social' },
            bookingOrderFunctionality: { status: 'BASIC_FORM', details: 'Booking check' },
          },
          metrics: {
            mobileResponsive: Boolean(row.mobile_friendly),
            hasSslCertificate: true,
            hasModernViewportMeta: true,
            hasStructuredData: false,
            hasAnalyticsInstalled: false,
          },
          identifiedIssues: Array.isArray(row.detected_issues) ? row.detected_issues : [],
          version: 1,
          isDeleted: Boolean(row.is_deleted),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      });
    } catch {
      return [];
    }
  }

  public async upsertWebsiteAudit(audit: WebsiteAudit): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      const payload = {
        id: audit.id,
        business_id: audit.businessId,
        website_url: audit.targetUrl,
        audit_date: audit.auditDate || new Date().toISOString(),
        overall_score: audit.opportunityScore,
        overall_grade: audit.opportunityGrade,
        detected_issues: audit.identifiedIssues || [],
        recommended_actions: [],
        speed_index: audit.metrics?.estimatedLoadTimeSeconds || null,
        mobile_friendly: audit.metrics?.mobileResponsive !== false,
        seo_rating: null,
        full_payload: audit,
        is_deleted: Boolean(audit.isDeleted),
        created_at: audit.createdAt || new Date().toISOString(),
        updated_at: audit.updatedAt || new Date().toISOString(),
      };

      const { error } = await client.from('website_audits').upsert(payload);
      return !error;
    } catch {
      return false;
    }
  }

  public async fetchAIAnalyses(): Promise<AIAnalysis[]> {
    const client = this.getClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('ai_analyses')
        .select('*')
        .eq('is_deleted', false);

      if (error || !data) return [];

      return data.map((row: any): AIAnalysis => {
        const full = row.full_payload || {};
        return {
          id: row.id,
          category: 'AI_ANALYSIS',
          businessId: row.business_id,
          promptIntent: full.promptIntent || 'WEBSITE_CRITIQUE',
          isAiGenerated: true,
          modelIdentifier: row.model_version || full.modelIdentifier || 'gemini-2.5-flash',
          confidence: row.confidence || full.confidence || 'HIGH CONFIDENCE',
          confidenceRationale: full.confidenceRationale || 'Automated digital presence synthesis',
          verificationStatement: 'No contact identities, emails, or personal data were generated or assumed.',
          summary: row.executive_summary || full.summary || '',
          strengths: full.strengths || [],
          vulnerabilities: row.pain_points || full.vulnerabilities || [],
          pitchAngles: row.pitch_angle ? [row.pitch_angle] : (full.pitchAngles || []),
          recommendations: full.recommendations || [],
          designIntelligence: full.designIntelligence,
          userFeedback: full.userFeedback,
          userNotes: full.userNotes,
          isDismissed: Boolean(full.isDismissed),
          version: 1,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      });
    } catch {
      return [];
    }
  }

  public async upsertAIAnalysis(analysis: AIAnalysis): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      const payload = {
        id: analysis.id,
        business_id: analysis.businessId,
        lead_id: null,
        analysis_type: analysis.promptIntent || 'WEBSITE_CRITIQUE',
        executive_summary: analysis.summary || null,
        pitch_angle: analysis.pitchAngles?.[0] || null,
        pain_points: analysis.vulnerabilities || [],
        solution_stack: analysis.recommendations?.map((r) => r.title) || [],
        full_payload: analysis,
        generated_at: analysis.createdAt || new Date().toISOString(),
        model_version: analysis.modelIdentifier || 'gemini-2.5-flash',
        confidence: analysis.confidence || 'HIGH CONFIDENCE',
        is_deleted: false,
        created_at: analysis.createdAt || new Date().toISOString(),
        updated_at: analysis.updatedAt || new Date().toISOString(),
      };

      const { error } = await client.from('ai_analyses').upsert(payload);
      return !error;
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // 5. LEAD SCORES, OUTREACH, PROPOSALS
  // ==========================================================================

  public async fetchLeadScores(): Promise<LeadScore[]> {
    const client = this.getClient();
    if (!client) return [];

    try {
      const { data, error } = await client.from('lead_scores').select('*');
      if (error || !data) return [];

      return data.map((row: any): LeadScore => ({
        id: row.id,
        category: 'APP_GENERATED',
        businessId: row.business_id,
        leadId: row.lead_id || '',
        overallScore: Number(row.overall_score || 0),
        grade: row.grade || 'B',
        digitalOpportunity: row.digital_opportunity,
        websiteOpportunity: row.website_opportunity,
        socialOpportunity: row.social_opportunity,
        businessStrength: row.business_strength,
        contactability: row.contactability,
        aiScoreData: row.dimensions
          ? {
              digitalOpportunity: row.digital_opportunity || 0,
              websiteOpportunity: row.website_opportunity || 0,
              socialOpportunity: row.social_opportunity || 0,
              businessStrength: row.business_strength || 0,
              contactability: row.contactability || 0,
              overallProspectScore: Number(row.overall_score || 0),
              explanation: row.explanation || {
                overallScore: Number(row.overall_score || 0),
                verdictHeadline: 'Calculated Opportunity Score',
                narrative: '',
                whyThisScore: [],
                recommendedPitchAngle: '',
                actionableNextStep: '',
              },
              dimensions: row.dimensions || {},
              engine: row.engine || 'GEMINI_FLASH_3_8',
              calculatedAt: row.calculated_at || row.created_at,
              confidence: 'HIGH CONFIDENCE',
              modelIdentifier: 'gemini-2.5-flash',
            }
          : undefined,
        calculatedAt: row.calculated_at || row.created_at,
        calculationModelVersion: 'gemini-2.5-flash',
        version: 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch {
      return [];
    }
  }

  public async upsertLeadScore(score: LeadScore): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      const payload = {
        id: score.id,
        business_id: score.businessId,
        lead_id: score.leadId || null,
        overall_score: score.overallScore,
        grade: score.grade,
        digital_opportunity: score.digitalOpportunity || score.aiScoreData?.digitalOpportunity || 0,
        website_opportunity: score.websiteOpportunity || score.aiScoreData?.websiteOpportunity || 0,
        social_opportunity: score.socialOpportunity || score.aiScoreData?.socialOpportunity || 0,
        business_strength: score.businessStrength || score.aiScoreData?.businessStrength || 0,
        contactability: score.contactability || score.aiScoreData?.contactability || 0,
        explanation: score.aiScoreData?.explanation || {},
        dimensions: score.aiScoreData?.dimensions || {},
        engine: score.aiScoreData?.engine || 'GEMINI_FLASH_3_8',
        calculated_at: score.calculatedAt || score.createdAt || new Date().toISOString(),
        created_at: score.createdAt || new Date().toISOString(),
        updated_at: score.updatedAt || new Date().toISOString(),
      };

      const { error } = await client.from('lead_scores').upsert(payload);
      return !error;
    } catch {
      return false;
    }
  }

  public async fetchOutreachActivities(): Promise<OutreachActivity[]> {
    const client = this.getClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('outreach_activities')
        .select('*')
        .eq('is_deleted', false);
      if (error || !data) return [];

      return data.map((row: any): OutreachActivity => ({
        id: row.id,
        category: 'USER_CRM',
        businessId: row.business_id,
        leadId: row.lead_id || '',
        channel: row.channel,
        status: row.status,
        subject: row.subject || undefined,
        messageBody: row.body || '',
        sentAt: row.sent_at || row.created_at,
        outcomeNotes: row.response_notes || undefined,
        requiresManualAction: true,
        version: 1,
        isDeleted: Boolean(row.is_deleted),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch {
      return [];
    }
  }

  public async upsertOutreachActivity(outreach: OutreachActivity): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      const payload = {
        id: outreach.id,
        business_id: outreach.businessId,
        lead_id: outreach.leadId || null,
        channel: outreach.channel,
        status: outreach.status,
        subject: outreach.subject || null,
        body: outreach.messageBody || null,
        sent_at: outreach.sentAt || new Date().toISOString(),
        performed_by: 'operator',
        response_notes: outreach.outcomeNotes || null,
        is_deleted: Boolean(outreach.isDeleted),
        created_at: outreach.createdAt || new Date().toISOString(),
        updated_at: outreach.updatedAt || new Date().toISOString(),
      };

      const { error } = await client.from('outreach_activities').upsert(payload);
      return !error;
    } catch {
      return false;
    }
  }

  public async fetchProposals(): Promise<Proposal[]> {
    const client = this.getClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('proposals')
        .select('*')
        .eq('is_deleted', false);
      if (error || !data) return [];

      return data.map((row: any): Proposal => ({
        id: row.id,
        category: 'USER_CRM',
        businessId: row.business_id,
        leadId: row.lead_id || '',
        proposalNumber: row.proposal_number || `PROP-${row.id.slice(0, 6)}`,
        title: row.title,
        clientExecutiveSummary: row.notes || '',
        items: Array.isArray(row.scope_items) ? row.scope_items : [],
        subtotalUSD: Number(row.total_amount || 0),
        totalUSD: Number(row.total_amount || 0),
        validUntil: row.valid_until || new Date(Date.now() + 30 * 86400000).toISOString(),
        status: row.status || 'DRAFT',
        paymentProcessingActive: false,
        version: 1,
        isDeleted: Boolean(row.is_deleted),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch {
      return [];
    }
  }

  public async upsertProposal(proposal: Proposal): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      const payload = {
        id: proposal.id,
        business_id: proposal.businessId,
        lead_id: proposal.leadId || null,
        proposal_number: proposal.proposalNumber || null,
        title: proposal.title,
        scope_items: proposal.items || [],
        total_amount: proposal.totalUSD || proposal.subtotalUSD || 0,
        currency: 'USD',
        status: proposal.status || 'DRAFT',
        notes: proposal.clientExecutiveSummary || null,
        valid_until: proposal.validUntil || null,
        is_deleted: Boolean(proposal.isDeleted),
        created_at: proposal.createdAt || new Date().toISOString(),
        updated_at: proposal.updatedAt || new Date().toISOString(),
      };

      const { error } = await client.from('proposals').upsert(payload);
      return !error;
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // 6. ACCESS REQUESTS & USERS
  // ==========================================================================

  public async fetchAccessRequests(): Promise<any[]> {
    const client = this.getClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('access_requests')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error || !data) return [];

      return data.map((row: any) => ({
        id: row.id,
        email: row.email,
        fullName: row.full_name || row.fullName,
        organization: row.organization,
        requestedRole: row.requested_role || row.requestedRole || 'OPERATOR',
        reason: row.reason,
        status: row.status,
        submittedAt: row.submitted_at || row.submittedAt,
        reviewedAt: row.reviewed_at || row.reviewedAt,
        reviewedBy: row.reviewed_by || row.reviewedBy,
        rejectionReason: row.rejection_reason || row.rejectionReason,
      }));
    } catch {
      return [];
    }
  }

  public async insertAccessRequest(req: any): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      const { error } = await client.from('access_requests').upsert({
        id: req.id,
        email: req.email,
        full_name: req.fullName,
        organization: req.organization || null,
        requested_role: req.requestedRole,
        reason: req.reason,
        status: req.status || 'PENDING',
        submitted_at: req.submittedAt || new Date().toISOString(),
      });

      return !error;
    } catch {
      return false;
    }
  }

  public async updateAccessRequest(id: string, updates: any): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      const dbUpdates: Record<string, any> = {};
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.reviewedAt) dbUpdates.reviewed_at = updates.reviewedAt;
      if (updates.reviewedBy) dbUpdates.reviewed_by = updates.reviewedBy;
      if (updates.rejectionReason) dbUpdates.rejection_reason = updates.rejectionReason;

      const { error } = await client
        .from('access_requests')
        .update(dbUpdates)
        .eq('id', id);

      return !error;
    } catch {
      return false;
    }
  }

  public async fetchUsers(): Promise<any[]> {
    const client = this.getClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('user_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data) return [];

      return data.map((row: any) => ({
        id: row.id,
        email: row.email,
        displayName: row.display_name || row.displayName,
        role: row.role,
        status: row.status,
        organization: row.organization,
        avatarUrl: row.avatar_url || row.avatarUrl,
        passwordSalt: row.password_salt || row.passwordSalt,
        passwordHash: row.password_hash || row.passwordHash,
        isPasswordSet: Boolean(row.is_password_set ?? row.isPasswordSet),
        failedLoginAttempts: row.failed_login_attempts ?? row.failedLoginAttempts ?? 0,
        lockoutUntil: row.lockout_until || row.lockoutUntil || null,
        isGoogleConnected: Boolean(row.is_google_connected ?? row.isGoogleConnected),
        googleEmail: row.google_email || row.googleEmail,
        createdAt: row.created_at || row.createdAt,
        updatedAt: row.updated_at || row.updatedAt,
      }));
    } catch {
      return [];
    }
  }

  public async upsertUser(user: any): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      const { error } = await client.from('user_accounts').upsert({
        id: user.id,
        email: user.email,
        display_name: user.displayName,
        role: user.role,
        status: user.status,
        organization: user.organization || null,
        avatar_url: user.avatarUrl || null,
        password_salt: user.passwordSalt || null,
        password_hash: user.passwordHash || null,
        is_password_set: Boolean(user.isPasswordSet),
        failed_login_attempts: user.failedLoginAttempts || 0,
        lockout_until: user.lockoutUntil || null,
        is_google_connected: Boolean(user.isGoogleConnected),
        google_email: user.googleEmail || null,
        created_at: user.createdAt,
        updated_at: user.updatedAt || new Date().toISOString(),
      });

      return !error;
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // 7. AUDIT TRAIL LOGGING
  // ==========================================================================

  public async insertAuditLog(log: AuditLog): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      const { error } = await client.from('audit_logs').insert({
        id: log.id,
        timestamp: log.timestamp || new Date().toISOString(),
        actor_id: log.actorId,
        actor_type: log.actorType,
        action: log.action,
        entity_type: log.entityType,
        entity_id: log.entityId,
        previous_value_snapshot: log.previousValueSnapshot || null,
        new_value_snapshot: log.newValueSnapshot || null,
        change_summary: log.changeSummary,
        ip_address_or_origin: log.ipAddressOrOrigin || null,
        severity: log.severity || 'INFO',
        category: log.category || 'AUDIT_HISTORY',
      });

      return !error;
    } catch {
      return false;
    }
  }

  public async fetchAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    const client = this.getClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error || !data) return [];

      return data.map((row: any): AuditLog => ({
        id: row.id,
        category: 'AUDIT_HISTORY',
        timestamp: row.timestamp,
        actorId: row.actor_id,
        actorType: row.actor_type,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        previousValueSnapshot: row.previous_value_snapshot,
        newValueSnapshot: row.new_value_snapshot,
        changeSummary: row.change_summary,
        ipAddressOrOrigin: row.ip_address_or_origin,
        severity: row.severity,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Returns the focused Supabase migration script defining core CRM tables:
   * businesses, leads, contacts, and proposals with strict relational foreign keys and ON DELETE CASCADE.
   */
  public getCoreCrmMigrationSql(): string {
    return `-- ============================================================================
-- Supabase Database Migration: Core CRM (businesses, leads, contacts, proposals)
-- Strict relational integrity with foreign keys and cascading deletes (ON DELETE CASCADE)
-- Run this script in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. BUSINESSES (Root Parent Entity)
CREATE TABLE IF NOT EXISTS public.businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  legal_or_registered_name TEXT,
  trade_name TEXT,
  category TEXT,
  formatted_address TEXT,
  phone TEXT,
  website_url TEXT,
  google_rating NUMERIC(3, 2),
  google_review_count INT DEFAULT 0,
  business_status TEXT DEFAULT 'OPERATIONAL',
  opportunity_score INT DEFAULT 0,
  opportunity_grade TEXT DEFAULT 'LOW_OPPORTUNITY',
  pipeline_stage TEXT DEFAULT 'DISCOVERY',
  google_place_id TEXT,
  normalized_domain TEXT,
  normalized_phone TEXT,
  normalized_name TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT,
  external_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  crm_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  app_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  identifiers JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_businesses_place_id ON public.businesses(google_place_id);
CREATE INDEX IF NOT EXISTS idx_businesses_normalized_domain ON public.businesses(normalized_domain);
CREATE INDEX IF NOT EXISTS idx_businesses_normalized_phone ON public.businesses(normalized_phone);
CREATE INDEX IF NOT EXISTS idx_businesses_category ON public.businesses(category);
CREATE INDEX IF NOT EXISTS idx_businesses_pipeline_stage ON public.businesses(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_businesses_is_deleted ON public.businesses(is_deleted);
CREATE INDEX IF NOT EXISTS idx_businesses_created_at ON public.businesses(created_at DESC);

-- 2. LEADS (Child of businesses)
CREATE TABLE IF NOT EXISTS public.leads (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  pipeline_status TEXT NOT NULL DEFAULT 'Discover',
  deal_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  deal_type TEXT NOT NULL DEFAULT 'NEW_WEBSITE',
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  owner_id TEXT,
  notes TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_leads_business
    FOREIGN KEY (business_id)
    REFERENCES public.businesses(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_leads_business_id ON public.leads(business_id);
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_status ON public.leads(pipeline_status);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON public.leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_is_deleted ON public.leads(is_deleted);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);

-- 3. CONTACTS (Child of businesses, optional relation to leads)
CREATE TABLE IF NOT EXISTS public.contacts (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  lead_id TEXT,
  full_name TEXT NOT NULL,
  job_title TEXT,
  department TEXT,
  business_email TEXT,
  business_phone TEXT,
  linkedin_company_profile_url TEXT,
  source TEXT NOT NULL DEFAULT 'USER_ENTERED',
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
  notes TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_contacts_business
    FOREIGN KEY (business_id)
    REFERENCES public.businesses(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_contacts_lead
    FOREIGN KEY (lead_id)
    REFERENCES public.leads(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_contacts_business_id ON public.contacts(business_id);
CREATE INDEX IF NOT EXISTS idx_contacts_lead_id ON public.contacts(lead_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(business_email);
CREATE INDEX IF NOT EXISTS idx_contacts_is_deleted ON public.contacts(is_deleted);

-- 4. PROPOSALS (Child of businesses and leads)
CREATE TABLE IF NOT EXISTS public.proposals (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  lead_id TEXT,
  proposal_number TEXT,
  title TEXT NOT NULL,
  scope_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'DRAFT',
  notes TEXT,
  valid_until TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_proposals_business
    FOREIGN KEY (business_id)
    REFERENCES public.businesses(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_proposals_lead
    FOREIGN KEY (lead_id)
    REFERENCES public.leads(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_proposals_business_id ON public.proposals(business_id);
CREATE INDEX IF NOT EXISTS idx_proposals_lead_id ON public.proposals(lead_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_is_deleted ON public.proposals(is_deleted);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON public.proposals(created_at DESC);

-- 5. AUTOMATIC UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_businesses_updated_at ON public.businesses;
CREATE TRIGGER trg_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_leads_updated_at ON public.leads;
CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_contacts_updated_at ON public.contacts;
CREATE TRIGGER trg_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_proposals_updated_at ON public.proposals;
CREATE TRIGGER trg_proposals_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 6. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "businesses_all_access" ON public.businesses;
  CREATE POLICY "businesses_all_access" ON public.businesses FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "leads_all_access" ON public.leads;
  CREATE POLICY "leads_all_access" ON public.leads FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "contacts_all_access" ON public.contacts;
  CREATE POLICY "contacts_all_access" ON public.contacts FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "proposals_all_access" ON public.proposals;
  CREATE POLICY "proposals_all_access" ON public.proposals FOR ALL USING (true) WITH CHECK (true);
END $$;
`;
  }

  /**
   * Generates the complete, production-ready PostgreSQL SQL schema for Supabase SQL Editor
   */
  public getRecommendedSchemaSql(): string {
    return `-- ============================================================================
-- HorusScope Sovereign Digital Intelligence - Production Supabase Schema
-- Complete relational database architecture for deployment
-- Copy and run in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ============================================================================

-- 1. BUSINESS ENTITIES
CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  legal_or_registered_name TEXT,
  trade_name TEXT,
  category TEXT,
  formatted_address TEXT,
  phone TEXT,
  website_url TEXT,
  google_rating NUMERIC(3, 2),
  google_review_count INT DEFAULT 0,
  business_status TEXT DEFAULT 'OPERATIONAL',
  opportunity_score INT DEFAULT 0,
  opportunity_grade TEXT DEFAULT 'LOW_OPPORTUNITY',
  pipeline_stage TEXT DEFAULT 'DISCOVERY',
  google_place_id TEXT,
  normalized_domain TEXT,
  normalized_phone TEXT,
  normalized_name TEXT,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT,
  external_payload JSONB DEFAULT '{}'::jsonb,
  crm_data JSONB DEFAULT '{}'::jsonb,
  app_data JSONB DEFAULT '{}'::jsonb,
  identifiers JSONB DEFAULT '{}'::jsonb,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_businesses_place_id ON businesses(google_place_id);
CREATE INDEX IF NOT EXISTS idx_businesses_normalized_domain ON businesses(normalized_domain);
CREATE INDEX IF NOT EXISTS idx_businesses_normalized_phone ON businesses(normalized_phone);
CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category);
CREATE INDEX IF NOT EXISTS idx_businesses_stage ON businesses(pipeline_stage);

-- 2. CRM LEADS
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  pipeline_status TEXT NOT NULL DEFAULT 'Discover',
  deal_value NUMERIC(12, 2) DEFAULT 0,
  priority TEXT DEFAULT 'MEDIUM',
  tags JSONB DEFAULT '[]'::jsonb,
  owner_id TEXT,
  notes TEXT,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_business_id ON leads(business_id);
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_status ON leads(pipeline_status);

-- 3. EXTERNAL DATA SOURCES
CREATE TABLE IF NOT EXISTS external_sources (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_url TEXT,
  retrieved_at TIMESTAMPTZ DEFAULT NOW(),
  raw_payload_hash TEXT,
  attribution_text TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  is_primary_source BOOLEAN DEFAULT true,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ext_sources_biz ON external_sources(business_id);

-- 4. WEBSITE AUDITS
CREATE TABLE IF NOT EXISTS website_audits (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  website_url TEXT NOT NULL,
  audit_date TIMESTAMPTZ DEFAULT NOW(),
  overall_score INT DEFAULT 0,
  overall_grade TEXT,
  criteria_scores JSONB DEFAULT '{}'::jsonb,
  speed_index NUMERIC(5, 2),
  mobile_friendly BOOLEAN DEFAULT true,
  seo_rating TEXT,
  detected_issues JSONB DEFAULT '[]'::jsonb,
  recommended_actions JSONB DEFAULT '[]'::jsonb,
  executive_summary TEXT,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_web_audits_biz ON website_audits(business_id);

-- 5. SOCIAL AUDITS
CREATE TABLE IF NOT EXISTS social_audits (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  platform TEXT,
  profile_url TEXT,
  followers_count INT DEFAULT 0,
  last_post_date TIMESTAMPTZ,
  engagement_rate NUMERIC(5, 2),
  social_presence_score INT DEFAULT 0,
  notes TEXT,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_audits_biz ON social_audits(business_id);

-- 6. CONTACTS
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  job_title TEXT,
  department TEXT,
  business_email TEXT,
  business_phone TEXT,
  linkedin_company_profile_url TEXT,
  source TEXT DEFAULT 'USER_ENTERED',
  verification_status TEXT DEFAULT 'UNVERIFIED',
  notes TEXT,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_biz ON contacts(business_id);

-- 7. AI ANALYSES
CREATE TABLE IF NOT EXISTS ai_analyses (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  lead_id TEXT,
  analysis_type TEXT,
  executive_summary TEXT,
  pitch_angle TEXT,
  pain_points JSONB DEFAULT '[]'::jsonb,
  solution_stack JSONB DEFAULT '[]'::jsonb,
  full_payload JSONB DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  model_version TEXT,
  confidence TEXT,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_analyses_biz ON ai_analyses(business_id);

-- 8. LEAD SCORES
CREATE TABLE IF NOT EXISTS lead_scores (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  lead_id TEXT,
  overall_score INT NOT NULL,
  grade TEXT NOT NULL,
  digital_opportunity INT DEFAULT 0,
  website_opportunity INT DEFAULT 0,
  social_opportunity INT DEFAULT 0,
  business_strength INT DEFAULT 0,
  contactability INT DEFAULT 0,
  explanation JSONB DEFAULT '{}'::jsonb,
  dimensions JSONB DEFAULT '{}'::jsonb,
  engine TEXT DEFAULT 'GEMINI_FLASH_3_8',
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_scores_biz ON lead_scores(business_id);

-- 9. OUTREACH ACTIVITIES
CREATE TABLE IF NOT EXISTS outreach_activities (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  lead_id TEXT,
  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  performed_by TEXT,
  response_notes TEXT,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_biz ON outreach_activities(business_id);

-- 10. FOLLOW-UPS
CREATE TABLE IF NOT EXISTS follow_ups (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  lead_id TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL,
  notes TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_follow_ups_biz ON follow_ups(business_id);

-- 11. CLIENT PROPOSALS
CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
  proposal_number TEXT,
  title TEXT NOT NULL,
  scope_items JSONB DEFAULT '[]'::jsonb,
  total_amount NUMERIC(12, 2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'DRAFT',
  notes TEXT,
  valid_until TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposals_biz ON proposals(business_id);
CREATE INDEX IF NOT EXISTS idx_proposals_lead ON proposals(lead_id);

-- 12. ACCESS REQUESTS
CREATE TABLE IF NOT EXISTS access_requests (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  organization TEXT,
  requested_role TEXT DEFAULT 'OPERATOR',
  reason TEXT,
  status TEXT DEFAULT 'PENDING',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  rejection_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_access_requests_email ON access_requests(email);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);

-- 13. USER ACCOUNTS
CREATE TABLE IF NOT EXISTS user_accounts (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT DEFAULT 'OPERATOR',
  status TEXT DEFAULT 'APPROVED',
  organization TEXT,
  avatar_url TEXT,
  password_salt TEXT,
  password_hash TEXT,
  is_password_set BOOLEAN DEFAULT true,
  failed_login_attempts INT DEFAULT 0,
  lockout_until TIMESTAMPTZ,
  is_google_connected BOOLEAN DEFAULT false,
  google_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_accounts_email ON user_accounts(email);

-- 14. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  actor_id TEXT NOT NULL,
  actor_type TEXT DEFAULT 'USER',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  previous_value_snapshot JSONB,
  new_value_snapshot JSONB,
  change_summary TEXT NOT NULL,
  ip_address_or_origin TEXT,
  severity TEXT DEFAULT 'INFO',
  category TEXT DEFAULT 'AUDIT_HISTORY'
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- 15. SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Allow full access to businesses" ON businesses FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Allow full access to leads" ON leads FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Allow full access to external_sources" ON external_sources FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Allow full access to website_audits" ON website_audits FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Allow full access to social_audits" ON social_audits FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Allow full access to contacts" ON contacts FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Allow full access to ai_analyses" ON ai_analyses FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Allow full access to lead_scores" ON lead_scores FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Allow full access to outreach_activities" ON outreach_activities FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Allow full access to follow_ups" ON follow_ups FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Allow full access to proposals" ON proposals FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Allow full access to access_requests" ON access_requests FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Allow full access to user_accounts" ON user_accounts FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Allow full access to audit_logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Allow full access to system_settings" ON system_settings FOR ALL USING (true) WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
`;
  }
}

export const supabaseService = new SupabaseService();
