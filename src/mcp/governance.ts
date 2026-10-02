/**
 * Model Context Protocol (MCP) - Pre-Call Governance Layer
 * 
 * Intercepts every tool request BEFORE dispatch to external APIs:
 * 1. JSON Schema Validation
 * 2. Role-Based Access Control (RBAC)
 * 3. Sovereign System Lock Verification
 * 4. Per-Tool Rate Limiting & Quotas
 * 5. Deduplication & In-Memory Response Caching
 * 6. Audit Logging & Metrics Telemetry
 */

import {
  MCPToolDefinition,
  MCPCallContext,
  MCPGovernanceCheckResult,
  MCP_ERROR_CODES,
  MCPGatewayMetrics,
} from './types';
import { MCP_REGISTERED_TOOLS, MCP_REGISTERED_RESOURCES, MCP_REGISTERED_PROMPTS } from './schemas';

interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttlMs: number;
}

interface RateLimitTracker {
  count: number;
  resetTime: number;
  limit: number;
}

export class MCPGovernanceEngine {
  private cache = new Map<string, CacheEntry>();
  private rateLimits = new Map<string, RateLimitTracker>();
  private serverStartTime = new Date().toISOString();

  // Telemetry metrics
  private totalRequestsIntercepted = 0;
  private toolCallsCount = 0;
  private resourceReadsCount = 0;
  private cacheHitsCount = 0;
  private rateLimitsTriggered = 0;
  private policyViolationsCount = 0;
  private upstreamErrorsCount = 0;
  private latencySamples: number[] = [];

  /**
   * Generates a stable deterministic hash key for an argument payload
   */
  private generateCacheKey(toolName: string, args: Record<string, unknown>): string {
    const sortedKeys = Object.keys(args).sort();
    const normalized: Record<string, unknown> = {};
    for (const k of sortedKeys) {
      const val = args[k];
      if (val !== undefined && val !== null) {
        normalized[k] = typeof val === 'string' ? val.trim().toLowerCase() : val;
      }
    }
    return `mcp_cache:${toolName}:${JSON.stringify(normalized)}`;
  }

  /**
   * Performs Pre-Call Interception & Governance Checks
   */
  public preflightCheck(
    tool: MCPToolDefinition,
    args: Record<string, unknown>,
    context: MCPCallContext = {}
  ): MCPGovernanceCheckResult {
    this.totalRequestsIntercepted++;

    // 1. SYSTEM SAFETY LOCKS: Strictly enforce policy boundaries
    if (tool.name === 'places_discover' && args.keyword) {
      const kw = String(args.keyword).toLowerCase();
      if (kw.includes('scrape') || kw.includes('bulk_harvest') || kw.includes('bypass_limits')) {
        this.policyViolationsCount++;
        return {
          allowed: false,
          errorCode: MCP_ERROR_CODES.POLICY_VIOLATION,
          blockedReason: 'Policy Violation: Unsolicited bulk scraping or harvester patterns are permanently locked.',
          remediation: 'Utilize verified targeted business discovery queries within authorized rate ceilings.',
        };
      }
    }

    // 2. AUTHORIZATION & RBAC VERIFICATION
    if (tool.annotations?.requiresAuth) {
      const callerRole = context.callerRole || 'OPERATOR'; // Default workspace role
      const allowedRoles = tool.annotations.allowedRoles || ['OWNER', 'ADMIN', 'OPERATOR'];
      if (!allowedRoles.includes(callerRole as any)) {
        this.policyViolationsCount++;
        return {
          allowed: false,
          errorCode: MCP_ERROR_CODES.UNAUTHORIZED,
          blockedReason: `Access Denied: Tool '${tool.name}' requires authorization as [${allowedRoles.join(', ')}]. Caller is '${callerRole}'.`,
          remediation: 'Authenticate with an administrative account or request elevated permissions.',
        };
      }
    }

    // 3. SCHEMA VALIDATION
    const schema = tool.inputSchema;
    if (schema.required) {
      for (const requiredField of schema.required) {
        if (args[requiredField] === undefined || args[requiredField] === null || args[requiredField] === '') {
          return {
            allowed: false,
            errorCode: MCP_ERROR_CODES.INVALID_PARAMS,
            blockedReason: `Schema Validation Error: Required parameter '${requiredField}' is missing for tool '${tool.name}'.`,
            remediation: `Supply the required property '${requiredField}' in the tool arguments object.`,
          };
        }
      }
    }

    // Validate parameter constraints
    for (const [propName, propDef] of Object.entries(schema.properties || {})) {
      const val = args[propName];
      if (val !== undefined && val !== null) {
        if (propDef.type === 'number' && typeof val !== 'number') {
          return {
            allowed: false,
            errorCode: MCP_ERROR_CODES.INVALID_PARAMS,
            blockedReason: `Schema Validation Error: Parameter '${propName}' must be a number, received ${typeof val}.`,
          };
        }
        if (propDef.type === 'string' && typeof val !== 'string') {
          return {
            allowed: false,
            errorCode: MCP_ERROR_CODES.INVALID_PARAMS,
            blockedReason: `Schema Validation Error: Parameter '${propName}' must be a string, received ${typeof val}.`,
          };
        }
        if (propDef.minimum !== undefined && typeof val === 'number' && val < propDef.minimum) {
          return {
            allowed: false,
            errorCode: MCP_ERROR_CODES.INVALID_PARAMS,
            blockedReason: `Schema Validation Error: Parameter '${propName}' cannot be less than ${propDef.minimum}.`,
          };
        }
        if (propDef.maximum !== undefined && typeof val === 'number' && val > propDef.maximum) {
          return {
            allowed: false,
            errorCode: MCP_ERROR_CODES.INVALID_PARAMS,
            blockedReason: `Schema Validation Error: Parameter '${propName}' cannot exceed ${propDef.maximum}.`,
          };
        }
      }
    }

    // 4. RATE LIMITING & QUOTA VERIFICATION
    const maxPerMinute = tool.annotations?.rateLimitPerMinute || 60;
    const now = Date.now();
    let tracker = this.rateLimits.get(tool.name);

    if (!tracker || now > tracker.resetTime) {
      tracker = {
        count: 0,
        resetTime: now + 60000,
        limit: maxPerMinute,
      };
      this.rateLimits.set(tool.name, tracker);
    }

    if (tracker.count >= tracker.limit) {
      this.rateLimitsTriggered++;
      const resetSeconds = Math.max(1, Math.ceil((tracker.resetTime - now) / 1000));
      return {
        allowed: false,
        errorCode: MCP_ERROR_CODES.RATE_LIMIT_EXCEEDED,
        blockedReason: `Rate Limit Exceeded: Tool '${tool.name}' has reached its quota of ${tracker.limit} calls/minute.`,
        remediation: `Please wait ${resetSeconds} seconds before repeating this request.`,
      };
    }

    // Increment rate counter
    tracker.count++;

    return { allowed: true };
  }

