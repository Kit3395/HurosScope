/**
 * Model Context Protocol (MCP) - Core Handler & Dispatcher
 * 
 * Implements JSON-RPC 2.0 protocol dispatching and programmatic tool execution.
 * Enforces pre-call interception through mcpGovernance before communicating
 * with any upstream external API (Google Places, Gemini AI, etc.).
 */

import {
  JSONRPCRequest,
  JSONRPCResponse,
  MCPToolCallParams,
  MCPToolCallResult,
  MCPCallContext,
  MCP_ERROR_CODES,
  MCPResourceContent,
} from './types';
import {
  MCP_REGISTERED_TOOLS,
  MCP_REGISTERED_RESOURCES,
  MCP_REGISTERED_PROMPTS,
} from './schemas';
import { mcpGovernance } from './governance';

export type ToolExecutorFunction = (
  args: Record<string, unknown>,
  context: MCPCallContext
) => Promise<unknown>;

export class MCPHandler {
  private customExecutors = new Map<string, ToolExecutorFunction>();

  constructor() {
    this.registerDefaultExecutors();
  }

  /**
   * Register a custom tool executor (e.g. from server.ts with access to process.env and SDKs)
   */
  public registerExecutor(toolName: string, executor: ToolExecutorFunction): void {
    this.customExecutors.set(toolName, executor);
  }

  /**
   * Registers default internal tool executors
   */
  private registerDefaultExecutors(): void {
    // 1. Lead Opportunity Scoring Executor (Deterministic)
    this.registerExecutor('intelligence_score_lead', async (args) => {
      const businessName = String(args.businessName || 'Target Business');
      const hasWebsite = Boolean(args.hasWebsite);
      const rating = Number(args.rating) || 0;
      const reviewCount = Number(args.reviewCount) || 0;
      const phoneAvailable = Boolean(args.phoneAvailable);

      let oppScore = 0;
      const scoreFactors: Array<{ name: string; impact: number; description: string }> = [];

      if (!hasWebsite) {
        oppScore += 50;
        scoreFactors.push({
          name: 'Absence of Owned Web Domain',
          impact: 50,
          description: 'No proprietary website exists to capture organic search and customer conversion.',
        });
      } else {
        scoreFactors.push({
          name: 'Existing Web Asset',
          impact: 0,
          description: 'Website present; candidate for speed/UX modernization.',
        });
      }

      if (rating >= 4.0 && reviewCount >= 15) {
        oppScore += 25;
        scoreFactors.push({
          name: 'Strong Customer Sentiment',
          impact: 25,
          description: `Established social proof (${rating}★, ${reviewCount} reviews) indicates revenue capability.`,
        });
      } else if (reviewCount > 0) {
        oppScore += 15;
        scoreFactors.push({
          name: 'Active Local Reviews',
          impact: 15,
          description: 'Local foot traffic exists with online reviews.',
        });
      }

      if (phoneAvailable) {
        oppScore += 10;
        scoreFactors.push({
          name: 'Verified Contact Channel',
          impact: 10,
          description: 'Direct telephone line available for immediate outreach.',
        });
      }

      const finalScore = Math.min(100, Math.max(10, oppScore));
      const grade = finalScore >= 70 ? 'HIGH_OPPORTUNITY' : finalScore >= 40 ? 'MEDIUM_OPPORTUNITY' : 'LOW_OPPORTUNITY';

      return {
        businessName,
        opportunityScore: finalScore,
        opportunityGrade: grade,
        recommendedAction: finalScore >= 70 ? 'Schedule immediate discovery call' : 'Queue for automated audit review',
        scoreFactors,
        governedBy: 'HorusScope MCP Gateway',
        timestamp: new Date().toISOString(),
      };
    });

    // 2. System Health Check Executor
    this.registerExecutor('system_health_check', async (args) => {
      const detailed = args.detailed !== false;
      const metrics = mcpGovernance.getMetrics();
      return {
        status: 'OPERATIONAL',
        protocolVersion: '2024-11-05',
        mcpGateway: {
          interceptedRequests: metrics.totalRequestsIntercepted,
          toolCallsCount: metrics.toolCallsCount,
          cacheHits: metrics.cacheHitsCount,
          averageLatencyMs: metrics.averageLatencyMs,
          registeredToolsCount: metrics.toolsRegistered,
        },
        systemCapabilities: {
          governanceEnforced: true,
          rateLimitingActive: true,
          speculativePhrasingBlocked: true,
          scrapingHardBlocked: true,
        },
        detailed: detailed ? metrics : undefined,
        timestamp: new Date().toISOString(),
      };
    });
  }

