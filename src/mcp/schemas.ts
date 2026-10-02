/**
 * Model Context Protocol (MCP) - Registered Schemas & Definitions
 * Tools, Resources, and Prompts Catalog
 */

import {
  MCPToolDefinition,
  MCPResourceDefinition,
  MCPPromptDefinition,
} from './types';

// ============================================================================
// REGISTERED MCP TOOLS
// ============================================================================

export const MCP_REGISTERED_TOOLS: MCPToolDefinition[] = [
  {
    name: 'places_discover',
    description:
      'Discovers commercial entities within a geographical locality using Google Places API (New) searchText endpoint. Enforces coordinate bounds, category normalization, and rate limits.',
    inputSchema: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'Target city, municipality, or district (e.g., "Cebu City", "Makati, Manila").',
        },
        category: {
          type: 'string',
          description: 'Business classification category (e.g., "Restaurants", "Dentists", "Lawyers").',
          default: 'Restaurants',
        },
        keyword: {
          type: 'string',
          description: 'Specific search keyword or specialty (e.g., "Italian", "Orthodontics").',
        },
        pageSize: {
          type: 'number',
          description: 'Number of results to retrieve per page (1-20).',
          minimum: 1,
          maximum: 20,
          default: 10,
        },
        pageToken: {
          type: 'string',
          description: 'Continuation token for pagination.',
        },
        forceSandbox: {
          type: 'boolean',
          description: 'Force execution in isolated diagnostic sandbox mode to conserve live API quota.',
          default: false,
        },
      },
      required: ['location'],
      additionalProperties: false,
    },
    annotations: {
      category: 'discovery',
      targetApi: 'Google Places API New',
      readOnly: true,
      requiresAuth: true,
      allowedRoles: ['OWNER', 'ADMIN', 'OPERATOR'],
      rateLimitPerMinute: 30,
      cacheTtlMs: 900000, // 15-minute deduplication cache
    },
  },
  {
    name: 'intelligence_audit_website',
    description:
      'Performs an in-depth 13-criteria digital presence & website UX audit on a target business. Uses Gemini AI with non-speculative phrasing guardrails.',
    inputSchema: {
      type: 'object',
      properties: {
        businessName: {
          type: 'string',
          description: 'Official legal or trading name of the business.',
        },
        websiteUrl: {
          type: 'string',
          description: 'Website URL to audit. Leave empty or "none" if no website was detected.',
        },
        category: {
          type: 'string',
          description: 'Industry or commercial niche of the subject entity.',
        },
        rating: {
          type: 'number',
          description: 'Google Maps customer rating (1.0 to 5.0).',
        },
        reviewCount: {
          type: 'number',
          description: 'Total number of online customer reviews.',
        },
        businessId: {
          type: 'string',
          description: 'Associated CRM entity identifier if evaluating an existing lead.',
        },
      },
      required: ['businessName'],
      additionalProperties: false,
    },
    annotations: {
      category: 'intelligence',
      targetApi: 'Gemini 2.5 Flash',
      readOnly: true,
      requiresAuth: true,
      allowedRoles: ['OWNER', 'ADMIN', 'OPERATOR'],
      rateLimitPerMinute: 15,
      cacheTtlMs: 1800000, // 30-minute deduplication cache
    },
  },
  {
    name: 'intelligence_score_lead',
    description:
      'Calculates an objective, multi-factor Opportunity Score (0-100) and Opportunity Grade (High/Medium/Low) for digital transformation viability.',
    inputSchema: {
      type: 'object',
      properties: {
        businessName: {
          type: 'string',
          description: 'Name of the business.',
        },
        hasWebsite: {
          type: 'boolean',
          description: 'Whether the business possesses an active, owned website.',
        },
        rating: {
          type: 'number',
          description: 'Public star rating.',
        },
        reviewCount: {
          type: 'number',
          description: 'Number of public reviews.',
        },
        category: {
          type: 'string',
          description: 'Business category or industry vertical.',
        },
        phoneAvailable: {
          type: 'boolean',
          description: 'Whether a direct phone number is listed.',
        },
      },
      required: ['businessName', 'hasWebsite'],
      additionalProperties: false,
    },
    annotations: {
      category: 'intelligence',
      targetApi: 'Enterprise Vault',
      readOnly: true,
      requiresAuth: false,
      rateLimitPerMinute: 60,
      cacheTtlMs: 300000,
    },
  },
  {
    name: 'crm_read_businesses',
    description:
      'Queries the server-side business registry populated by live Places discovery (name, address, rating, opportunity score). Supports text search with limit.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search string matching business name, address, or category.',
        },
        limit: {
          type: 'number',
          description: 'Maximum records to return (1-50).',
          default: 20,
        },
        includeArchived: {
          type: 'boolean',
          description: 'Whether to include soft-deleted or archived leads.',
          default: false,
        },
      },
      additionalProperties: false,
    },
    annotations: {
      category: 'crm',
      targetApi: 'Enterprise Vault',
      readOnly: true,
      requiresAuth: true,
      allowedRoles: ['OWNER', 'ADMIN', 'OPERATOR', 'VIEWER'],
      rateLimitPerMinute: 120,
    },
  },
  {
    name: 'system_health_check',
    description:
      'Inspects live backend API status, rate limit consumption, security feature locks, and upstream cloud connectivity.',
    inputSchema: {
      type: 'object',
      properties: {
        detailed: {
          type: 'boolean',
          description: 'Include detailed rate-limit breakdown and feature lock flags.',
          default: true,
        },
      },
      additionalProperties: false,
    },
    annotations: {
      category: 'system',
      targetApi: 'System Internal',
      readOnly: true,
      requiresAuth: false,
      rateLimitPerMinute: 120,
      cacheTtlMs: 10000,
    },
  },
];

