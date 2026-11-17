"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useVectraRuntimeActions } from "@/hooks/useVectraRuntimeActions";
import {
  evaluateNodeContextMatch,
  getNodeAssociations,
  NodeContextMatchResult,
} from "@/lib/contextMatcher";
import {
  AssociativeEdgeItem,
  CanonicalNodeItem,
  CopilotStructuredResponse,
  RelationType,
  UserIntegrationItem,
  VariantLens,
} from "@/types/vectra";

const TENANT_QS = "tenant_user_id=erik&tenant_org_id=vectra-advisory";
export type RightInspectorTab = "associations" | "citations" | "notes" | "copilot";

export function useVectraWorkspace() {
  const [nodes, setNodes] = useState<CanonicalNodeItem[]>([]);
  const [edges, setEdges] = useState<AssociativeEdgeItem[]>([]);
  const [integrations, setIntegrations] = useState<UserIntegrationItem[]>([]);
  const [activeVertical, setActiveVertical] = useState<string>("All Verticals");
  const [variantLens, setVariantLens] = useState<VariantLens>("c_suite");
  const [centerMode, setCenterMode] = useState<"graph" | "matrix">("graph");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<RightInspectorTab>("associations");

  // Target Context Expression & Association Relation Filter
  const [contextQuery, setContextQuery] = useState<string>("");
  const [relationFilter, setRelationFilter] = useState<RelationType | "ALL">("ALL");

  const [lassoModeActive, setLassoModeActive] = useState<boolean>(false);
  const [lassoNodeIds, setLassoNodeIds] = useState<string[]>([]);
  const [connectModeSourceId, setConnectModeSourceId] = useState<string | null>(null);
  const [weightSliderValue, setWeightSliderValue] = useState<number>(1.5);

  const [cmdkOpen, setCmdkOpen] = useState<boolean>(false);
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [ingestModalOpen, setIngestModalOpen] = useState<boolean>(false);

  const [cypherModalOpen, setCypherModalOpen] = useState<boolean>(false);
  const [cypherSql, setCypherSql] = useState<string>("");
  const [cypherGraphName, setCypherGraphName] = useState<string>("vectra_knowledge_graph");
  const [cypherLoading, setCypherLoading] = useState<boolean>(false);

  const [copilotQuestion, setCopilotQuestion] = useState<string>(
    "Synthesize the audited production ROI, p99 latency architecture, and SR 11-7 / EU AI Act governance risks across this lassoed subgraph."
  );
  const [copilotLoading, setCopilotLoading] = useState<boolean>(false);
  const [copilotResponse, setCopilotResponse] = useState<CopilotStructuredResponse | null>(null);
  const [pptxDownloading, setPptxDownloading] = useState<boolean>(false);
  const [briefDownloading, setBriefDownloading] = useState<boolean>(false);

  const triggerToast = useCallback((msg: string) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast((prev) => (prev === msg ? null : prev)), 4500);
  }, []);

  const fetchWorkspaceData = useCallback(
    async (verticalOverride?: string, preserveSelection = true) => {
      const targetVert = verticalOverride ?? activeVertical;
      const [graphRes, integRes] = await Promise.all([
        fetch(`/api/graph?vertical=${encodeURIComponent(targetVert)}&${TENANT_QS}`),
        fetch(`/api/integrations?${TENANT_QS}`),
      ]);
      if (graphRes.ok) {
        const data = await graphRes.json();
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
        if (data.nodes?.length > 0) {
          setSelectedNodeId((prev) =>
            preserveSelection && prev && data.nodes.some((n: CanonicalNodeItem) => n.id === prev)
              ? prev
              : data.nodes[0].id
          );
        }
      }
      if (integRes.ok) {
        const idata = await integRes.json();
        setIntegrations(idata.integrations || []);
      }
    },
    [activeVertical]
  );

  const runtime = useVectraRuntimeActions({
    activeVertical, variantLens, lassoNodeIds, fetchWorkspaceData, triggerToast,
  });
  const { setLLMModalOpen, setMCPModalOpen, setCollectorModalOpen } = runtime;

  useEffect(() => {
    fetchWorkspaceData("All Verticals", false);
    runtime.fetchLocalLLMStatus();
    runtime.fetchCollectorPacks();
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdkOpen((open) => !open);
      } else if (e.key === "Escape") {
        setCmdkOpen(false);
        setIngestModalOpen(false);
        setCypherModalOpen(false);
        setLLMModalOpen(false);
        setMCPModalOpen(false);
        setCollectorModalOpen(false);
        setConnectModeSourceId(null);
        setLassoModeActive(false);
      }
    };
    window.addEventListener("keydown", down, true);
    return () => window.removeEventListener("keydown", down, true);
  }, [setLLMModalOpen, setMCPModalOpen, setCollectorModalOpen]);

  const nodeMatchMap = useMemo(() => {
    const map: Record<string, NodeContextMatchResult> = {};
    for (const node of nodes) {
      map[node.id] = evaluateNodeContextMatch(node, edges, nodes, {
        query: contextQuery,
        activeVertical,
        variantLens,
        relationFilter,
      });
    }
    return map;
  }, [nodes, edges, contextQuery, activeVertical, variantLens, relationFilter]);

  const visibleNodes = useMemo(() => {
    const matched = nodes.filter((n) => nodeMatchMap[n.id]?.matchesExpression);
    if (contextQuery.trim()) {
      return [...matched].sort(
        (a, b) =>
          (nodeMatchMap[b.id]?.matchScore || 0) - (nodeMatchMap[a.id]?.matchScore || 0) ||
          b.composite_score - a.composite_score
      );
    }
    return matched;
  }, [nodes, nodeMatchMap, contextQuery]);

  const visibleEdges = useMemo(() => {
    const idSet = new Set(visibleNodes.map((n) => n.id));
    return edges.filter(
      (e) =>
        idSet.has(e.source_node_id) &&
        idSet.has(e.target_node_id) &&
        (relationFilter === "ALL" || e.relation_type === relationFilter)
    );
  }, [edges, visibleNodes, relationFilter]);

  const selectedNode = useMemo(
    () =>
      visibleNodes.find((n) => n.id === selectedNodeId) ||
      nodes.find((n) => n.id === selectedNodeId) ||
      visibleNodes[0] || nodes[0] || null,
    [visibleNodes, nodes, selectedNodeId]
  );

  useEffect(() => {
    if (selectedNode) setWeightSliderValue(selectedNode.consultant_weight);
  }, [selectedNode?.id, selectedNode?.consultant_weight]);

  const handleVerticalChange = async (vertical: string) => {
    setActiveVertical(vertical);
    await fetchWorkspaceData(vertical, false);
    triggerToast(`Filtered Canonical Graph to: ${vertical}`);
  };

  const handleWeightCommit = async (newWeight: number) => {
    if (!selectedNode) return;
    setWeightSliderValue(newWeight);
    const res = await fetch(`/api/nodes/${selectedNode.id}/weight?${TENANT_QS}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consultant_weight: newWeight }),
    });
    if (res.ok) {
      await fetchWorkspaceData(activeVertical, true);
      triggerToast(`Updated Consultant Weight to ${newWeight.toFixed(1)}x — Recomputed Composite Score`);
    }
  };

  const handleSaveNoteAndSyncWikilinks = async (nodeId: string, markdownContent: string, relationType: RelationType) => {
    const res = await fetch(`/api/nodes/${nodeId}/note?${TENANT_QS}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markdown_content: markdownContent, default_relation_type: relationType }),
    });
    if (res.ok) {
      const payload = await res.json();
      await fetchWorkspaceData(activeVertical, true);
      triggerToast(`Synced ${payload.upserted_edges?.length || 0} [[Wikilink]] associative edge(s) onto live WebGL graph`);
    }
  };

  const handleCreateEdgeBetween = async (sourceId: string, targetId: string, relationType: RelationType, rationaleNote?: string) => {
    setConnectModeSourceId(null);
    const res = await fetch(`/api/edges?${TENANT_QS}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_node_id: sourceId, target_node_id: targetId, relation_type: relationType,
        weight: 2.5, consultant_note: rationaleNote || "Connected interactively on VECTRA Canvas",
      }),
    });
    if (res.ok) {
      await fetchWorkspaceData(activeVertical, true);
      triggerToast(`Created ${relationType} association on Knowledge Graph`);
    }
  };

  const handleUpdateLassoNodes = (ids: string[]) => {
    setLassoNodeIds(ids);
    setLassoModeActive(false);
    setRightTab("copilot");
    triggerToast(`Lassoed ${ids.length} Canonical Node(s) into Subgraph Co-Pilot RAG context`);
  };

  const handleToggleLassoNode = (nodeId: string) => {
    setLassoNodeIds((prev) =>
      prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]
    );
  };

  const handleScopeNeighborhood = (focalNodeId: string) => {
    const { neighborIds } = getNodeAssociations(focalNodeId, nodes, edges, relationFilter);
    const scoped = Array.from(new Set([focalNodeId, ...neighborIds]));
    setLassoNodeIds(scoped);
    setRightTab("copilot");
    triggerToast(`Scoped 1-hop associative neighborhood (${scoped.length} nodes) into Co-Pilot`);
  };

  const handleQuickLassoSubgraph = () => {
    const sourcePool = visibleNodes.length > 0 ? visibleNodes : nodes;
    const topIds = sourcePool.slice(0, Math.min(4, sourcePool.length)).map((n) => n.id);
    setLassoNodeIds(topIds);
    setRightTab("copilot");
    triggerToast(`Lassoed ${topIds.length} context-matched nodes into Subgraph Co-Pilot`);
  };

  const handleRunCopilotQuery = async () => {
    setCopilotLoading(true);
    try {
      const sourcePool = visibleNodes.length > 0 ? visibleNodes : nodes;
      const targetIds = lassoNodeIds.length > 0 ? lassoNodeIds : sourcePool.slice(0, 4).map((n) => n.id);
      if (lassoNodeIds.length === 0) setLassoNodeIds(targetIds);
      const res = await fetch(`/api/copilot/query?${TENANT_QS}`, {
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

  const downloadDeliverable = async (endpoint: string, filename: string, setBusy: (b: boolean) => void) => {
    setBusy(true);
    try {
      const sourcePool = visibleNodes.length > 0 ? visibleNodes : nodes;
      const targetIds = lassoNodeIds.length > 0 ? lassoNodeIds : sourcePool.slice(0, 5).map((n) => n.id);
      const res = await fetch(`${endpoint}?${TENANT_QS}`, {
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
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        triggerToast(`Downloaded ${filename} (${(blob.size / 1024).toFixed(1)} KB)`);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadPptx = () =>
    downloadDeliverable(
      "/api/export/pptx",
      `VECTRA_Executive_Readout_${variantLens.toUpperCase()}.pptx`,
      setPptxDownloading
    );

  const handleDownloadBriefMarkdown = () =>
    downloadDeliverable("/api/export/brief", "VECTRA_Executive_Brief.md", setBriefDownloading);

  const handleOpenCypherModal = async () => {
    setCypherModalOpen(true);
    setCypherLoading(true);
    try {
      const res = await fetch(`/api/graph/cypher?vertical=${encodeURIComponent(activeVertical)}&${TENANT_QS}`);
      if (res.ok) {
        const data = await res.json();
        setCypherSql(data.open_cypher_sql || "");
        setCypherGraphName(data.graph_name || "vectra_knowledge_graph");
      }
    } finally {
      setCypherLoading(false);
    }
  };

  const handleLaunchBoardroomMode = async () => {
    const sourcePool = visibleNodes.length > 0 ? visibleNodes : nodes;
    const targetIds = lassoNodeIds.length > 0 ? lassoNodeIds : sourcePool.map((n) => n.id);
    const res = await fetch(`/api/present/session?${TENANT_QS}`, {
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

  const handleRefreshIntegration = async (provider: string) => {
    const res = await fetch(`/api/integrations/${provider}/refresh?${TENANT_QS}`, { method: "POST" });
    if (res.ok) {
      await fetchWorkspaceData(activeVertical, true);
      triggerToast(`Temporal Worker decrypted & rotated ${provider} credentials in-memory (Status: HEALTHY)`);
    }
  };

  const handleSimulateInboundNewsletter = async () => {
    const res = await fetch(`/api/webhooks/inbound-email?${TENANT_QS}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: "intel+erik@ingest.vectra.ai",
        sender_publication: "Stratechery Executive Dispatch",
        author_handle: "@benthompson",
        subject: "Agentic KYC & Real-Time Fraud Settlement Pipelines",
        direct_url: "https://stratechery.com/2026/deterministic-state-graphs-in-banking/",
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

  return {
    nodes, visibleNodes, edges, visibleEdges, nodeMatchMap, integrations,
    activeVertical, variantLens, setVariantLens,
    contextQuery, setContextQuery, relationFilter, setRelationFilter,
    centerMode, setCenterMode, selectedNode, setSelectedNodeId, rightTab, setRightTab,
    lassoModeActive, setLassoModeActive, lassoNodeIds, connectModeSourceId, setConnectModeSourceId,
    weightSliderValue, cmdkOpen, setCmdkOpen, statusToast, triggerToast,
    ingestModalOpen, setIngestModalOpen, cypherModalOpen, setCypherModalOpen,
    cypherSql, cypherGraphName, cypherLoading, copilotQuestion, setCopilotQuestion,
    copilotLoading, copilotResponse, pptxDownloading, briefDownloading,
    fetchWorkspaceData, handleVerticalChange, handleWeightCommit,
    handleSaveNoteAndSyncWikilinks, handleCreateEdgeBetween, handleUpdateLassoNodes,
    handleToggleLassoNode, handleScopeNeighborhood, handleQuickLassoSubgraph,
    handleRunCopilotQuery, handleDownloadPptx, handleDownloadBriefMarkdown,
    handleOpenCypherModal, handleLaunchBoardroomMode, handleRefreshIntegration,
    handleSimulateInboundNewsletter,
    ...runtime,
  };
}
