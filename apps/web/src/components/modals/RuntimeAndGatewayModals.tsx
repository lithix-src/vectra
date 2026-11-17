"use client";

import React from "react";
import { Cpu, ShieldCheck, X } from "lucide-react";
import { DEFAULT_MCP_TOOLS, LLM_PROVIDER_PRESETS } from "@/lib/vectraDefaults";
import {
  LocalLLMProvider,
  LocalLLMStatus,
  MCPGatewayStatus,
} from "@/types/vectra";

interface RuntimeAndGatewayModalsProps {
  llmModalOpen: boolean;
  onCloseLLMModal: () => void;
  llmStatus: LocalLLMStatus;
  llmProviderInput: LocalLLMProvider;
  llmBaseUrlInput: string;
  llmModelInput: string;
  llmEmbedModelInput: string;
  llmSaving: boolean;
  onSelectLLMProviderPreset: (prov: LocalLLMProvider) => void;
  onChangeLLMBaseUrl: (url: string) => void;
  onChangeLLMModel: (model: string) => void;
  onChangeLLMEmbedModel: (model: string) => void;
  onSaveLocalLLMConfig: (e: React.FormEvent) => Promise<void>;
  mcpModalOpen: boolean;
  onCloseMCPModal: () => void;
  mcpStatus: MCPGatewayStatus | null;
  mcpTestResult: string;
  onTestMCPToolCall: (toolName: string) => Promise<void>;
}

const PROVIDER_KEYS: LocalLLMProvider[] = [
  "ollama",
  "litellm_proxy",
  "vllm",
  "llamacpp",
  "lmstudio",
];