  /**
   * Programmatic Execution of an MCP Tool with full pre-call governance
   */
  public async executeTool(
    toolName: string,
    args: Record<string, unknown> = {},
    context: MCPCallContext = {}
  ): Promise<MCPToolCallResult> {
    const startTime = Date.now();
    const correlationId = context.correlationId || `mcp_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

    // 1. Find tool definition
    const toolDef = MCP_REGISTERED_TOOLS.find((t) => t.name === toolName);
    if (!toolDef) {
      mcpGovernance.recordExecution(Date.now() - startTime, true);
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `MCP Tool NotFound: Tool '${toolName}' is not registered with this gateway.`,
          },
        ],
        metadata: {
          toolName,
          targetApi: 'System Internal',
          durationMs: Date.now() - startTime,
          cached: false,
          timestamp: new Date().toISOString(),
          correlationId,
        },
      };
    }

    // 2. PRE-CALL GOVERNANCE INTERCEPTION
    const preflight = mcpGovernance.preflightCheck(toolDef, args, context);
    if (!preflight.allowed) {
      mcpGovernance.recordExecution(Date.now() - startTime, true);
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `[MCP Pre-Call Governance Blocked]: ${preflight.blockedReason}`,
          },
          ...(preflight.remediation ? [{ type: 'text' as const, text: `Remediation: ${preflight.remediation}` }] : []),
        ],
        metadata: {
          toolName,
          targetApi: toolDef.annotations?.targetApi || 'System Internal',
          durationMs: Date.now() - startTime,
          cached: false,
          timestamp: new Date().toISOString(),
          correlationId,
        },
      };
    }

    // 3. DEDUPLICATION CACHE CHECK
    const cachedData = mcpGovernance.getCachedResult(toolDef, args, context);
    if (cachedData !== null) {
      const durationMs = Date.now() - startTime;
      mcpGovernance.recordExecution(durationMs, false);
      return {
        isError: false,
        content: [
          {
            type: 'json',
            data: cachedData,
          },
          {
            type: 'text',
            text: `Result retrieved from MCP Deduplication Vault (0ms upstream latency).`,
          },
        ],
        metadata: {
          toolName,
          targetApi: toolDef.annotations?.targetApi || 'System Internal',
          durationMs,
          cached: true,
          timestamp: new Date().toISOString(),
          correlationId,
        },
      };
    }

    // 4. DISPATCH TO EXECUTOR / EXTERNAL API
    try {
      const executor = this.customExecutors.get(toolName);
      if (!executor) {
        throw new Error(`No executor adapter registered for MCP tool '${toolName}'.`);
      }

      const executionData = await executor(args, context);
      const durationMs = Date.now() - startTime;

      // 5. CACHE RESPONSE IN VAULT
      mcpGovernance.setCachedResult(toolDef, args, executionData);
      mcpGovernance.recordExecution(durationMs, false);

      return {
        isError: false,
        content: [
          {
            type: 'json',
            data: executionData,
          },
        ],
        metadata: {
          toolName,
          targetApi: toolDef.annotations?.targetApi || 'System Internal',
          durationMs,
          cached: false,
          timestamp: new Date().toISOString(),
          correlationId,
        },
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      mcpGovernance.recordExecution(durationMs, true);
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Upstream API execution error: ${err.message || String(err)}`,
          },
        ],
        metadata: {
          toolName,
          targetApi: toolDef.annotations?.targetApi || 'System Internal',
          durationMs,
          cached: false,
          timestamp: new Date().toISOString(),
          correlationId,
        },
      };
    }
  }

  /**
   * Resolves MCP Resources
   */
  public async readResource(uri: string): Promise<MCPResourceContent> {
    mcpGovernance.recordResourceRead();

    switch (uri) {
      case 'horusscope://system/health': {
        const metrics = mcpGovernance.getMetrics();
        return {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            status: 'HEALTHY',
            placesApiVersion: 'Google Places API (New) - v1/places:searchText',
            gatewayVersion: '2024-11-05',
            uptimeSince: metrics.serverStartTime,
            timestamp: new Date().toISOString(),
          }, null, 2),
        };
      }

      case 'horusscope://system/locks': {
        return {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            ENABLE_GOOGLE_MAPS_DISCOVERY: true,
            ENABLE_HTML_MAPS_SCRAPING: false,
            ENABLE_BULK_SCRAPING: false,
            ENABLE_AUTOMATED_OUTREACH: false,
            ENABLE_CONTACT_HARVESTING: false,
            ALLOW_SILENT_OVERWRITE: false,
            ENFORCE_RATE_LIMITING: true,
            ENFORCE_MCP_GOVERNANCE: true,
          }, null, 2),
        };
      }

      case 'horusscope://mcp/metrics': {
        const metrics = mcpGovernance.getMetrics();
        return {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(metrics, null, 2),
        };
      }

      case 'horusscope://access/requests': {
        return {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            message: 'Access requests queue synced with server and local storage vault.',
            timestamp: new Date().toISOString(),
          }, null, 2),
        };
      }

      default:
        throw new Error(`Resource URI '${uri}' not found in registered MCP resources catalog.`);
    }
  }

  /**
   * Main JSON-RPC 2.0 Handler for MCP Clients
   */
  public async handleJsonRpc(
    request: JSONRPCRequest,
    context: MCPCallContext = {}
  ): Promise<JSONRPCResponse> {
    const { id, method, params } = request;

    // Validate JSON-RPC 2.0 envelope
    if (request.jsonrpc !== '2.0') {
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        error: {
          code: MCP_ERROR_CODES.INVALID_REQUEST,
          message: 'Invalid Request: jsonrpc version must be exactly "2.0".',
        },
      };
    }

    try {
      switch (method) {
        // 1. Initialize Protocol Handshake
        case 'initialize': {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              protocolVersion: '2024-11-05',
              serverInfo: {
                name: 'HorusScope MCP Gateway',
                version: '1.0.0',
                description: 'Model Context Protocol server governing Google Places API (New), Gemini AI, and CRM storage.',
              },
              capabilities: {
                tools: {
                  listChanged: false,
                },
                resources: {
                  subscribe: false,
                  listChanged: false,
                },
                prompts: {
                  listChanged: false,
                },
                logging: {},
              },
            },
          };
        }

        // 2. Tools Catalog
        case 'tools/list': {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              tools: MCP_REGISTERED_TOOLS,
            },
          };
        }

        // 3. Tool Call
        case 'tools/call': {
          const toolParams = params as unknown as MCPToolCallParams | undefined;
          if (!toolParams || !toolParams.name) {
            return {
              jsonrpc: '2.0',
              id,
              error: {
                code: MCP_ERROR_CODES.INVALID_PARAMS,
                message: "Missing 'name' in tools/call params.",
              },
            };
          }

          const toolResult = await this.executeTool(
            toolParams.name,
            toolParams.arguments || {},
            context
          );

          return {
            jsonrpc: '2.0',
            id,
            result: toolResult,
          };
        }

        // 4. Resources Catalog
        case 'resources/list': {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              resources: MCP_REGISTERED_RESOURCES,
            },
          };
        }

        // 5. Resource Read
        case 'resources/read': {
          const uri = (params as { uri?: string })?.uri;
          if (!uri) {
            return {
              jsonrpc: '2.0',
              id,
              error: {
                code: MCP_ERROR_CODES.INVALID_PARAMS,
                message: "Missing 'uri' in resources/read params.",
              },
            };
          }

          const content = await this.readResource(uri);
          return {
            jsonrpc: '2.0',
            id,
            result: {
              contents: [content],
            },
          };
        }

        // 6. Prompts Catalog
        case 'prompts/list': {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              prompts: MCP_REGISTERED_PROMPTS,
            },
          };
        }

        // 7. Prompt Get
        case 'prompts/get': {
          const promptName = (params as { name?: string })?.name;
          const promptArgs = (params as { arguments?: Record<string, string> })?.arguments || {};
          const promptDef = MCP_REGISTERED_PROMPTS.find((p) => p.name === promptName);

          if (!promptDef) {
            return {
              jsonrpc: '2.0',
              id,
              error: {
                code: MCP_ERROR_CODES.METHOD_NOT_FOUND,
                message: `Prompt '${promptName}' not found.`,
              },
            };
          }

          let renderedText = '';
          if (promptName === 'website_intelligence_audit') {
            renderedText = `You are HorusScope's Website Intelligence Auditor. Analyze "${promptArgs.businessName || 'Business'}" (${promptArgs.websiteUrl || 'No URL'}). Audit 13 criteria with strict cautious non-speculative phrasing ("AI assessment indicates the website may have outdated design patterns").`;
          } else if (promptName === 'client_proposal_generator') {
            renderedText = `Draft a non-aggressive transformation proposal for "${promptArgs.businessName || 'Business'}" highlighting Opportunity Score ${promptArgs.opportunityScore || 'N/A'}. Weaknesses to address: ${promptArgs.keyWeaknesses || 'None'}.`;
          }

          return {
            jsonrpc: '2.0',
            id,
            result: {
              description: promptDef.description,
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: renderedText,
                  },
                },
              ],
            },
          };
        }

        default:
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: MCP_ERROR_CODES.METHOD_NOT_FOUND,
              message: `Unknown MCP method '${method}'. Available: initialize, tools/list, tools/call, resources/list, resources/read, prompts/list, prompts/get.`,
            },
          };
      }
    } catch (err: any) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: MCP_ERROR_CODES.INTERNAL_ERROR,
          message: err.message || 'Internal MCP gateway error',
        },
      };
    }
  }
}

export const mcpHandler = new MCPHandler();