// ============================================================================
// REGISTERED MCP RESOURCES
// ============================================================================

export const MCP_REGISTERED_RESOURCES: MCPResourceDefinition[] = [
  {
    uri: 'horusscope://system/health',
    name: 'System Health & Connectivity Status',
    description: 'Real-time connectivity status of Google Places, Gemini AI, local storage, and database persistence.',
    mimeType: 'application/json',
  },
  {
    uri: 'horusscope://system/locks',
    name: 'System Governance & Feature Locks',
    description: 'Immutable regulatory and ethical safety locks (e.g., prohibition on HTML scraping and automated spam).',
    mimeType: 'application/json',
  },
  {
    uri: 'horusscope://mcp/metrics',
    name: 'MCP Gateway Performance & Rate Limits',
    description: 'Active MCP proxy metrics, cache hit ratios, pre-call security inspections, and quota telemetry.',
    mimeType: 'application/json',
  },
  {
    uri: 'horusscope://access/requests',
    name: 'Pending Access Requests Registry',
    description: 'Summary of user access requests pending review and approval by system administrators.',
    mimeType: 'application/json',
  },
];

// ============================================================================
// REGISTERED MCP PROMPTS
// ============================================================================

export const MCP_REGISTERED_PROMPTS: MCPPromptDefinition[] = [
  {
    name: 'website_intelligence_audit',
    description:
      'Generates a professional, cautious, non-speculative digital audit examining mobile responsiveness, SSL, conversion paths, and UX design patterns.',
    arguments: [
      { name: 'businessName', description: 'Name of the business', required: true },
      { name: 'websiteUrl', description: 'URL of the target site', required: true },
      { name: 'category', description: 'Industry or niche', required: false },
    ],
  },
  {
    name: 'client_proposal_generator',
    description:
      'Drafts a non-aggressive, value-driven web transformation proposal based on identified audit weaknesses.',
    arguments: [
      { name: 'businessName', description: 'Name of prospective client', required: true },
      { name: 'opportunityScore', description: 'Calculated Opportunity Score (0-100)', required: true },
      { name: 'keyWeaknesses', description: 'Bullet list of identified technical gaps', required: true },
    ],
  },
];