export default function RuntimeAndGatewayModals({
  llmModalOpen,
  onCloseLLMModal,
  llmStatus,
  llmProviderInput,
  llmBaseUrlInput,
  llmModelInput,
  llmEmbedModelInput,
  llmSaving,
  onSelectLLMProviderPreset,
  onChangeLLMBaseUrl,
  onChangeLLMModel,
  onChangeLLMEmbedModel,
  onSaveLocalLLMConfig,
  mcpModalOpen,
  onCloseMCPModal,
  mcpStatus,
  mcpTestResult,
  onTestMCPToolCall,
}: RuntimeAndGatewayModalsProps) {
  return (
    <>
      {llmModalOpen && (
        <div
          id="local-llm-config-modal"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onCloseLLMModal}
        >
          <div
            className="w-full max-w-xl bg-[#101722] border border-emerald-500/40 rounded-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 bg-[#0D131F]">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-100">
                  Sovereign Local LLM & Embeddings Runtime (0% Commercial Cloud)
                </h3>
              </div>
              <button
                type="button"
                onClick={onCloseLLMModal}
                className="text-slate-400 hover:text-slate-200 p-1 rounded bg-slate-800/80"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={onSaveLocalLLMConfig} className="p-4 space-y-3 text-xs">
              <div className="bg-[#090D14] border border-emerald-500/30 rounded p-2.5 flex items-center justify-between gap-2 font-mono text-[11px]">
                <div className="text-slate-300">
                  <div className="text-emerald-300 font-semibold">
                    Sovereign Policy: VECTRA_BLOCK_COMMERCIAL_LLMS=true
                  </div>
                  <div className="text-slate-400 text-[10px] mt-0.5">
                    {llmStatus.status_detail}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold shrink-0 ${
                    llmStatus.daemon_online
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  }`}
                >
                  {llmStatus.daemon_online ? "Daemon Online" : "Fallback Active"}
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                  Local Runtime Provider (Select Preset)
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {PROVIDER_KEYS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onSelectLLMProviderPreset(id)}
                      className={`py-1.5 px-2 rounded font-mono text-[10px] border transition ${
                        llmProviderInput === id
                          ? "bg-emerald-500 text-slate-950 font-bold border-emerald-400"
                          : "bg-[#090D14] text-slate-300 border-slate-700 hover:border-slate-500"
                      }`}
                    >
                      {LLM_PROVIDER_PRESETS[id].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                    Local Daemon Base URL
                  </label>
                  <input
                    type="text"
                    required
                    value={llmBaseUrlInput}
                    onChange={(e) => onChangeLLMBaseUrl(e.target.value)}
                    className="w-full bg-[#090D14] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                    Local Embedding Model (1536-d Projected)
                  </label>
                  <input
                    type="text"
                    required
                    value={llmEmbedModelInput}
                    onChange={(e) => onChangeLLMEmbedModel(e.target.value)}
                    className="w-full bg-[#090D14] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                  Active Local Chat / Subgraph RAG Model
                </label>
                <input
                  type="text"
                  required
                  value={llmModelInput}
                  onChange={(e) => onChangeLLMModel(e.target.value)}
                  className="w-full bg-[#090D14] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono text-xs mb-1.5"
                />
                <div className="flex flex-wrap gap-1">
                  {(llmStatus.discovered_models.length > 0
                    ? llmStatus.discovered_models
                    : llmStatus.recommended_models
                  ).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => onChangeLLMModel(m)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 font-mono text-[10px]"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onCloseLLMModal}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs"
                >
                  Cancel
                </button>
                <button
                  id="save-local-llm-config-btn"
                  type="submit"
                  disabled={llmSaving}
                  className="px-3.5 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs uppercase"
                >
                  {llmSaving ? "Saving..." : "Apply Local Runtime"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mcpModalOpen && (
        <div
          id="mcp-gateway-modal"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onCloseMCPModal}
        >
          <div
            className="w-full max-w-2xl bg-[#101722] border border-sky-500/40 rounded-lg shadow-2xl overflow-hidden max-h-[88vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 bg-[#0D131F] shrink-0">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-100">
                  Zero-Trust MCP Gateway & Broker (100% Mediated Model Context — Zero Direct DB Access)
                </h3>
              </div>
              <button
                type="button"
                onClick={onCloseMCPModal}
                className="text-slate-400 hover:text-slate-200 p-1 rounded bg-slate-800/80"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 text-xs font-mono">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#090D14] border border-emerald-500/30 rounded p-2.5">
                  <div className="text-[10px] text-slate-400 uppercase">Direct Model DB Access</div>
                  <div className="text-emerald-400 font-bold mt-0.5">BLOCKED (HMAC Envelope Required)</div>
                </div>
                <div className="bg-[#090D14] border border-sky-500/30 rounded p-2.5">
                  <div className="text-[10px] text-slate-400 uppercase">Unproxied stdio Servers</div>
                  <div className="text-sky-300 font-bold mt-0.5">FORBIDDEN (HTTP/Broker Only)</div>
                </div>
                <div className="bg-[#090D14] border border-amber-500/30 rounded p-2.5">
                  <div className="text-[10px] text-slate-400 uppercase">KMS & Token Redaction</div>
                  <div className="text-amber-300 font-bold mt-0.5">ACTIVE (RLS Scoped)</div>
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase text-slate-400 mb-1.5">
                  Configured MCP Servers & Scoped Tools (Click to Test JSON-RPC 2.0 `tools/call`)
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(mcpStatus?.tools || DEFAULT_MCP_TOOLS).map((t) => (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => onTestMCPToolCall(t.name)}
                      className="px-2.5 py-1.5 rounded bg-[#090D14] hover:bg-sky-500/20 border border-slate-700 hover:border-sky-400 text-sky-300 text-[11px] flex items-center gap-1.5 transition"
                    >
                      <span>▶ {t.name}</span>
                      <span className="text-[9px] text-slate-400">({t.required_scope})</span>
                    </button>
                  ))}
                </div>
              </div>

              {mcpTestResult && (
                <div>
                  <div className="text-[10px] uppercase text-emerald-400 mb-1">
                    Live JSON-RPC 2.0 `POST /api/mcp/rpc` Response
                  </div>
                  <pre className="bg-[#090D14] border border-slate-800 rounded p-2.5 text-[10px] text-slate-200 max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {mcpTestResult}
                  </pre>
                </div>
              )}

              <div>
                <div className="text-[10px] uppercase text-slate-400 mb-1">
                  Immutable MCP Gateway Audit Log ({mcpStatus?.audit_summary.total_events ?? 0} Events)
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {(mcpStatus?.recent_audit_log || []).map((entry) => (
                    <div
                      key={entry.audit_id}
                      className="bg-[#090D14] border border-slate-800 rounded px-2.5 py-1.5 flex items-center justify-between gap-2 text-[10px]"
                    >
                      <div className="truncate text-slate-300">
                        <span
                          className={`font-bold mr-2 ${
                            entry.decision === "ALLOWED" ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          [{entry.decision}]
                        </span>
                        <span className="text-sky-300">{entry.tool_or_resource}</span>
                        <span className="text-slate-500 ml-2">{entry.reason}</span>
                      </div>
                      <span className="text-slate-500 shrink-0">{entry.latency_ms}ms</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