  /**
   * Checks Cache for Cached Tool Execution
   */
  public getCachedResult(tool: MCPToolDefinition, args: Record<string, unknown>, context: MCPCallContext = {}): unknown | null {
    if (context.skipCache || !tool.annotations?.cacheTtlMs) {
      return null;
    }

    const key = this.generateCacheKey(tool.name, args);
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    this.cacheHitsCount++;
    return entry.data;
  }

  /**
   * Saves Result into MCP Deduplication Cache
   */
  public setCachedResult(tool: MCPToolDefinition, args: Record<string, unknown>, data: unknown): void {
    if (!tool.annotations?.cacheTtlMs) return;
    const key = this.generateCacheKey(tool.name, args);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttlMs: tool.annotations.cacheTtlMs,
    });
  }

  /**
   * Records execution timing for telemetry
   */
  public recordExecution(durationMs: number, isError: boolean = false): void {
    this.toolCallsCount++;
    if (isError) {
      this.upstreamErrorsCount++;
    }
    this.latencySamples.push(durationMs);
    if (this.latencySamples.length > 50) {
      this.latencySamples.shift();
    }
  }

  public recordResourceRead(): void {
    this.resourceReadsCount++;
  }

  /**
   * Returns live MCP Gateway metrics
   */
  public getMetrics(): MCPGatewayMetrics {
    const now = Date.now();
    const avgLatency =
      this.latencySamples.length > 0
        ? Math.round(this.latencySamples.reduce((a, b) => a + b, 0) / this.latencySamples.length)
        : 0;

    const activeRateLimits = Array.from(this.rateLimits.entries()).map(([toolName, tracker]) => ({
      toolName,
      callsThisMinute: tracker.count,
      limit: tracker.limit,
      resetInSeconds: Math.max(0, Math.ceil((tracker.resetTime - now) / 1000)),
    }));

    return {
      serverStartTime: this.serverStartTime,
      protocolVersion: '2024-11-05',
      totalRequestsIntercepted: this.totalRequestsIntercepted,
      toolCallsCount: this.toolCallsCount,
      resourceReadsCount: this.resourceReadsCount,
      cacheHitsCount: this.cacheHitsCount,
      rateLimitsTriggered: this.rateLimitsTriggered,
      policyViolationsCount: this.policyViolationsCount,
      upstreamErrorsCount: this.upstreamErrorsCount,
      averageLatencyMs: avgLatency,
      toolsRegistered: MCP_REGISTERED_TOOLS.length,
      resourcesRegistered: MCP_REGISTERED_RESOURCES.length,
      promptsRegistered: MCP_REGISTERED_PROMPTS.length,
      activeRateLimits,
    };
  }
}

export const mcpGovernance = new MCPGovernanceEngine();
