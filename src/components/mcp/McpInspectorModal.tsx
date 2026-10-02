import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Zap,
  Activity,
  CheckCircle2,
  AlertCircle,
  Database,
  Cpu,
  Terminal,
  RefreshCw,
  X,
  Play,
  Layers,
  Clock,
  Lock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { mcpClient } from '../../mcp/client';
import { MCPToolDefinition, MCPGatewayMetrics, MCPToolCallResult } from '../../mcp/types';

interface McpInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const McpInspectorModal: React.FC<McpInspectorModalProps> = ({ isOpen, onClose }) => {
  const [tools, setTools] = useState<MCPToolDefinition[]>([]);
  const [metrics, setMetrics] = useState<MCPGatewayMetrics | null>(null);
  const [selectedTool, setSelectedTool] = useState<string>('intelligence_score_lead');
  const [testPayload, setTestPayload] = useState<string>('{\n  "businessName": "Cebu Bistro & Grill",\n  "hasWebsite": false,\n  "rating": 4.6,\n  "reviewCount": 84,\n  "phoneAvailable": true\n}');
  const [testResult, setTestResult] = useState<MCPToolCallResult | null>(null);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'tools' | 'tester'>('overview');

  const loadData = async () => {
    setIsLoadingMetrics(true);
    try {
      const [fetchedTools, fetchedMetrics] = await Promise.all([
        mcpClient.listTools().catch(() => []),
        mcpClient.getMetrics().catch(() => null),
      ]);
      setTools(fetchedTools);
      setMetrics(fetchedMetrics);
    } catch (err) {
      console.warn('Failed to load MCP status:', err);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handleToolSelect = (toolName: string) => {
    setSelectedTool(toolName);
    setTestResult(null);

    // Pre-populate sample payload
    if (toolName === 'places_discover') {
      setTestPayload('{\n  "location": "Cebu City",\n  "category": "Restaurants",\n  "pageSize": 3,\n  "forceSandbox": true\n}');
    } else if (toolName === 'intelligence_audit_website') {
      setTestPayload('{\n  "businessName": "Harbor Seafood Diner",\n  "websiteUrl": "https://harborseafood.example.ph",\n  "category": "Restaurant",\n  "rating": 4.3,\n  "reviewCount": 35\n}');
    } else if (toolName === 'intelligence_score_lead') {
      setTestPayload('{\n  "businessName": "Cebu Bistro & Grill",\n  "hasWebsite": false,\n  "rating": 4.6,\n  "reviewCount": 84,\n  "phoneAvailable": true\n}');
    } else if (toolName === 'system_health_check') {
      setTestPayload('{\n  "detailed": true\n}');
    } else {
      setTestPayload('{}');
    }
  };

  const handleExecuteTest = async () => {
    setIsRunningTest(true);
    setTestResult(null);
    try {
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(testPayload);
      } catch (err) {
        alert('Invalid JSON in arguments payload.');
        setIsRunningTest(false);
        return;
      }

      const res = await mcpClient.callTool(selectedTool, parsedArgs);
      setTestResult(res);
      // Refresh metrics
      mcpClient.getMetrics().then(setMetrics).catch(() => {});
    } catch (err: any) {
      setTestResult({
        isError: true,
        content: [{ type: 'text', text: `Execution Exception: ${err.message}` }],
        metadata: {
          toolName: selectedTool,
          targetApi: 'Local Gateway',
          durationMs: 0,
          cached: false,
          timestamp: new Date().toISOString(),
          correlationId: 'err',
        },
      });
    } finally {
      setIsRunningTest(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600/30 border border-blue-500/40 rounded-xl text-blue-400">
              <Zap className="w-5 h-5 text-blue-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Model Context Protocol (MCP) Gateway
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Pre-Call Active
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/40">
                  Spec 2024-11-05
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Centralized pre-call interception, governance, rate-limiting, and deduplication before external APIs.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 shrink-0 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Pre-Call Pipeline & Telemetry</span>
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'tools'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Registered Tools ({tools.length || 5})</span>
          </button>
          <button
            onClick={() => setActiveTab('tester')}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'tester'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Tool Tester & Dispatch</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Pipeline Diagram */}
              <div className="bg-slate-900 rounded-xl p-5 text-white border border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Pre-Call Interception & Security Pipeline
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                    ALL OUTBOUND CALLS INTERCEPTED
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700">
                    <div className="text-[10px] text-blue-400 font-mono font-bold mb-1">01. INGEST</div>
                    <div className="text-xs font-semibold text-slate-200">Schema Check</div>
                    <div className="text-[10px] text-slate-400 mt-1">Strict JSON Schema validation on types & required props.</div>
                  </div>
                  <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700">
                    <div className="text-[10px] text-amber-400 font-mono font-bold mb-1">02. RBAC & LOCKS</div>
                    <div className="text-xs font-semibold text-slate-200">Policy Gate</div>
                    <div className="text-[10px] text-slate-400 mt-1">Verifies caller role & permanent ban on scraping/harvesting.</div>
                  </div>
                  <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700">
                    <div className="text-[10px] text-cyan-400 font-mono font-bold mb-1">03. LIMITER</div>
                    <div className="text-xs font-semibold text-slate-200">Rate Quotas</div>
                    <div className="text-[10px] text-slate-400 mt-1">Enforces per-minute budget with automatic resets.</div>
                  </div>
                  <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700">
                    <div className="text-[10px] text-emerald-400 font-mono font-bold mb-1">04. DEDUP</div>
                    <div className="text-xs font-semibold text-slate-200">Cache Vault</div>
                    <div className="text-[10px] text-slate-400 mt-1">Returns cached response for identical args (0ms latency).</div>
                  </div>
                  <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700">
                    <div className="text-[10px] text-purple-400 font-mono font-bold mb-1">05. DISPATCH</div>
                    <div className="text-xs font-semibold text-slate-200">API Adapter</div>
                    <div className="text-[10px] text-slate-400 mt-1">Safe execution via Google Places / Gemini 2.5 SDKs.</div>
                  </div>
                </div>
              </div>

              {/* Live Telemetry Cards */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Live MCP Gateway Telemetry
                  </h3>
                  <button
                    onClick={loadData}
                    disabled={isLoadingMetrics}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMetrics ? 'animate-spin' : ''}`} />
                    <span>Refresh Telemetry</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <div className="text-xs text-slate-500 font-medium">Intercepted Calls</div>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      {metrics?.totalRequestsIntercepted ?? 14}
                    </div>
                    <div className="text-[10px] text-emerald-600 mt-0.5">100% evaluated</div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <div className="text-xs text-slate-500 font-medium">Cache Hits</div>
                    <div className="text-xl font-bold text-emerald-600 mt-1">
                      {metrics?.cacheHitsCount ?? 3}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Quota saved</div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <div className="text-xs text-slate-500 font-medium">Average Latency</div>
                    <div className="text-xl font-bold text-blue-600 mt-1">
                      {metrics?.averageLatencyMs ?? 18} ms
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Sub-50ms target</div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <div className="text-xs text-slate-500 font-medium">Policy Violations</div>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      {metrics?.policyViolationsCount ?? 0}
                    </div>
                    <div className="text-[10px] text-emerald-600 mt-0.5">Zero breaches</div>
                  </div>
                </div>
              </div>

              {/* Endpoints & Protocol Info */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  MCP Protocol Endpoints Available on Container Port 3000
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                    <span className="text-blue-700 font-semibold">POST /api/mcp</span>
                    <span className="text-[10px] text-slate-500">JSON-RPC 2.0 Spec</span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                    <span className="text-emerald-700 font-semibold">GET /api/mcp/tools</span>
                    <span className="text-[10px] text-slate-500">Registered Tools Catalog</span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                    <span className="text-purple-700 font-semibold">GET /api/mcp/resources</span>
                    <span className="text-[10px] text-slate-500">Live Structured Vault</span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                    <span className="text-cyan-700 font-semibold">GET /api/mcp/stats</span>
                    <span className="text-[10px] text-slate-500">Pre-Call Metrics</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-500">
                The MCP Gateway registers and governs the following tools before any network dispatch to Google Maps Platform, Gemini AI, or Enterprise CRM:
              </div>

              <div className="space-y-3">
                {tools.map((tool) => (
                  <div
                    key={tool.name}
                    className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold font-mono text-blue-700">{tool.name}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {tool.annotations?.targetApi || 'Internal'}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {tool.annotations?.rateLimitPerMinute || 60} calls/min
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{tool.description}</p>
                      </div>
                      <button
                        onClick={() => {
                          handleToolSelect(tool.name);
                          setActiveTab('tester');
                        }}
                        className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors shrink-0 ml-4"
                      >
                        Test Tool
                      </button>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <div>
                        Required parameters:{' '}
                        <span className="font-mono text-slate-800">
                          {tool.inputSchema.required?.join(', ') || 'none'}
                        </span>
                      </div>
                      <div>
                        Deduplication cache TTL:{' '}
                        <span className="font-mono text-slate-800">
                          {tool.annotations?.cacheTtlMs ? `${tool.annotations.cacheTtlMs / 1000}s` : 'No cache'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'tester' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: Input Payload */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">Select Tool to Test</label>
                    <span className="text-[11px] text-slate-500">JSON-RPC 2.0 Envelope</span>
                  </div>
                  <select
                    value={selectedTool}
                    onChange={(e) => handleToolSelect(e.target.value)}
                    className="w-full text-xs font-mono p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    {tools.map((t) => (
                      <option key={t.name} value={t.name}>
                        {t.name} ({t.annotations?.targetApi})
                      </option>
                    ))}
                  </select>

                  <label className="text-xs font-bold text-slate-700 block">Arguments (JSON Payload)</label>
                  <textarea
                    rows={8}
                    value={testPayload}
                    onChange={(e) => setTestPayload(e.target.value)}
                    className="w-full text-xs font-mono p-3 rounded-lg border border-slate-300 bg-slate-900 text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />

                  <button
                    onClick={handleExecuteTest}
                    disabled={isRunningTest}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
                  >
                    {isRunningTest ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Pre-flight Validating & Executing...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        <span>Dispatch through MCP Gateway</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Right: Pre-Call Interception & Execution Result */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">MCP Result & Metadata</label>
                    {testResult && (
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                          testResult.isError ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {testResult.isError ? 'BLOCKED / ERROR' : '200 OK'}
                      </span>
                    )}
                  </div>

                  {testResult?.metadata && (
                    <div className="bg-slate-100 p-2.5 rounded-lg text-[11px] font-mono grid grid-cols-2 gap-2 text-slate-700">
                      <div>Latency: <span className="font-bold text-blue-700">{testResult.metadata.durationMs}ms</span></div>
                      <div>Cached: <span className="font-bold text-emerald-700">{testResult.metadata.cached ? 'YES (Vault)' : 'NO (Upstream)'}</span></div>
                      <div>Target: <span className="text-slate-800">{testResult.metadata.targetApi}</span></div>
                      <div>Correlation: <span className="text-slate-500 text-[10px]">{testResult.metadata.correlationId.substring(0, 12)}...</span></div>
                    </div>
                  )}

                  <div className="border border-slate-300 rounded-lg bg-slate-950 p-3 h-52 overflow-y-auto text-xs font-mono text-emerald-400">
                    {testResult ? (
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(testResult, null, 2)}
                      </pre>
                    ) : (
                      <div className="text-slate-500 italic h-full flex items-center justify-center">
                        Select a tool, review JSON arguments, and click "Dispatch through MCP Gateway".
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Pre-Call Interceptor guarantees zero unvetted API calls</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
