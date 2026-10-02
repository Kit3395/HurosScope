/**
 * Model Context Protocol (MCP) - Core Type Definitions
 * Specification Version: 2024-11-05
 * 
 * Standardized interfaces for JSON-RPC 2.0 transport, tool definitions,
 * resources, prompts, pre-call governance, and execution envelopes.
 */

// ============================================================================
// JSON-RPC 2.0 PROTOCOL TYPES
// ============================================================================

export interface JSONRPCRequest<T = Record<string, unknown>> {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: T;
}

export interface JSONRPCResponse<T = unknown> {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: T;
  error?: JSONRPCError;
}

export interface JSONRPCError {
  code: number;
  message: string;
  data?: unknown;
}

export const MCP_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  // MCP Custom Domain Codes
  UNAUTHORIZED: -32001,
  RATE_LIMIT_EXCEEDED: -32002,
  POLICY_VIOLATION: -32003,
  CIRCUIT_BREAKER_OPEN: -32004,
  UPSTREAM_API_ERROR: -32005,
} as const;

// ============================================================================
// MCP TOOL SPECIFICATION
// ============================================================================

export interface JSONSchemaProperty {
  type: string;
  description?: string;
  enum?: string[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  items?: JSONSchemaProperty;
}

export interface JSONSchema {
  type: 'object';
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  annotations?: {
    category: 'discovery' | 'intelligence' | 'crm' | 'system';
    targetApi: 'Google Places API New' | 'Gemini 2.5 Flash' | 'Enterprise Vault' | 'System Internal';
    readOnly?: boolean;
    requiresAuth?: boolean;
    allowedRoles?: ('OWNER' | 'ADMIN' | 'OPERATOR' | 'VIEWER')[];
    rateLimitPerMinute?: number;
    cacheTtlMs?: number;
  };
}

export interface MCPToolCallParams {
  name: string;
  arguments?: Record<string, unknown>;
}

export interface MCPContentBlock {
  type: 'text' | 'json';
  text?: string;
  data?: unknown;
}

export interface MCPToolCallResult {
  content: MCPContentBlock[];
  isError?: boolean;
  metadata?: {
    toolName: string;
    targetApi: string;
    durationMs: number;
    cached: boolean;
    timestamp: string;
    correlationId: string;
    quotaUsed?: number;
  };
}

// ============================================================================
// MCP RESOURCE SPECIFICATION
// ============================================================================

export interface MCPResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export interface MCPResourceContent {
  uri: string;
  mimeType: string;
  text?: string;
  blob?: string;
}

// ============================================================================
// MCP PROMPT SPECIFICATION
// ============================================================================

export interface MCPPromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface MCPPromptDefinition {
  name: string;
  description: string;
  arguments?: MCPPromptArgument[];
}

export interface MCPPromptMessage {
  role: 'user' | 'assistant' | 'system';
  content: {
    type: 'text';
    text: string;
  };
}

// ============================================================================
// MCP PRE-CALL GOVERNANCE CONTEXT & METRICS
// ============================================================================

export interface MCPCallContext {
  callerRole?: 'OWNER' | 'ADMIN' | 'OPERATOR' | 'VIEWER' | 'SYSTEM';
  userId?: string;
  userEmail?: string;
  ip?: string;
  userAgent?: string;
  correlationId?: string;
  skipCache?: boolean;
}

export interface MCPGovernanceCheckResult {
  allowed: boolean;
  blockedReason?: string;
  errorCode?: number;
  remediation?: string;
}

export interface MCPGatewayMetrics {
  serverStartTime: string;
  protocolVersion: string;
  totalRequestsIntercepted: number;
  toolCallsCount: number;
  resourceReadsCount: number;
  cacheHitsCount: number;
  rateLimitsTriggered: number;
  policyViolationsCount: number;
  upstreamErrorsCount: number;
  averageLatencyMs: number;
  toolsRegistered: number;
  resourcesRegistered: number;
  promptsRegistered: number;
  activeRateLimits: {
    toolName: string;
    callsThisMinute: number;
    limit: number;
    resetInSeconds: number;
  }[];
}
