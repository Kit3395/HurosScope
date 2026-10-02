/**
 * HorusScope - System Configuration & Safety Policies
 * Phase 0: Technical Architecture & Foundation
 */

export const SYSTEM_METADATA = {
  appName: 'HORUSCOPE',
  phase: 'Phase 3: Business Discovery',
  description: 'Official Google Places API discovery, strict data layer segregation, multi-signal deduplication, and CRM lead intelligence platform.',
  version: '0.3.0-discovery',
  author: 'Web Design & Digital Marketing Acquisition Architecture',
} as const;

/**
 * Architectural Constraints & Safety Locks.
 * These flags are strictly enforced across all services.
 */
export const PHASE_0_FEATURE_LOCKS = {
  // Discovery locks - Business Discovery Activated via Official Google Places API (New)
  ENABLE_GOOGLE_MAPS_DISCOVERY: true,  // Enabled in via Official Places API (New)
  ENABLE_HTML_MAPS_SCRAPING: false,    // Permanently Forbidden (Official APIs only, no scraping)
  ENABLE_BULK_SCRAPING: false,         // Permanently Forbidden (No bulk scraping)

  // Outreach & Contact locks
  ENABLE_AUTOMATED_OUTREACH: false,    // Strictly manual draft review only
  ENABLE_CONTACT_HARVESTING: false,    // Forbidden in (Strict source verification required)

  // Financial locks
  ENABLE_PAYMENT_PROCESSING: false,    // Forbidden in Phase 3

  // Data safety locks
  ALLOW_SILENT_OVERWRITE: false,       // Always reject silent overwrites
  ENABLE_SOFT_DELETION: true,          // Enforce soft deletion
  ENFORCE_RATE_LIMITING: true,         // Always enforce client & server rate limiting
  ENFORCE_AUDIT_LOGGING: true,         // All modifications must emit an audit entry
} as const;

/**
 * Rate Limiting Policies (Rate-Limit Awareness)
 * Configured to prevent API thrashing, infinite retry loops, and rapid cycle calls.
 */
export const RATE_LIMIT_CONFIG = {
  googlePlacesApi: {
    maxRequestsPerMinute: 60,
    burstLimit: 10,
    cooldownMs: 2000,
    dailyCap: 1000,
  },
  geminiAiApi: {
    maxRequestsPerMinute: 15,
    burstLimit: 3,
    cooldownMs: 4000,
    dailyCap: 500,
  },
  websiteAuditApi: {
    maxRequestsPerMinute: 20,
    burstLimit: 4,
    cooldownMs: 3000,
    dailyCap: 250,
  },
  maxRetryAttempts: 3,                 // Cap retry protection at 3 (prevents infinite loops)
  initialRetryDelayMs: 1000,           // 1 second base backoff
  backoffMultiplier: 2,                // Exponential backoff factor
} as const;

/**
 * AI Safety Directives
 * AI must be treated as an analytical assistant, not an authoritative source.
 */
export const AI_SAFETY_POLICIES = {
  fallbackUnverifiedString: 'Not verified',
  prohibitedFabrications: [
    'business_owner_name',
    'contact_person_name',
    'email_address',
    'phone_number',
    'website_url',
    'social_media_account',
    'business_relationship',
    'company_financial_record',
  ],
  allowedConfidenceLevels: [
    'HIGH CONFIDENCE',
    'MEDIUM CONFIDENCE',
    'LOW CONFIDENCE',
    'UNVERIFIED',
  ] as const,
  systemDirective: `You are an analytical assistant for HORUSCOPE.
NEVER fabricate business owners, contact persons, email addresses, phone numbers, websites, or social media handles.
The system should never guess an owner. If no verified decision-maker is identified, AI should output "No verified decision-maker identified."
If any piece of business data or contact information is unconfirmed, strictly return "Not verified" or "Needs Research".
Provide clear confidence ratings and technical explanations for your design critiques and website assessments.`,
} as const;

/**
 * Privacy Safety Guidelines
 * Storing passwords, financial credentials, government IDs, or sensitive private info is rejected.
 */
export const PRIVACY_POLICIES = {
  prohibitedDataFields: [
    'password',
    'passcode',
    'credit_card',
    'cvv',
    'bank_account_number',
    'routing_number',
    'ssn',
    'social_security',
    'passport_number',
    'driver_license',
    'medical_record',
    'private_home_address',
  ],
  allowedContactTypes: [
    'PUBLIC_COMPANY_WEBSITE',
    'DIRECT_INQUIRY',
    'BUSINESS_CARD',
    'OFFICIAL_REGISTRATION',
    'USER_ENTERED',
  ] as const,
} as const;
