"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import {
  Activity,
  AlertTriangle,
  Bot,
  Briefcase,
  Calculator,
  Check,
  Code2,
  Copy,
  Cpu,
  Download,
  ExternalLink,
  FileText,
  Filter,
  KeyRound,
  Lasso,
  Layers,
  Link2,
  Mail,
  Network,
  PlusCircle,
  Presentation,
  RefreshCw,
  Search,
  ShieldCheck,
  Sliders,
  Sparkles,
  X,
} from "lucide-react";
import AssociativeGraphCanvas from "@/components/AssociativeGraphCanvas";
import VariantDiffMatrix from "@/components/VariantDiffMatrix";
import WikilinkNoteEditor from "@/components/WikilinkNoteEditor";
import {
  AssociativeEdgeItem,
  CanonicalNodeItem,
  CopilotStructuredResponse,
  LocalLLMProvider,
  LocalLLMStatus,
  MCPGatewayStatus,
  RelationType,
  UserIntegrationItem,
  VariantLens,
} from "@/types/vectra";

const VERTICAL_LIST = [
  "All Verticals",
  "Financial Services",
  "Healthcare & Life Sciences",
  "Manufacturing & Supply Chain",
  "Retail/CPG",
  "Legal/Professional Services",
  "Cross-Industry Horizontal",
];

