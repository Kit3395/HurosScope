/**
 * Model Context Protocol (MCP) - Client Library for Frontend & Services
 * 
 * Provides typed, ergonomic methods to invoke MCP tools, query resources,
 * and fetch live governance metrics from the backend MCP Gateway.
 */

import {
  JSONRPCRequest,
  JSONRPCResponse,
  MCPToolCallResult,
  MCPToolDefinition,
  MCPResourceDefinition,
  MCPGatewayMetrics,
} from './types';
import { apiFetch } from '../services/api';

export class MCPClient {
  private baseEndpoint = '/api/mcp';
  private requestIdCounter = 1;

  /**
   * Dispatches a raw JSON-RPC 2.0 call to the MCP gateway
   */
  public async callJsonRpc<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
    const id = this.requestIdCounter++;
    const requestPayload: JSONRPCRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    const response = await apiFetch(this.baseEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      throw new Error(`MCP Gateway HTTP Error: ${response.status} ${response.statusText}`);
    }

    const json: JSONRPCResponse<T> = await response.json();
    if (json.error) {
      throw new Error(`[MCP Error ${json.error.code}]: ${json.error.message}`);
    }

    return json.result as T;
  }

  /**
   * Initializes MCP handshake
   */
  public async initialize(): Promise<{
    protocolVersion: string;
    serverInfo: { name: string; version: string; description: string };
    capabilities: Record<string, unknown>;
  }> {
    return this.callJsonRpc('initialize');
  }

  /**
   * Lists all registered tools from the MCP gateway
   */
  public async listTools(): Promise<MCPToolDefinition[]> {
    const res = await this.callJsonRpc<{ tools: MCPToolDefinition[] }>('tools/list');
    return res.tools;
  }

  /**
   * Calls an MCP tool through the pre-call governance gateway
   */
  public async callTool(
    name: string,
    args: Record<string, unknown> = {},
    options?: { skipCache?: boolean }
  ): Promise<MCPToolCallResult> {
    return this.callJsonRpc<MCPToolCallResult>('tools/call', {
      name,
      arguments: args,
      skipCache: options?.skipCache,
    });
  }

  /**
   * Lists all available resources
   */
  public async listResources(): Promise<MCPResourceDefinition[]> {
    const res = await this.callJsonRpc<{ resources: MCPResourceDefinition[] }>('resources/list');
    return res.resources;
  }

  /**
   * Reads an MCP resource by URI
   */
  public async readResource(uri: string): Promise<{ contents: Array<{ uri: string; mimeType: string; text?: string }> }> {
    return this.callJsonRpc('resources/read', { uri });
  }

  /**
   * Fetches real-time MCP Gateway telemetry and governance metrics
   */
  public async getMetrics(): Promise<MCPGatewayMetrics> {
    const response = await apiFetch('/api/mcp/stats');
    if (!response.ok) {
      throw new Error(`Failed to fetch MCP metrics: HTTP ${response.status}`);
    }
    return await response.json();
  }
}

export const mcpClient = new MCPClient();
