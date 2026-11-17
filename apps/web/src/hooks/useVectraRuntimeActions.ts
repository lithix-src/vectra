"use client";

import React, { useCallback, useState } from "react";
import {
  DEFAULT_COLLECTOR_STATUS,
  DEFAULT_LLM_STATUS,
  LLM_PROVIDER_PRESETS,
} from "@/lib/vectraDefaults";
import {
  CollectorPackItem,
  CollectorPacksStatus,
  LocalLLMProvider,
  LocalLLMStatus,
  MCPGatewayStatus,
  VariantLens,
} from "@/types/vectra";

const TENANT_QS = "tenant_user_id=erik&tenant_org_id=vectra-advisory";

interface RuntimeActionsDeps {
  activeVertical: string;
  variantLens: VariantLens;
  lassoNodeIds: string[];
  fetchWorkspaceData: (verticalOverride?: string, preserveSelection?: boolean) => Promise<void>;
  triggerToast: (msg: string) => void;
}

export function useVectraRuntimeActions({
  activeVertical,
  variantLens,
  lassoNodeIds,
  fetchWorkspaceData,
  triggerToast,
}: RuntimeActionsDeps) {
  const [llmModalOpen, setLLMModalOpen] = useState<boolean>(false);
  const [llmStatus, setLLMStatus] = useState<LocalLLMStatus>(DEFAULT_LLM_STATUS);
  const [llmProviderInput, setLLMProviderInput] = useState<LocalLLMProvider>("ollama");
  const [llmBaseUrlInput, setLLMBaseUrlInput] = useState<string>("http://localhost:11434");
  const [llmModelInput, setLLMModelInput] = useState<string>("qwen2.5:14b-instruct");
  const [llmEmbedModelInput, setLLMEmbedModelInput] = useState<string>("nomic-embed-text");
  const [llmSaving, setLLMSaving] = useState<boolean>(false);

  const [mcpModalOpen, setMCPModalOpen] = useState<boolean>(false);
  const [mcpStatus, setMCPStatus] = useState<MCPGatewayStatus | null>(null);
  const [mcpTestResult, setMCPTestResult] = useState<string>("");

  const [collectorModalOpen, setCollectorModalOpen] = useState<boolean>(false);
  const [collectorAllowLiveHttp, setCollectorAllowLiveHttp] = useState<boolean>(false);
  const [collectorBusyPackId, setCollectorBusyPackId] = useState<string | null>(null);
  const [collectorStatus, setCollectorStatus] = useState<CollectorPacksStatus>(
    DEFAULT_COLLECTOR_STATUS
  );

  const fetchCollectorPacks = useCallback(async () => {
    try {
      const res = await fetch(`/api/collectors/packs`);
      if (res.ok) {
        const data: CollectorPacksStatus = await res.json();
        if (data?.packs) setCollectorStatus(data);
      }
    } catch {
      /* offline fallback */
    }
  }, []);

  const fetchMCPGatewayStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/mcp/status`);
      if (res.ok) setMCPStatus(await res.json());
    } catch {
      /* offline fallback */
    }
  }, []);

  const fetchLocalLLMStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/llm/status`);
      if (res.ok) {
        const data: LocalLLMStatus = await res.json();
        setLLMStatus(data);
        setLLMProviderInput(data.provider);
        setLLMBaseUrlInput(data.base_url);
        setLLMModelInput(data.model);
        setLLMEmbedModelInput(data.embedding_model);
      }
    } catch {
      /* offline fallback */
    }
  }, []);

  const handleRunPublicCollectors = async () => {
    setCollectorBusyPackId("all");
    try {
      const res = await fetch(`/api/collectors/run?${TENANT_QS}`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        await Promise.all([fetchWorkspaceData(activeVertical, true), fetchCollectorPacks()]);
        triggerToast(
          `Public Collectors clustered ${data.items_processed} primary signals (F500 Eng Blogs, SEC 8-K, NIST/EU AI Act)`
        );
      }
    } finally {
      setCollectorBusyPackId(null);
    }
  };

  const handleUpdateCollectorSchedule = async (
    pack: CollectorPackItem,
    opts: { interval_minutes?: number; enabled?: boolean; run_immediately?: boolean }
  ) => {
    const nextInterval = opts.interval_minutes ?? pack.schedule.interval_minutes;
    const nextEnabled = opts.enabled ?? pack.schedule.enabled;
    const runImmediately = Boolean(opts.run_immediately);
    setCollectorBusyPackId(pack.id);
    try {
      const res = await fetch(`/api/collectors/schedule?${TENANT_QS}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pack_id: pack.id,
          interval_minutes: nextInterval,
          enabled: nextEnabled,
          run_immediately: runImmediately,
          allow_live_http: collectorAllowLiveHttp,
        }),
      });
      if (res.ok) {
        const payload = await res.json();
        await fetchCollectorPacks();
        if (runImmediately) {
          await fetchWorkspaceData(activeVertical, true);
          const count = payload.run_result?.items_processed ?? 0;
          const mode =
            payload.schedule?.execution_mode === "live_rss_atom_feed"
              ? "Live RSS/Atom Feed"
              : "Curated Verified Dispatch";
          triggerToast(
            `Collector "${pack.id}" clustered ${count} signal(s) (${mode}, every ${nextInterval}m)`
          );
        } else {
          triggerToast(
            `Updated "${pack.id}" schedule: ${
              nextEnabled ? `ACTIVE (every ${nextInterval}m)` : "PAUSED"
            }`
          );
        }
      }
    } finally {
      setCollectorBusyPackId(null);
    }
  };

  const handleSelectLLMProviderPreset = (prov: LocalLLMProvider) => {
    setLLMProviderInput(prov);
    const p = LLM_PROVIDER_PRESETS[prov];
    setLLMBaseUrlInput(p.url);
    setLLMModelInput(p.model);
    setLLMEmbedModelInput(p.embed);
  };

  const handleSaveLocalLLMConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLLMSaving(true);
    try {
      const res = await fetch(`/api/llm/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: llmProviderInput,
          base_url: llmBaseUrlInput,
          model: llmModelInput,
          embedding_model: llmEmbedModelInput,
          temperature: 0.15,
          timeout_seconds: 60.0,
          block_commercial_models: true,
        }),
      });
      if (res.ok) {
        const updated: LocalLLMStatus = await res.json();
        setLLMStatus(updated);
        setLLMModalOpen(false);
        triggerToast(
          `Configured Local LLM: ${updated.provider.toUpperCase()} (${updated.model}) — Zero Commercial Cloud`
        );
      } else {
        const err = await res.json().catch(() => ({}));
        triggerToast(err.detail || "Blocked: Commercial cloud models are forbidden by policy.");
      }
    } finally {
      setLLMSaving(false);
    }
  };

  const handleTestMCPToolCall = async (toolName: string) => {
    const res = await fetch(`/api/mcp/rpc?${TENANT_QS}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: `ui-test-${Date.now()}`,
        method: "tools/call",
        params: {
          name: toolName,
          arguments: {
            node_ids: lassoNodeIds.length > 0 ? lassoNodeIds : ["node-jpm-agentic-kyc"],
            vertical: activeVertical,
            variant_lens: variantLens,
            pack_id: "sec_edgar_8k",
            markdown_content:
              "Preview link to [[Model Context Protocol (MCP) Zero-Trust Enterprise Gateways]]",
            text: "Zero-Trust MCP Gateway verification vector",
          },
        },
      }),
    });
    const payload = await res.json().catch(() => ({}));
    setMCPTestResult(JSON.stringify(payload, null, 2));
    await fetchMCPGatewayStatus();
    if (toolName === "vectra_run_collector_pack") {
      await fetchCollectorPacks();
      await fetchWorkspaceData(activeVertical, true);
    }
    triggerToast(`Executed MCP JSON-RPC 2.0 tools/call -> ${toolName}`);
  };

  return {
    llmModalOpen,
    setLLMModalOpen,
    llmStatus,
    llmProviderInput,
    llmBaseUrlInput,
    setLLMBaseUrlInput,
    llmModelInput,
    setLLMModelInput,
    llmEmbedModelInput,
    setLLMEmbedModelInput,
    llmSaving,
    mcpModalOpen,
    setMCPModalOpen,
    mcpStatus,
    mcpTestResult,
    collectorModalOpen,
    setCollectorModalOpen,
    collectorAllowLiveHttp,
    setCollectorAllowLiveHttp,
    collectorBusyPackId,
    collectorStatus,
    fetchCollectorPacks,
    fetchMCPGatewayStatus,
    fetchLocalLLMStatus,
    handleRunPublicCollectors,
    handleUpdateCollectorSchedule,
    handleSelectLLMProviderPreset,
    handleSaveLocalLLMConfig,
    handleTestMCPToolCall,
  };
}