export default function VectraAdvisoryWorkspace() {
  // Core Graph & RLS State
  const [nodes, setNodes] = useState<CanonicalNodeItem[]>([]);
  const [edges, setEdges] = useState<AssociativeEdgeItem[]>([]);
  const [integrations, setIntegrations] = useState<UserIntegrationItem[]>([]);
  const [activeVertical, setActiveVertical] = useState<string>("All Verticals");
  const [variantLens, setVariantLens] = useState<VariantLens>("c_suite");
  const [centerMode, setCenterMode] = useState<"graph" | "matrix">("graph");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<"citations" | "notes" | "copilot">("citations");

  // Interactive Graph Controls
  const [lassoModeActive, setLassoModeActive] = useState<boolean>(false);
  const [lassoNodeIds, setLassoNodeIds] = useState<string[]>([]);
  const [connectModeSourceId, setConnectModeSourceId] = useState<string | null>(null);
  const [weightSliderValue, setWeightSliderValue] = useState<number>(1.5);

  // Command Palette (`Cmd+K`) & Auth Drawer
  const [cmdkOpen, setCmdkOpen] = useState<boolean>(false);
  const [cmdkSearch, setCmdkSearch] = useState<string>("");
  const [authDrawerOpen, setAuthDrawerOpen] = useState<boolean>(true);
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // "+ Ingest Signal" Modal State
  const [ingestModalOpen, setIngestModalOpen] = useState<boolean>(false);
  const [ingestSubmitting, setIngestSubmitting] = useState<boolean>(false);
  const [ingestTitle, setIngestTitle] = useState<string>(
    "Deterministic Temporal DAGs & vLLM Grammar Masking in Tier-1 AML"
  );
  const [ingestQuote, setIngestQuote] = useState<string>(
    "Production audit across 14M wire settlements confirmed 61% manual review reduction with zero ungrounded tool invocations when combining Temporal state graphs with Outlines JSON-schema decoding."
  );
  const [ingestUrl, setIngestUrl] = useState<string>(
    "https://stratechery.com/2026/deterministic-banking-agents-audit/"
  );
  const [ingestSourceName, setIngestSourceName] = useState<string>(
    "Stratechery Executive Dispatch (Field Telemetry)"
  );
  const [ingestLicense, setIngestLicense] = useState<"subscriber_licensed" | "public">(
    "subscriber_licensed"
  );
  const [ingestVisibility, setIngestVisibility] = useState<
    "user_private" | "org_private" | "global"
  >("user_private");
  const [ingestVertical, setIngestVertical] = useState<string>("Financial Services");

  // "Cypher & Score Math" Inspector Modal State
  const [cypherModalOpen, setCypherModalOpen] = useState<boolean>(false);
  const [cypherSql, setCypherSql] = useState<string>("");
  const [cypherGraphName, setCypherGraphName] = useState<string>("vectra_knowledge_graph");
  const [cypherLoading, setCypherLoading] = useState<boolean>(false);
  const [copiedCypher, setCopiedCypher] = useState<boolean>(false);

  // Subgraph Co-Pilot & Export State
  const [copilotQuestion, setCopilotQuestion] = useState<string>(
    "Synthesize the audited production ROI, p99 latency architecture, and SR 11-7 / EU AI Act governance risks across this lassoed subgraph."
  );
  const [copilotLoading, setCopilotLoading] = useState<boolean>(false);
  const [copilotResponse, setCopilotResponse] =
    useState<CopilotStructuredResponse | null>(null);
  const [pptxDownloading, setPptxDownloading] = useState<boolean>(false);
  const [briefDownloading, setBriefDownloading] = useState<boolean>(false);

  // Sovereign Local LLM & Embeddings Runtime State (Ollama default, 0% Commercial Cloud)
  const [llmModalOpen, setLLMModalOpen] = useState<boolean>(false);
  const [llmStatus, setLLMStatus] = useState<LocalLLMStatus>({
    provider: "ollama",
    provider_label: "Ollama (Local Daemon)",
    base_url: "http://localhost:11434",
    model: "qwen2.5:14b-instruct",
    embedding_model: "nomic-embed-text",
    temperature: 0.15,
    daemon_online: false,
    execution_mode: "deterministic_local_fallback",
    commercial_models_blocked: true,
    discovered_models: [],
    recommended_models: [
      "qwen2.5:14b-instruct",
      "llama3.3:8b",
      "deepseek-r1:14b",
      "mistral-nemo:12b",
      "phi4:14b",
    ],
    probe_latency_ms: 0,
    status_detail: "Sovereign Local Runtime (Ollama default — Zero Commercial Cloud)",
  });
  const [llmProviderInput, setLLMProviderInput] =
    useState<LocalLLMProvider>("ollama");
  const [llmBaseUrlInput, setLLMBaseUrlInput] = useState<string>(
    "http://localhost:11434"
  );
  const [llmModelInput, setLLMModelInput] = useState<string>(
    "qwen2.5:14b-instruct"
  );
  const [llmEmbedModelInput, setLLMEmbedModelInput] =
    useState<string>("nomic-embed-text");
  const [llmSaving, setLLMSaving] = useState<boolean>(false);

  // Zero-Trust MCP Gateway State (100% Mediated Model Context — Zero Direct DB Access)
  const [mcpModalOpen, setMCPModalOpen] = useState<boolean>(false);
  const [mcpStatus, setMCPStatus] = useState<MCPGatewayStatus | null>(null);
  const [mcpTestResult, setMCPTestResult] = useState<string>("");

  const triggerToast = useCallback((msg: string) => {
    setStatusToast(msg);
    setTimeout(() => {
      setStatusToast((prev) => (prev === msg ? null : prev));
    }, 4500);
  }, []);

  const fetchMCPGatewayStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/mcp/status`);
      if (res.ok) {
        const data: MCPGatewayStatus = await res.json();
        setMCPStatus(data);
      }
    } catch {
      // Keep existing state if offline
    }
  }, []);

  const handleTestMCPToolCall = async (toolName: string) => {
    const res = await fetch(`/api/mcp/rpc?tenant_user_id=erik&tenant_org_id=vectra-advisory`, {
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
            text: "Zero-Trust MCP Gateway verification vector",
          },
        },
      }),
    });
    const payload = await res.json().catch(() => ({}));
    setMCPTestResult(JSON.stringify(payload, null, 2));
    await fetchMCPGatewayStatus();
    triggerToast(`Executed MCP JSON-RPC 2.0 tools/call -> ${toolName}`);
  };

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
      // Keep sovereign local defaults if offline
    }
  }, []);

  const handleSelectLLMProviderPreset = (prov: LocalLLMProvider) => {
    setLLMProviderInput(prov);
    const presets: Record<
      LocalLLMProvider,
      { url: string; model: string; embed: string }
    > = {
      ollama: {
        url: "http://localhost:11434",
        model: "qwen2.5:14b-instruct",
        embed: "nomic-embed-text",
      },
      litellm_proxy: {
        url: "http://localhost:4000/v1",
        model: "ollama/qwen2.5:14b-instruct",
        embed: "ollama/nomic-embed-text",
      },
      vllm: {
        url: "http://localhost:8001/v1",
        model: "Qwen/Qwen2.5-14B-Instruct",
        embed: "BAAI/bge-m3",
      },
      llamacpp: {
        url: "http://localhost:8080/v1",
        model: "qwen2.5-14b-instruct-q4_k_m.gguf",
        embed: "nomic-embed-text-v1.5.Q8_0.gguf",
      },
      lmstudio: {
        url: "http://localhost:1234/v1",
        model: "qwen2.5-14b-instruct",
        embed: "text-embedding-nomic-embed-text-v1.5",
      },
    };
    const p = presets[prov];
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
          timeout_seconds: 8.0,
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
        triggerToast(
          err.detail || "Blocked: Commercial cloud models are forbidden by policy."
        );
      }
    } finally {
      setLLMSaving(false);
    }
  };

  // Fetch RLS-scoped graph & integrations
  const fetchWorkspaceData = useCallback(
    async (verticalOverride?: string, preserveSelection = true) => {
      const targetVert = verticalOverride ?? activeVertical;
      const [graphRes, integRes] = await Promise.all([
        fetch(
          `/api/graph?vertical=${encodeURIComponent(
            targetVert
          )}&tenant_user_id=erik&tenant_org_id=vectra-advisory`
        ),
        fetch(
          `/api/integrations?tenant_user_id=erik&tenant_org_id=vectra-advisory`
        ),
      ]);

      if (graphRes.ok) {
        const data = await graphRes.json();
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
        if (data.nodes?.length > 0) {
          setSelectedNodeId((prev) => {
            if (
              preserveSelection &&
              prev &&
              data.nodes.some((n: CanonicalNodeItem) => n.id === prev)
            ) {
              return prev;
            }
            return data.nodes[0].id;
          });
        }
      }
      if (integRes.ok) {
        const idata = await integRes.json();
        setIntegrations(idata.integrations || []);
      }
    },
    [activeVertical]
  );

  useEffect(() => {
    fetchWorkspaceData("All Verticals", false);
    fetchLocalLLMStatus();
  }, []);

  // Keyboard shortcut for `Cmd+K` / `Ctrl+K`
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdkOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selectedNodeId) || nodes[0] || null;
  }, [nodes, selectedNodeId]);

  useEffect(() => {
    if (selectedNode) {
      setWeightSliderValue(selectedNode.consultant_weight);
    }
  }, [selectedNode?.id, selectedNode?.consultant_weight]);

  // Switch Industry Vertical
  const handleVerticalChange = async (vertical: string) => {
    setActiveVertical(vertical);
    await fetchWorkspaceData(vertical, false);
    triggerToast(`Filtered Canonical Graph to: ${vertical}`);
  };

  // Update Consultant Weight (`0.5x - 5.0x`)
  const handleWeightCommit = async (newWeight: number) => {
    if (!selectedNode) return;
    setWeightSliderValue(newWeight);
    const res = await fetch(`/api/nodes/${selectedNode.id}/weight`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consultant_weight: newWeight }),
    });
    if (res.ok) {
      await fetchWorkspaceData(activeVertical, true);
      triggerToast(
        `Updated Consultant Weight to ${newWeight.toFixed(1)}x — Recomputed Composite Score`
      );
    }
  };

  // Save Obsidian Field Note & Auto-Upsert `[[Wikilink]]` Edges
  const handleSaveNoteAndSyncWikilinks = async (
    nodeId: string,
    markdownContent: string,
    relationType: RelationType
  ) => {
    const res = await fetch(`/api/nodes/${nodeId}/note`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        markdown_content: markdownContent,
        default_relation_type: relationType,
      }),
    });
    if (res.ok) {
      const payload = await res.json();
      await fetchWorkspaceData(activeVertical, true);
      const count = payload.upserted_edges?.length || 0;
      triggerToast(
        `Synced ${count} [[Wikilink]] associative edge(s) onto live WebGL graph`
      );
    }
  };

  // Create manual edge between two nodes on canvas
  const handleCreateEdgeBetween = async (
    sourceId: string,
    targetId: string,
    relationType: RelationType
  ) => {
    setConnectModeSourceId(null);
    const res = await fetch(`/api/edges`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_node_id: sourceId,
        target_node_id: targetId,
        relation_type: relationType,
        weight: 2.5,
        consultant_note: "Connected interactively on VECTRA Canvas",
      }),
    });
    if (res.ok) {
      await fetchWorkspaceData(activeVertical, true);
      triggerToast(`Created ${relationType} edge on Knowledge Graph`);
    }
  };

  // Handle Lasso Selection
  const handleUpdateLassoNodes = (ids: string[]) => {
    setLassoNodeIds(ids);
    setLassoModeActive(false);
    setRightTab("copilot");
    triggerToast(
      `Lassoed ${ids.length} Canonical Node(s) into Subgraph Co-Pilot RAG context`
    );
  };

  const handleQuickLassoSubgraph = () => {
    const topIds = nodes.slice(0, Math.min(4, nodes.length)).map((n) => n.id);
    setLassoNodeIds(topIds);
    setRightTab("copilot");
    triggerToast(
      `Lassoed ${topIds.length} nodes into Subgraph Co-Pilot context`
    );
  };

  // Query Subgraph Co-Pilot
  const handleRunCopilotQuery = async () => {
    setCopilotLoading(true);
    try {
      const targetIds =
        lassoNodeIds.length > 0
          ? lassoNodeIds
          : nodes.slice(0, 4).map((n) => n.id);
      if (lassoNodeIds.length === 0) {
        setLassoNodeIds(targetIds);
      }
      const res = await fetch(`/api/copilot/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          node_ids: targetIds,
          question: copilotQuestion,
          variant_lens: variantLens,
          industry_vertical: activeVertical,
        }),
      });
      if (res.ok) {
        const data: CopilotStructuredResponse = await res.json();
        setCopilotResponse(data);
        triggerToast(
          `Subgraph Co-Pilot synthesized ${data.subgraph_node_count} nodes & ${data.citations_used.length} citations`
        );
      }
    } finally {
      setCopilotLoading(false);
    }
  };

  // Download `.pptx` Executive Deck
  const handleDownloadPptx = async () => {
    setPptxDownloading(true);
    try {
      const targetIds =
        lassoNodeIds.length > 0
          ? lassoNodeIds
          : nodes.slice(0, 5).map((n) => n.id);
      const res = await fetch(`/api/export/pptx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deck_title: `VECTRA Executive Readout — ${activeVertical}`,
          node_ids: targetIds,
          variant_lens: variantLens,
          industry_vertical: activeVertical,
          copilot_synthesis: copilotResponse?.executive_answer || null,
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `VECTRA_Executive_Readout_${variantLens.toUpperCase()}.pptx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        triggerToast(
          `Downloaded VECTRA_Executive_Readout_${variantLens.toUpperCase()}.pptx (${(
            blob.size / 1024
          ).toFixed(1)} KB)`
        );
      }
    } finally {
      setPptxDownloading(false);
    }
  };

  // Download `VECTRA_Executive_Brief.md` Executive Memorandum
  const handleDownloadBriefMarkdown = async () => {
    setBriefDownloading(true);
    try {
      const targetIds =
        lassoNodeIds.length > 0
          ? lassoNodeIds
          : nodes.slice(0, 5).map((n) => n.id);
      const res = await fetch(`/api/export/brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deck_title: `VECTRA Executive Readout — ${activeVertical}`,
          node_ids: targetIds,
          variant_lens: variantLens,
          industry_vertical: activeVertical,
          copilot_synthesis: copilotResponse?.executive_answer || null,
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `VECTRA_Executive_Brief.md`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        triggerToast(
          `Downloaded VECTRA_Executive_Brief.md (${(blob.size / 1024).toFixed(
            1
          )} KB)`
        );
      }
    } finally {
      setBriefDownloading(false);
    }
  };

  // Submit Custom Signal via `+ Ingest Signal` Modal (`POST /api/signals/ingest`)
  const handleIngestCustomSignal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingestTitle.trim() || !ingestQuote.trim()) return;
    setIngestSubmitting(true);
    try {
      const res = await fetch(`/api/signals/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: ingestTitle.trim(),
          exact_quote: ingestQuote.trim(),
          direct_url: ingestUrl.trim() || "https://sec.gov/edgar",
          source_type:
            ingestLicense === "subscriber_licensed" ? "newsletter" : "eng_blog",
          source_name: ingestSourceName.trim() || "VECTRA Field Dispatch",
          author_handle: "@erik_vectra_ai",
          authority_tier: 1,
          provenance_license: ingestLicense,
          visibility: ingestVisibility,
          industry_vertical: ingestVertical,
          industry_verticals: [ingestVertical],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const clusterResult = data.cluster_result || data;
        await fetchWorkspaceData(activeVertical, true);
        if (clusterResult?.node_id) {
          setSelectedNodeId(clusterResult.node_id);
        }
        setIngestModalOpen(false);
        const actionLabel = clusterResult?.clustered_into_existing
          ? `Clustered into existing Canonical Node "${clusterResult.node_title}" (cosine ${clusterResult.cosine_similarity})`
          : `Created new Canonical Node "${clusterResult?.node_title || ingestTitle}"`;
        triggerToast(`Ingested Signal: ${actionLabel}`);
      }
    } finally {
      setIngestSubmitting(false);
    }
  };

  // Fetch Apache AGE OpenCypher query for `Cypher & Score Math` Modal
  const fetchCypherQuery = useCallback(
    async (verticalOverride?: string) => {
      setCypherLoading(true);
      try {
        const targetVert = verticalOverride ?? activeVertical;
        const res = await fetch(
          `/api/graph/cypher?vertical=${encodeURIComponent(
            targetVert
          )}&tenant_user_id=erik`
        );
        if (res.ok) {
          const data = await res.json();
          setCypherSql(data.open_cypher_sql || "");
          setCypherGraphName(data.graph_name || "vectra_knowledge_graph");
        }
      } finally {
        setCypherLoading(false);
      }
    },
    [activeVertical]
  );

  const handleOpenCypherModal = async () => {
    setCypherModalOpen(true);
    await fetchCypherQuery(activeVertical);
  };

  // Launch Boardroom Mode (`/present/[sessionId]`)
  const handleLaunchBoardroomMode = async () => {
    const targetIds =
      lassoNodeIds.length > 0 ? lassoNodeIds : nodes.map((n) => n.id);
    const res = await fetch(`/api/present/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `VECTRA Boardroom Briefing — ${activeVertical}`,
        node_ids: targetIds,
        variant_lens: variantLens,
        industry_vertical: activeVertical,
        copilot_synthesis: copilotResponse?.executive_answer || null,
      }),
    });
    if (res.ok) {
      const session = await res.json();
      window.location.href = `/present/${session.session_id}`;
    }
  };

  // Refresh OAuth / Session Cookie via Temporal Worker Activity
  const handleRefreshIntegration = async (provider: string) => {
    const res = await fetch(`/api/integrations/${provider}/refresh`, {
      method: "POST",
    });
    if (res.ok) {
      await fetchWorkspaceData(activeVertical, true);
      triggerToast(
        `Temporal Worker decrypted & rotated ${provider} credentials in-memory (Status: HEALTHY)`
      );
    }
  };

  // Simulate Forwarded Paid Newsletter Webhook (`POST /api/webhooks/inbound-email`)
  const handleSimulateInboundNewsletter = async () => {
    const res = await fetch(`/api/webhooks/inbound-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: "intel+erik@ingest.vectra.ai",
        sender_publication: "Stratechery Executive Dispatch",
        author_handle: "@benthompson",
        subject: "Agentic KYC & Real-Time Fraud Settlement Pipelines",
        direct_url:
          "https://stratechery.com/2026/deterministic-state-graphs-in-banking/",
        extracted_quote:
          "[LIVE WEBHOOK INGEST] Tier-1 compliance teams confirmed that coupling Temporal state graphs with grammar-masked vLLM verifiers cut manual AML escalations by an additional 19% in Q4.",
        industry_verticals: ["Financial Services", "Cross-Industry Horizontal"],
      }),
    });
    if (res.ok) {
      await fetchWorkspaceData(activeVertical, true);
      triggerToast(
        "Ingested paid newsletter via intel+erik@ingest.vectra.ai & clustered onto Canonical Node (cosine > 0.84)"
      );
    }
  };

  // Run Public Enterprise & Regulatory Collectors (F500 Blogs, SEC EDGAR 8-K/10-K, NIST/EU AI Act)
  const handleRunPublicCollectors = async () => {
    const res = await fetch(`/api/collectors/run`, {
      method: "POST",
    });
    if (res.ok) {
      const data = await res.json();
      await fetchWorkspaceData(activeVertical, true);
      triggerToast(
        `Public Collectors clustered ${data.items_processed} primary signals (F500 Eng Blogs, SEC 8-K, NIST/EU AI Act)`
      );
    }
  };

  // Return active lens summary text for a node
  const getLensSummary = (node: CanonicalNodeItem | null) => {
    if (!node) return "";
    if (variantLens === "cto") return node.summary_technical;
    if (variantLens === "contrarian") return node.summary_contrarian;
    return node.summary_executive;
  };

  return (
    <div className="min-h-screen h-screen w-screen flex flex-col bg-[#090D14] text-slate-100 overflow-hidden">
      {/* =================================================================== */}
      {/* TOP EXECUTIVE COMMAND HEADER                                        */}
      {/* =================================================================== */}
      <header className="h-14 shrink-0 border-b border-slate-800 bg-[#0D131F] px-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-sky-500/15 border border-sky-400/50 flex items-center justify-center font-mono font-bold text-sky-400 text-sm">
            V
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-wider uppercase font-mono text-slate-100">
                VECTRA
              </h1>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                RLS: erik@vectra-advisory
              </span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                PG17 + pgvector + AGE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Enterprise AI Intelligence, Variant Diff Matrix & Boardroom Advisory OS
            </p>
          </div>
        </div>

        {/* Center Persistent Variant Lens Switcher */}
        <div
          id="variant-lens-toggle-group"
          className="flex items-center bg-[#090D14] p-1 rounded-md border border-slate-800"
        >
          <button
            id="lens-btn-c_suite"
            type="button"
            onClick={() => {
              setVariantLens("c_suite");
              triggerToast("Switched Variant Lens: C-Suite (ROI, Capital & Regulatory Risk)");
            }}
            className={`px-3 py-1 rounded text-xs font-mono uppercase transition flex items-center gap-1.5 ${
              variantLens === "c_suite"
                ? "bg-sky-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            C-Suite Lens
          </button>
          <button
            id="lens-btn-cto"
            type="button"
            onClick={() => {
              setVariantLens("cto");
              triggerToast("Switched Variant Lens: CTO / Principal Architect (Latency & Topology)");
            }}
            className={`px-3 py-1 rounded text-xs font-mono uppercase transition flex items-center gap-1.5 ${
              variantLens === "cto"
                ? "bg-emerald-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            CTO / Architect
          </button>
          <button
            id="lens-btn-contrarian"
            type="button"
            onClick={() => {
              setVariantLens("contrarian");
              triggerToast("Switched Variant Lens: Contrarian / Skeptic (Failure Modes & TCO)");
            }}
            className={`px-3 py-1 rounded text-xs font-mono uppercase transition flex items-center gap-1.5 ${
              variantLens === "contrarian"
                ? "bg-rose-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Contrarian
          </button>
        </div>

        {/* Right Header Actions: Zero-Trust MCP, Local LLM Runtime, + Ingest Signal, Cmd+K, Boardroom Mode, .pptx Export */}
        <div className="flex items-center gap-2">
          <button
            id="open-mcp-gateway-modal-btn"
            type="button"
            onClick={() => {
              fetchMCPGatewayStatus();
              setMCPModalOpen(true);
            }}
            className="px-2.5 py-1.5 rounded bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 text-xs font-mono flex items-center gap-1.5 transition"
            title="Inspect Zero-Trust Model Context Protocol (MCP) Gateway, Scoped Servers, and Immutable Audit Log"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            <span>MCP Gateway</span>
          </button>

          <button
            id="open-local-llm-modal-btn"
            type="button"
            onClick={() => {
              fetchLocalLLMStatus();
              setLLMModalOpen(true);
            }}
            className="px-2.5 py-1.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-1.5 transition"
            title="Configure Sovereign Local LLM & Embeddings Runtime (Ollama default, LiteLLM, vLLM, llama.cpp — 0% Commercial Cloud)"
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden xl:inline">
              {llmStatus.provider.toUpperCase()}:
            </span>
            <span className="truncate max-w-[130px] font-semibold">
              {llmStatus.model}
            </span>
          </button>

          <button
            id="open-ingest-signal-modal-btn"
            type="button"
            onClick={() => setIngestModalOpen(true)}
            className="px-2.5 py-1.5 rounded bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-300 font-semibold text-xs font-mono flex items-center gap-1.5 transition"
          >
            <PlusCircle className="w-3.5 h-3.5 text-sky-400" />
            <span>+ Ingest Signal</span>
          </button>

          <button
            id="open-cmdk-palette-btn"
            type="button"
            onClick={() => setCmdkOpen(true)}
            className="px-2.5 py-1.5 rounded bg-[#090D14] hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 flex items-center gap-2"
          >
            <Search className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline">Command</span>
            <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-900 border border-slate-700 rounded">
              ⌘K
            </kbd>
          </button>

          <button
            id="launch-boardroom-mode-btn"
            type="button"
            onClick={handleLaunchBoardroomMode}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-mono text-slate-100 flex items-center gap-1.5 transition"
          >
            <Presentation className="w-3.5 h-3.5 text-sky-400" />
            <span>Boardroom Mode</span>
          </button>

          <button
            id="header-export-pptx-btn"
            type="button"
            disabled={pptxDownloading}
            onClick={handleDownloadPptx}
            className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs font-mono flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{pptxDownloading ? "Generating .pptx..." : "Export .pptx Deck"}</span>
          </button>
        </div>
      </header>

      {/* Live Status Toast */}
      {statusToast && (
        <div
          id="vectra-status-toast"
          className="fixed bottom-4 right-4 z-50 bg-[#101722] border border-sky-400/60 text-sky-200 px-3.5 py-2 rounded shadow-2xl text-xs font-mono flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
          <span>{statusToast}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* MAIN 3-PANE PROGRESSIVE DISCLOSURE WORKSPACE                        */}
      {/* =================================================================== */}
      <div className="flex-1 grid grid-cols-12 min-h-0 overflow-hidden">
        {/* ----------------------------------------------------------------- */}
        {/* PANE 1: LEFT RAIL (Snap View, Executive Pulse Heatmap, Auth Vault)*/}
        {/* ----------------------------------------------------------------- */}
        <aside
          id="left-rail-snap-view"
          className="col-span-3 border-r border-slate-800 bg-[#0D131F] flex flex-col min-h-0 overflow-y-auto p-3 gap-3"
        >
          {/* 1. Industry Vertical Switcher */}
          <section className="bg-[#101722] border border-slate-800 rounded p-2.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-sky-400" /> Industry Vertical Switcher
              </span>
              <span className="text-[10px] font-mono text-sky-400">
                {nodes.length} Active Nodes
              </span>
            </div>
            <div className="flex flex-col gap-1">
              {VERTICAL_LIST.map((vert) => {
                const isActive = activeVertical === vert;
                const slugId = vert
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-");
                return (
                  <button
                    key={vert}
                    id={`vertical-filter-${slugId}`}
                    type="button"
                    onClick={() => handleVerticalChange(vert)}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-medium transition flex items-center justify-between ${
                      isActive
                        ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold"
                        : "text-slate-300 hover:bg-slate-800/70 border border-transparent"
                    }`}
                  >
                    <span className="truncate">{vert}</span>
                    {isActive && (
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-sky-500/30 text-sky-200">
                        ACTIVE
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 2. "Executive Pulse" Heatmap (Adoption Velocity vs Verified ROI) */}
          <section className="bg-[#101722] border border-slate-800 rounded p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" /> Executive Pulse Heatmap
              </span>
              <span className="text-[10px] font-mono text-emerald-400">
                Velocity × Verified ROI
              </span>
            </div>
            <div className="relative w-full h-40 bg-[#090D14] border border-slate-800 rounded p-2">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 240 130">
                {/* Quadrant Hairlines */}
                <line
                  x1="120"
                  y1="0"
                  x2="120"
                  y2="115"
                  stroke="#1E293B"
                  strokeDasharray="3 3"
                />
                <line
                  x1="0"
                  y1="58"
                  x2="240"
                  y2="58"
                  stroke="#1E293B"
                  strokeDasharray="3 3"
                />
                <text x="4" y="10" fill="#64748B" fontSize="7" fontFamily="monospace">
                  HIGH ROI / NICHE
                </text>
                <text x="142" y="10" fill="#10B981" fontSize="7" fontFamily="monospace">
                  PRODUCTION SCALE LEADER
                </text>
                <text x="145" y="126" fill="#94A3B8" fontSize="7" fontFamily="monospace">
                  ADOPTION VELOCITY →
                </text>

                {nodes.map((n) => {
                  const cx = Math.max(14, Math.min(226, (n.adoption_velocity / 100) * 230));
                  const cy = Math.max(
                    12,
                    Math.min(108, 115 - (n.verified_roi_score / 100) * 105)
                  );
                  const isSel = selectedNode?.id === n.id;
                  return (
                    <g
                      key={n.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedNodeId(n.id)}
                    >
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isSel ? 6.5 : 4.5}
                        fill={isSel ? "#38BDF8" : "#10B981"}
                        fillOpacity={isSel ? 1 : 0.78}
                        stroke={isSel ? "#F8FAFC" : "#064E3B"}
                        strokeWidth={1.5}
                      />
                      {isSel && (
                        <text
                          x={Math.min(175, Math.max(8, cx - 25))}
                          y={Math.max(12, cy - 9)}
                          fill="#F8FAFC"
                          fontSize="7.5"
                          fontFamily="monospace"
                        >
                          {n.title.slice(0, 18)}…
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </section>

          {/* 3. 30-Second Executive Snap-View Feed */}
          <section className="bg-[#101722] border border-slate-800 rounded p-2.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                30-Sec Snap-View ({variantLens.toUpperCase()})
              </span>
            </div>
            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
              {nodes.map((node) => {
                const isSel = selectedNode?.id === node.id;
                return (
                  <div
                    key={node.id}
                    id={`snap-node-card-${node.slug}`}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`p-2 rounded border cursor-pointer transition ${
                      isSel
                        ? "bg-sky-950/35 border-sky-400/70"
                        : "bg-[#090D14] border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-semibold text-slate-100 truncate">
                        {node.title}
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 shrink-0">
                        {node.composite_score}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 line-clamp-2 leading-snug">
                      {getLensSummary(node)}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 4. Connected Sources & AES-256-GCM Auth Health Drawer */}
          <section
            id="connected-sources-auth-drawer"
            className="bg-[#101722] border border-slate-800 rounded p-2.5"
          >
            <button
              type="button"
              onClick={() => setAuthDrawerOpen(!authDrawerOpen)}
              className="w-full flex items-center justify-between text-left"
            >
              <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" /> Credential Vault & Auth Health
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                AES-256-GCM
              </span>
            </button>

            {authDrawerOpen && (
              <div className="mt-2.5 flex flex-col gap-2">
                {/* Copyable Inbound Email Alias */}
                <div className="p-2 rounded bg-[#090D14] border border-slate-800">
                  <div className="text-[10px] font-mono uppercase text-slate-400 mb-1 flex items-center justify-between">
                    <span>Paid Newsletter Ingest Alias</span>
                    <span className="text-emerald-400">ACTIVE</span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <code
                      id="inbound-newsletter-email-alias"
                      className="text-[11px] font-mono text-sky-300 truncate"
                    >
                      intel+erik@ingest.vectra.ai
                    </code>
                    <button
                      id="copy-ingest-email-btn"
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(
                          "intel+erik@ingest.vectra.ai"
                        );
                        setCopiedEmail(true);
                        triggerToast("Copied intel+erik@ingest.vectra.ai to clipboard");
                        setTimeout(() => setCopiedEmail(false), 2000);
                      }}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-200 flex items-center gap-1 shrink-0"
                    >
                      {copiedEmail ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      {copiedEmail ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <button
                    id="simulate-inbound-newsletter-btn"
                    type="button"
                    onClick={handleSimulateInboundNewsletter}
                    className="mt-2 w-full py-1 px-2 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-[10px] font-mono uppercase flex items-center justify-center gap-1 transition"
                  >
                    <Mail className="w-3 h-3" /> Simulate Forwarded Issue Webhook
                  </button>
                  <button
                    id="run-public-collectors-btn"
                    type="button"
                    onClick={handleRunPublicCollectors}
                    className="mt-1.5 w-full py-1 px-2 rounded bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 text-[10px] font-mono uppercase flex items-center justify-center gap-1 transition"
                  >
                    <RefreshCw className="w-3 h-3" /> Sync Public Collectors (F500 / SEC / NIST)
                  </button>
                </div>

                {/* Encrypted Integration Rows */}
                {integrations.map((integ) => (
                  <div
                    key={integ.id}
                    className="p-2 rounded bg-[#090D14] border border-slate-800 flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-semibold text-slate-200">
                        {integ.provider}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase ${
                          integ.status === "healthy"
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        }`}
                      >
                        {integ.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {integ.account_handle}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      DEK: {integ.dek_fingerprint}
                    </div>
                    {integ.status !== "healthy" && (
                      <div className="mt-1 flex items-center justify-between gap-2 bg-amber-500/10 border border-amber-500/30 rounded p-1.5">
                        <span className="text-[10px] text-amber-200 leading-tight">
                          Cookie expires in 36h
                        </span>
                        <button
                          id={`refresh-integration-${integ.provider}`}
                          type="button"
                          onClick={() =>
                            handleRefreshIntegration(integ.provider)
                          }
                          className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-mono font-bold text-[10px] shrink-0"
                        >
                          Rotate Cookie
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>

        {/* ----------------------------------------------------------------- */}
        {/* PANE 2: CENTER CANVAS (Dual-Mode Graph & Variant Diff Matrix)     */}
        {/* ----------------------------------------------------------------- */}
        <main className="col-span-5 flex flex-col min-h-0 bg-[#090D14] relative">
          {/* Center Tactical Toolbar */}
          <div className="h-12 shrink-0 border-b border-slate-800 bg-[#101722] px-3 flex items-center justify-between gap-2">
            {/* Mode Switcher: Graph Mode vs Variant Diff Matrix */}
            <div className="flex items-center gap-1 bg-[#090D14] p-1 rounded border border-slate-800">
              <button
                id="mode-switch-graph-btn"
                type="button"
                onClick={() => setCenterMode("graph")}
                className={`px-2.5 py-1 rounded text-xs font-mono uppercase flex items-center gap-1.5 transition ${
                  centerMode === "graph"
                    ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                Associative Graph ({edges.length} Edges)
              </button>
              <button
                id="mode-switch-matrix-btn"
                type="button"
                onClick={() => setCenterMode("matrix")}
                className={`px-2.5 py-1 rounded text-xs font-mono uppercase flex items-center gap-1.5 transition ${
                  centerMode === "matrix"
                    ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Variant Diff Matrix
              </button>
            </div>

            {/* Lasso & Interactive Edge Tools */}
            <div className="flex items-center gap-1.5">
              <button
                id="toggle-lasso-mode-btn"
                type="button"
                onClick={() => {
                  const nextState = !lassoModeActive;
                  setLassoModeActive(nextState);
                  if (nextState) {
                    triggerToast(
                      "Lasso Mode ON: Drag a rectangle on the graph (or click Quick Lasso) to select subgraph"
                    );
                  }
                }}
                className={`px-2.5 py-1 rounded text-xs font-mono flex items-center gap-1 border transition ${
                  lassoModeActive
                    ? "bg-amber-500 text-slate-950 font-bold border-amber-400"
                    : "bg-[#090D14] text-amber-300 border-slate-700 hover:border-amber-400/60"
                }`}
              >
                <Lasso className="w-3.5 h-3.5" />
                <span>
                  {lassoNodeIds.length > 0
                    ? `Lasso (${lassoNodeIds.length})`
                    : "Lasso Select"}
                </span>
              </button>

              <button
                id="quick-lasso-subgraph-btn"
                type="button"
                onClick={handleQuickLassoSubgraph}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-mono text-slate-200"
                title="Lasso top canonical nodes into Subgraph Co-Pilot"
              >
                Scope Top 4
              </button>

              <button
                id="open-cypher-math-modal-btn"
                type="button"
                onClick={handleOpenCypherModal}
                className="px-2 py-1 rounded bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-[11px] font-mono text-sky-300 flex items-center gap-1 transition"
                title="Inspect Apache AGE OpenCypher query & Composite Score mathematical breakdown"
              >
                <Calculator className="w-3 h-3 text-sky-400" />
                <span>Cypher & Score Math</span>
              </button>

              {selectedNode && (
                <button
                  id="connect-node-edge-btn"
                  type="button"
                  onClick={() => {
                    if (connectModeSourceId) {
                      setConnectModeSourceId(null);
                    } else {
                      setConnectModeSourceId(selectedNode.id);
                      triggerToast(
                        `Click any target node on the graph to create an ENABLES edge from "${selectedNode.title.slice(
                          0,
                          24
                        )}…"`
                      );
                    }
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-mono border transition ${
                    connectModeSourceId
                      ? "bg-rose-500 text-slate-950 font-bold border-rose-400"
                      : "bg-[#090D14] text-slate-300 border-slate-700 hover:border-sky-400"
                  }`}
                >
                  {connectModeSourceId ? "Click Target Node…" : "+ Link Node"}
                </button>
              )}
            </div>
          </div>

          {/* Active Node Consultant Weight Slider & Lens Banner */}
          {selectedNode && (
            <div className="bg-[#0D131F] border-b border-slate-800 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-500/40 font-mono text-[11px] text-sky-300 shrink-0">
                  Composite: {selectedNode.composite_score}
                </span>
                <span className="font-semibold text-slate-100 truncate">
                  {selectedNode.title}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <label
                  htmlFor="consultant-weight-slider"
                  className="font-mono text-[11px] text-slate-300"
                >
                  Weight: <strong className="text-amber-400">{weightSliderValue.toFixed(1)}x</strong>
                </label>
                <input
                  id="consultant-weight-slider"
                  type="range"
                  min={0.5}
                  max={5.0}
                  step={0.1}
                  value={weightSliderValue}
                  onChange={(e) =>
                    handleWeightCommit(parseFloat(e.target.value))
                  }
                  className="w-24 accent-amber-400 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Main Dual-Mode Canvas Body */}
          <div className="flex-1 min-h-0 relative">
            {centerMode === "graph" ? (
              <AssociativeGraphCanvas
                nodes={nodes}
                edges={edges}
                selectedNodeId={selectedNode?.id || null}
                lassoNodeIds={lassoNodeIds}
                variantLens={variantLens}
                lassoModeActive={lassoModeActive}
                connectModeSourceId={connectModeSourceId}
                onSelectNode={(id) => setSelectedNodeId(id)}
                onUpdateLassoNodes={handleUpdateLassoNodes}
                onCreateEdgeBetween={handleCreateEdgeBetween}
              />
            ) : (
              <VariantDiffMatrix
                nodes={nodes}
                selectedNode={selectedNode}
                variantLens={variantLens}
                onSelectNode={(id) => setSelectedNodeId(id)}
                onInspectSource={() => setRightTab("citations")}
              />
            )}
          </div>
        </main>

        {/* ----------------------------------------------------------------- */}
        {/* PANE 3: RIGHT RAIL (Citations, Obsidian [[Wikilinks]], Co-Pilot)  */}
        {/* ----------------------------------------------------------------- */}
        <aside
          id="right-rail-inspector"
          className="col-span-4 border-l border-slate-800 bg-[#0D131F] flex flex-col min-h-0 overflow-hidden"
        >
          {/* Right Rail Mode Tabs */}
          <div className="h-12 shrink-0 border-b border-slate-800 bg-[#101722] px-3 flex items-center gap-1">
            <button
              id="right-tab-citations"
              type="button"
              onClick={() => setRightTab("citations")}
              className={`flex-1 py-1.5 px-2 rounded text-xs font-mono uppercase transition flex items-center justify-center gap-1.5 ${
                rightTab === "citations"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Citations ({selectedNode?.sources.length || 0})
            </button>
            <button
              id="right-tab-notes"
              type="button"
              onClick={() => setRightTab("notes")}
              className={`flex-1 py-1.5 px-2 rounded text-xs font-mono uppercase transition flex items-center justify-center gap-1.5 ${
                rightTab === "notes"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              [[Field Notes]]
            </button>
            <button
              id="right-tab-copilot"
              type="button"
              onClick={() => setRightTab("copilot")}
              className={`flex-1 py-1.5 px-2 rounded text-xs font-mono uppercase transition flex items-center justify-center gap-1.5 ${
                rightTab === "copilot"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              Co-Pilot ({lassoNodeIds.length || 4})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
            {/* Selected Node Multi-Lens Summary Card */}
            {selectedNode && (
              <div className="bg-[#101722] border border-slate-800 rounded p-3">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                    Active Lens: {variantLens.toUpperCase()}
                  </span>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    Stage: {selectedNode.maturity_stage}
                  </span>
                </div>
                <h2
                  id="inspector-active-node-title"
                  className="text-sm font-bold text-slate-100 leading-snug mb-2"
                >
                  {selectedNode.title}
                </h2>
                <p
                  id="inspector-active-lens-summary"
                  className="text-xs text-slate-200 leading-relaxed bg-[#090D14] p-2.5 rounded border border-slate-800"
                >
                  {getLensSummary(selectedNode)}
                </p>
              </div>
            )}

            {/* TAB 1: VERIFIED PRIMARY SOURCE CITATIONS */}
            {rightTab === "citations" && selectedNode && (
              <div
                id="verified-citation-drawer"
                className="flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                    Primary Evidence & Verbatim Pull-Quotes
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">
                    RLS Tenant Filtered
                  </span>
                </div>

                {selectedNode.sources.map((src) => (
                  <div
                    key={src.id}
                    className="bg-[#101722] border border-slate-800 rounded p-3 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-semibold ${
                          src.provenance_license === "subscriber_licensed"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        }`}
                      >
                        {src.provenance_license === "subscriber_licensed"
                          ? "[Subscriber Licensed • user_private]"
                          : "[Public • Tier-" + src.authority_tier + "]"}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {src.author_handle}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-100">
                      {src.source_name}
                    </div>

                    <blockquote className="text-xs text-slate-200 italic border-l-2 border-sky-400 pl-2.5 py-1 bg-[#090D14] rounded-r leading-relaxed">
                      “{src.exact_quote}”
                    </blockquote>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] font-mono text-slate-400 uppercase">
                        Type: {src.source_type}
                      </span>
                      <a
                        href={src.direct_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-sky-400 hover:underline"
                      >
                        <span>Verify Primary URL</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 2: OBSIDIAN [[WIKILINK]] FIELD NOTES EDITOR */}
            {rightTab === "notes" && selectedNode && (
              <div className="bg-[#101722] border border-slate-800 rounded p-3">
                <WikilinkNoteEditor
                  activeNode={selectedNode}
                  allNodes={nodes}
                  onSaveNote={handleSaveNoteAndSyncWikilinks}
                />
              </div>
            )}

            {/* TAB 3: SUBGRAPH CO-PILOT & .PPTX / .MD GENERATOR */}
            {rightTab === "copilot" && (
              <div
                id="subgraph-copilot-panel"
                className="flex flex-col gap-3 bg-[#101722] border border-slate-800 rounded p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Bot className="w-4 h-4" /> Subgraph-Scoped Executive Co-Pilot
                  </span>
                  <button
                    id="copilot-select-all-visible-btn"
                    type="button"
                    onClick={handleQuickLassoSubgraph}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700"
                  >
                    Lasso Top 4 Nodes
                  </button>
                </div>

                {/* Sovereign Local LLM Runtime Banner */}
                <div className="bg-[#090D14] border border-emerald-500/30 rounded px-2.5 py-1.5 flex items-center justify-between gap-2 text-[10px] font-mono">
                  <div className="flex items-center gap-1.5 truncate text-slate-300">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        llmStatus.daemon_online
                          ? "bg-emerald-400"
                          : "bg-amber-400"
                      }`}
                    />
                    <span className="text-emerald-300 font-semibold uppercase">
                      {llmStatus.provider}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="truncate text-slate-200">
                      {llmStatus.model}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      0% Commercial Cloud
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      fetchLocalLLMStatus();
                      setLLMModalOpen(true);
                    }}
                    className="text-sky-400 hover:underline shrink-0"
                  >
                    Configure
                  </button>
                </div>

                {/* Scoped Nodes Pill List */}
                <div className="bg-[#090D14] border border-slate-800 rounded p-2">
                  <div className="text-[10px] font-mono uppercase text-slate-400 mb-1">
                    Lassoed Subgraph Context (
                    {lassoNodeIds.length > 0 ? lassoNodeIds.length : 4} Nodes):
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(lassoNodeIds.length > 0
                      ? nodes.filter((n) => lassoNodeIds.includes(n.id))
                      : nodes.slice(0, 4)
                    ).map((n) => (
                      <span
                        key={n.id}
                        className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px] font-mono truncate max-w-[240px]"
                      >
                        {n.title}
                      </span>
                    ))}
                  </div>
                </div>

                <textarea
                  id="copilot-question-input"
                  rows={3}
                  value={copilotQuestion}
                  onChange={(e) => setCopilotQuestion(e.target.value)}
                  className="w-full bg-[#090D14] border border-slate-700 focus:border-emerald-400 rounded p-2 text-xs text-slate-100 leading-relaxed focus:outline-none"
                  placeholder="Ask a strategic or architectural question scoped strictly to the lassoed nodes..."
                />

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    id="run-subgraph-copilot-btn"
                    type="button"
                    disabled={copilotLoading}
                    onClick={handleRunCopilotQuery}
                    className="flex-1 py-2 px-2.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono uppercase tracking-wider transition flex items-center justify-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {copilotLoading
                      ? "Synthesizing..."
                      : "Query Co-Pilot"}
                  </button>

                  <button
                    id="copilot-export-pptx-btn"
                    type="button"
                    disabled={pptxDownloading}
                    onClick={handleDownloadPptx}
                    className="py-2 px-2.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono uppercase tracking-wider transition flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    .pptx
                  </button>

                  <button
                    id="export-markdown-brief-btn"
                    type="button"
                    disabled={briefDownloading}
                    onClick={handleDownloadBriefMarkdown}
                    className="py-2 px-2.5 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs font-mono uppercase tracking-wider transition flex items-center gap-1"
                    title="Export Executive Advisory Memorandum (VECTRA_Executive_Brief.md)"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {briefDownloading ? "..." : "Export Brief (.md)"}
                  </button>
                </div>

                {/* Structured Co-Pilot Output */}
                {copilotResponse && (
                  <div
                    id="copilot-structured-response"
                    className="mt-1 flex flex-col gap-2.5 border-t border-slate-800 pt-2.5 text-xs"
                  >
                    <div className="bg-[#090D14] border border-emerald-500/40 rounded p-2.5">
                      <div className="text-[10px] font-mono uppercase text-emerald-400 mb-1">
                        Executive Synthesis ({variantLens.toUpperCase()} Lens)
                      </div>
                      <p className="text-slate-100 leading-relaxed">
                        {copilotResponse.executive_answer}
                      </p>
                    </div>

                    <div className="bg-[#090D14] border border-slate-800 rounded p-2.5">
                      <div className="text-[10px] font-mono uppercase text-sky-400 mb-1">
                        90-Day Action Plan
                      </div>
                      <ul className="list-disc list-inside text-slate-200 space-y-1">
                        {copilotResponse.recommended_90_day_actions.map(
                          (act, i) => (
                            <li key={i} className="leading-snug">
                              {act}
                            </li>
                          )
                        )}
                      </ul>
                    </div>

                    <div className="bg-[#090D14] border border-slate-800 rounded p-2.5">
                      <div className="text-[10px] font-mono uppercase text-amber-400 mb-1">
                        Verified Subgraph Citations ({copilotResponse.citations_used.length})
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {copilotResponse.citations_used.map((cit) => (
                          <div
                            key={cit.source_id}
                            className="p-1.5 rounded bg-[#101722] border border-slate-800 flex items-center justify-between gap-2"
                          >
                            <span className="truncate text-[11px] text-slate-200">
                              <strong
                                className={
                                  cit.provenance_license ===
                                  "subscriber_licensed"
                                    ? "text-amber-400"
                                    : "text-emerald-400"
                                }
                              >
                                [
                                {cit.provenance_license ===
                                "subscriber_licensed"
                                  ? "Subscriber"
                                  : "Public"}
                                ]
                              </strong>{" "}
                              {cit.source_name}
                            </span>
                            <a
                              href={cit.direct_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] font-mono text-sky-400 shrink-0 hover:underline"
                            >
                              Source ↗
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* =================================================================== */}
      {/* INTERACTIVE "+ INGEST SIGNAL" MODAL (`POST /api/signals/ingest`)    */}
      {/* =================================================================== */}
      {ingestModalOpen && (
        <div
          id="ingest-signal-modal"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIngestModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#101722] border border-sky-500/40 rounded-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 bg-[#0D131F]">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-100">
                  Ingest Primary Intelligence Signal (14-Day Canonical Clustering)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIngestModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded bg-slate-800/80"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleIngestCustomSignal} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                  Signal / Topic Title
                </label>
                <input
                  id="ingest-signal-title-input"
                  type="text"
                  required
                  value={ingestTitle}
                  onChange={(e) => setIngestTitle(e.target.value)}
                  className="w-full bg-[#090D14] border border-slate-700 focus:border-sky-400 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                  Verbatim Pull-Quote (`exact_quote`)
                </label>
                <textarea
                  id="ingest-signal-quote-input"
                  rows={3}
                  required
                  value={ingestQuote}
                  onChange={(e) => setIngestQuote(e.target.value)}
                  className="w-full bg-[#090D14] border border-slate-700 focus:border-sky-400 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                    Primary Source Name
                  </label>
                  <input
                    id="ingest-signal-source-input"
                    type="text"
                    required
                    value={ingestSourceName}
                    onChange={(e) => setIngestSourceName(e.target.value)}
                    className="w-full bg-[#090D14] border border-slate-700 focus:border-sky-400 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                    Direct Verification URL
                  </label>
                  <input
                    id="ingest-signal-url-input"
                    type="url"
                    required
                    value={ingestUrl}
                    onChange={(e) => setIngestUrl(e.target.value)}
                    className="w-full bg-[#090D14] border border-slate-700 focus:border-sky-400 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                    Provenance License
                  </label>
                  <select
                    id="ingest-signal-license-select"
                    value={ingestLicense}
                    onChange={(e) =>
                      setIngestLicense(
                        e.target.value as "subscriber_licensed" | "public"
                      )
                    }
                    className="w-full bg-[#090D14] border border-slate-700 rounded px-2 py-1.5 text-xs font-mono text-slate-100"
                  >
                    <option value="subscriber_licensed">subscriber_licensed</option>
                    <option value="public">public</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                    RLS Visibility Scope
                  </label>
                  <select
                    id="ingest-signal-visibility-select"
                    value={ingestVisibility}
                    onChange={(e) =>
                      setIngestVisibility(
                        e.target.value as "user_private" | "org_private" | "global"
                      )
                    }
                    className="w-full bg-[#090D14] border border-slate-700 rounded px-2 py-1.5 text-xs font-mono text-slate-100"
                  >
                    <option value="user_private">user_private</option>
                    <option value="org_private">org_private</option>
                    <option value="global">global</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                    Industry Vertical
                  </label>
                  <select
                    id="ingest-signal-vertical-select"
                    value={ingestVertical}
                    onChange={(e) => setIngestVertical(e.target.value)}
                    className="w-full bg-[#090D14] border border-slate-700 rounded px-2 py-1.5 text-xs font-mono text-slate-100"
                  >
                    {VERTICAL_LIST.filter((v) => v !== "All Verticals").map(
                      (vert) => (
                        <option key={vert} value={vert}>
                          {vert}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIngestModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300"
                >
                  Cancel
                </button>
                <button
                  id="submit-ingest-signal-btn"
                  type="submit"
                  disabled={ingestSubmitting}
                  className="px-4 py-1.5 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs font-mono uppercase tracking-wider"
                >
                  {ingestSubmitting
                    ? "Clustering (Cosine > 0.84)..."
                    : "Ingest & Cluster Signal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* INTERACTIVE "CYPHER & SCORE MATH" MODAL (`GET /api/graph/cypher`)   */}
      {/* =================================================================== */}
      {cypherModalOpen && (
        <div
          id="cypher-score-math-modal"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setCypherModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-[#101722] border border-sky-500/40 rounded-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 bg-[#0D131F]">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-100">
                  Composite Signal Score Math & Apache AGE OpenCypher Inspector
                </h3>
              </div>
              <button
                id="close-cypher-math-modal-btn"
                type="button"
                onClick={() => setCypherModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded bg-slate-800/80"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 space-y-4 text-xs">
              {/* 1. Selected Node Real-Time Score Breakdown */}
              {selectedNode && (
                <div className="bg-[#090D14] border border-slate-800 rounded p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-amber-400">
                      Focused Canonical Node Mathematical Breakdown
                    </span>
                    <span className="font-mono text-xs text-sky-400 font-bold">
                      {selectedNode.title}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center font-mono">
                    <div className="p-2 rounded bg-[#101722] border border-slate-800">
                      <div className="text-[10px] text-slate-400">
                        S_auth (0.55×)
                      </div>
                      <div
                        id="math-source-authority-val"
                        className="text-sm font-bold text-emerald-400 mt-0.5"
                      >
                        {selectedNode.score_breakdown?.source_authority_component ??
                          80.0}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-[#101722] border border-slate-800">
                      <div className="text-[10px] text-slate-400">
                        G_centrality (0.45×)
                      </div>
                      <div
                        id="math-graph-centrality-val"
                        className="text-sm font-bold text-sky-400 mt-0.5"
                      >
                        {selectedNode.score_breakdown?.graph_centrality_component ??
                          75.0}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-[#101722] border border-slate-800">
                      <div className="text-[10px] text-slate-400">
                        W_consultant
                      </div>
                      <div
                        id="math-consultant-weight-val"
                        className="text-sm font-bold text-amber-400 mt-0.5"
                      >
                        {selectedNode.score_breakdown?.consultant_weight ??
                          selectedNode.consultant_weight}
                        x
                      </div>
                    </div>
                    <div className="p-2 rounded bg-sky-500/15 border border-sky-500/40">
                      <div className="text-[10px] text-sky-300">
                        Composite_Score
                      </div>
                      <div
                        id="math-composite-score-val"
                        className="text-sm font-bold text-slate-100 mt-0.5"
                      >
                        {selectedNode.score_breakdown?.composite_score ??
                          selectedNode.composite_score}
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] font-mono text-slate-400 bg-[#101722] px-2.5 py-1.5 rounded border border-slate-800">
                    Formula: Composite_Score = round((0.55 · S_auth + 0.45 ·
                    G_centrality) × clip(W_consultant, 0.5, 5.0), 1)
                  </div>
                </div>
              )}

              {/* 2. Live Apache AGE OpenCypher SQL Query */}
              <div className="bg-[#090D14] border border-slate-800 rounded p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase text-emerald-400">
                      Live Apache AGE OpenCypher SQL ({cypherGraphName})
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      Vertical: {activeVertical}
                    </span>
                  </div>
                  <button
                    id="copy-cypher-query-btn"
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(cypherSql);
                      setCopiedCypher(true);
                      triggerToast("Copied Apache AGE OpenCypher SQL to clipboard");
                      setTimeout(() => setCopiedCypher(false), 2000);
                    }}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-200 flex items-center gap-1"
                  >
                    {copiedCypher ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    {copiedCypher ? "Copied" : "Copy Cypher SQL"}
                  </button>
                </div>

                <pre
                  id="apache-age-cypher-code"
                  className="p-2.5 rounded bg-[#101722] border border-slate-800 font-mono text-[11px] text-sky-300 whitespace-pre-wrap overflow-x-auto leading-relaxed"
                >
                  {cypherLoading
                    ? "Loading Apache AGE OpenCypher query..."
                    : cypherSql}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* CMD+K COMMAND PALETTE MODAL (`cmdk`)                                */}
      {/* =================================================================== */}
      {cmdkOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
          onClick={() => setCmdkOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-[#101722] border border-slate-700 rounded-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <Command className="w-full">
              <div className="flex items-center border-b border-slate-800 px-3 py-2.5">
                <Search className="w-4 h-4 text-sky-400 mr-2" />
                <Command.Input
                  value={cmdkSearch}
                  onValueChange={setCmdkSearch}
                  placeholder="Jump to Canonical Node, switch Variant Lens, or trigger .pptx readout..."
                  className="w-full bg-transparent text-sm text-slate-100 focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setCmdkOpen(false)}
                  className="text-xs font-mono text-slate-400 hover:text-slate-200 px-1.5 py-0.5 bg-slate-800 rounded"
                >
                  ESC
                </button>
              </div>
              <Command.List className="max-h-80 overflow-y-auto p-2 space-y-2 text-xs">
                <Command.Empty className="p-3 text-slate-400 font-mono">
                  No matching commands or canonical nodes.
                </Command.Empty>

                <Command.Group
                  heading="Variant Lenses & Actions"
                  className="text-[10px] font-mono uppercase text-slate-400 px-2"
                >
                  <Command.Item
                    onSelect={() => {
                      setVariantLens("c_suite");
                      setCmdkOpen(false);
                    }}
                    className="p-2 rounded hover:bg-sky-500/20 text-slate-200 cursor-pointer flex items-center justify-between"
                  >
                    <span>Switch to C-Suite Executive ROI Lens</span>
                    <span className="font-mono text-sky-400">Lens</span>
                  </Command.Item>
                  <Command.Item
                    onSelect={() => {
                      setVariantLens("cto");
                      setCmdkOpen(false);
                    }}
                    className="p-2 rounded hover:bg-sky-500/20 text-slate-200 cursor-pointer flex items-center justify-between"
                  >
                    <span>Switch to CTO Architecture & Latency Lens</span>
                    <span className="font-mono text-emerald-400">Lens</span>
                  </Command.Item>
                  <Command.Item
                    onSelect={() => {
                      setVariantLens("contrarian");
                      setCmdkOpen(false);
                    }}
                    className="p-2 rounded hover:bg-sky-500/20 text-slate-200 cursor-pointer flex items-center justify-between"
                  >
                    <span>Switch to Contrarian / Failure Modes Lens</span>
                    <span className="font-mono text-rose-400">Lens</span>
                  </Command.Item>
                  <Command.Item
                    onSelect={() => {
                      setCmdkOpen(false);
                      handleDownloadPptx();
                    }}
                    className="p-2 rounded hover:bg-amber-500/20 text-amber-300 cursor-pointer flex items-center justify-between"
                  >
                    <span>Generate & Download Executive .pptx Deck</span>
                    <span className="font-mono">python-pptx</span>
                  </Command.Item>
                  <Command.Item
                    onSelect={() => {
                      setCmdkOpen(false);
                      handleDownloadBriefMarkdown();
                    }}
                    className="p-2 rounded hover:bg-sky-500/20 text-sky-300 cursor-pointer flex items-center justify-between"
                  >
                    <span>Generate & Download Executive Brief (.md)</span>
                    <span className="font-mono">Markdown</span>
                  </Command.Item>
                </Command.Group>

                <Command.Group
                  heading="Canonical Intelligence Nodes"
                  className="text-[10px] font-mono uppercase text-slate-400 px-2 pt-2"
                >
                  {nodes.map((n) => (
                    <Command.Item
                      key={n.id}
                      onSelect={() => {
                        setSelectedNodeId(n.id);
                        setCmdkOpen(false);
                      }}
                      className="p-2 rounded hover:bg-slate-800 text-slate-100 cursor-pointer flex items-center justify-between"
                    >
                      <span className="truncate">{n.title}</span>
                      <span className="font-mono text-sky-400 ml-2">
                        {n.composite_score}
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              </Command.List>
            </Command>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SOVEREIGN LOCAL LLM & EMBEDDINGS RUNTIME MODAL (`/api/llm/config`)  */}
      {/* =================================================================== */}
      {llmModalOpen && (
        <div
          id="local-llm-config-modal"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLLMModalOpen(false)}
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
                onClick={() => setLLMModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded bg-slate-800/80"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveLocalLLMConfig}
              className="p-4 space-y-3 text-xs"
            >
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
                  {(
                    [
                      { id: "ollama", label: "Ollama (Default)" },
                      { id: "litellm_proxy", label: "LiteLLM Local" },
                      { id: "vllm", label: "vLLM (GPU)" },
                      { id: "llamacpp", label: "llama.cpp" },
                      { id: "lmstudio", label: "LM Studio" },
                    ] as { id: LocalLLMProvider; label: string }[]
                  ).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectLLMProviderPreset(p.id)}
                      className={`py-1.5 px-2 rounded font-mono text-[10px] border transition ${
                        llmProviderInput === p.id
                          ? "bg-emerald-500 text-slate-950 font-bold border-emerald-400"
                          : "bg-[#090D14] text-slate-300 border-slate-700 hover:border-slate-500"
                      }`}
                    >
                      {p.label}
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
                    onChange={(e) => setLLMBaseUrlInput(e.target.value)}
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
                    onChange={(e) => setLLMEmbedModelInput(e.target.value)}
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
                  onChange={(e) => setLLMModelInput(e.target.value)}
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
                      onClick={() => setLLMModelInput(m)}
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
                  onClick={() => setLLMModalOpen(false)}
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

      {/* =================================================================== */}
      {/* ZERO-TRUST MCP GATEWAY INSPECTOR MODAL (`/api/mcp/status` & `/rpc`) */}
      {/* =================================================================== */}
      {mcpModalOpen && (
        <div
          id="mcp-gateway-modal"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setMCPModalOpen(false)}
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
                onClick={() => setMCPModalOpen(false)}
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
                  {(mcpStatus?.tools || [
                    { name: "vectra_get_rls_subgraph", server_id: "vectra-graph-mcp", required_scope: "graph:read" },
                    { name: "vectra_get_verified_citations", server_id: "vectra-citations-mcp", required_scope: "citations:read" },
                    { name: "vectra_get_consultant_notes", server_id: "vectra-notes-mcp", required_scope: "notes:read" },
                    { name: "vectra_inspect_cypher", server_id: "vectra-graph-mcp", required_scope: "cypher:read" },
                    { name: "vectra_compute_local_embedding", server_id: "vectra-embeddings-mcp", required_scope: "embeddings:compute" },
                  ]).map((t) => (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => handleTestMCPToolCall(t.name)}
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
    </div>
  );
}

