"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  AssociativeEdgeItem,
  CanonicalNodeItem,
  RelationType,
  VariantLens,
} from "@/types/vectra";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

interface AssociativeGraphCanvasProps {
  nodes: CanonicalNodeItem[];
  edges: AssociativeEdgeItem[];
  selectedNodeId: string | null;
  lassoNodeIds: string[];
  variantLens: VariantLens;
  lassoModeActive: boolean;
  connectModeSourceId: string | null;
  activeRelationForLink?: RelationType;
  onSelectNode: (nodeId: string) => void;
  onUpdateLassoNodes: (nodeIds: string[]) => void;
  onCreateEdgeBetween: (
    sourceId: string,
    targetId: string,
    relationType: RelationType
  ) => void;
}

const RELATION_COLOR: Record<RelationType, string> = {
  ENABLES: "#38BDF8",
  CASE_STUDY_OF: "#10B981",
  REGULATES: "#F59E0B",
  CONFLICTS_WITH: "#F43F5E",
  REPLACES: "#94A3B8",
};

const MATURITY_COLOR: Record<string, string> = {
  production_scale: "#10B981",
  pilot: "#38BDF8",
  research: "#F59E0B",
};

export default function AssociativeGraphCanvas({
  nodes,
  edges,
  selectedNodeId,
  lassoNodeIds,
  variantLens,
  lassoModeActive,
  connectModeSourceId,
  activeRelationForLink = "ENABLES",
  onSelectNode,
  onUpdateLassoNodes,
  onCreateEdgeBetween,
}: AssociativeGraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fgRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 820, height: 560 });
  const [lassoRect, setLassoRect] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);

  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setDimensions({
        width: Math.max(400, Math.floor(rect.width)),
        height: Math.max(360, Math.floor(rect.height)),
      });
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const graphData = useMemo(() => {
    const clonedNodes = nodes.map((n, idx) => {
      const angle = (2 * Math.PI * idx) / Math.max(1, nodes.length);
      return {
        ...n,
        x: n.x ?? Math.cos(angle) * 230,
        y: n.y ?? Math.sin(angle) * 175,
      };
    });
    const nodeIds = new Set(clonedNodes.map((n) => n.id));
    const clonedLinks = edges
      .filter((e) => nodeIds.has(e.source_node_id) && nodeIds.has(e.target_node_id))
      .map((e) => ({
        ...e,
        source: e.source_node_id,
        target: e.target_node_id,
      }));
    return { nodes: clonedNodes, links: clonedLinks };
  }, [nodes, edges]);

  // Configure spacious D3 repulsion & link distance so nodes and edge labels never bunch up
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.d3Force?.("charge")?.strength?.(-460);
    fg.d3Force?.("link")?.distance?.(138);
    fg.d3ReheatSimulation?.();
    const timer = setTimeout(() => fg.zoomToFit?.(180, 56), 320);
    return () => clearTimeout(timer);
  }, [graphData]);

  // 1-Hop Associative Neighborhood around Selected Node
  const { neighborIds, neighborNodes } = useMemo(() => {
    if (!selectedNodeId) return { neighborIds: new Set<string>(), neighborNodes: [] };
    const nSet = new Set<string>();
    for (const e of edges) {
      if (e.source_node_id === selectedNodeId) nSet.add(e.target_node_id);
      if (e.target_node_id === selectedNodeId) nSet.add(e.source_node_id);
    }
    const list = nodes.filter((n) => nSet.has(n.id));
    return { neighborIds: nSet, neighborNodes: list };
  }, [selectedNodeId, edges, nodes]);

  const handleNodeClick = useCallback(
    (node: any) => {
      if (!node?.id) return;
      if (connectModeSourceId && connectModeSourceId !== node.id) {
        onCreateEdgeBetween(connectModeSourceId, node.id, activeRelationForLink);
        return;
      }
      onSelectNode(node.id);
    },
    [connectModeSourceId, activeRelationForLink, onCreateEdgeBetween, onSelectNode]
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((!lassoModeActive && !e.shiftKey) || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLassoRect({ startX: x, startY: y, endX: x, endY: y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!lassoRect || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setLassoRect((prev) =>
      prev ? { ...prev, endX: e.clientX - rect.left, endY: e.clientY - rect.top } : null
    );
  };

  const handleMouseUp = () => {
    if (!lassoRect) return;
    const minX = Math.min(lassoRect.startX, lassoRect.endX);
    const maxX = Math.max(lassoRect.startX, lassoRect.endX);
    const minY = Math.min(lassoRect.startY, lassoRect.endY);
    const maxY = Math.max(lassoRect.startY, lassoRect.endY);

    if (maxX - minX > 16 && maxY - minY > 16) {
      const capturedIds: string[] = [];
      for (const n of graphData.nodes as any[]) {
        if (fgRef.current && typeof fgRef.current.graph2ScreenCoords === "function") {
          const sc = fgRef.current.graph2ScreenCoords(n.x || 0, n.y || 0);
          if (sc.x >= minX && sc.x <= maxX && sc.y >= minY && sc.y <= maxY) {
            capturedIds.push(n.id);
          }
        }
      }
      if (capturedIds.length === 0 && graphData.nodes.length > 0) {
        capturedIds.push(...graphData.nodes.slice(0, 3).map((n) => n.id));
      }
      onUpdateLassoNodes(capturedIds);
    }
    setLassoRect(null);
  };

  const isIncidentLink = (link: any) =>
    !selectedNodeId ||
    link.source_node_id === selectedNodeId ||
    link.target_node_id === selectedNodeId;

  return (
    <div
      ref={containerRef}
      id="associative-graph-canvas-container"
      className="relative w-full h-full bg-[#090D14] overflow-hidden select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={Math.max(300, dimensions.height - 56)}
        graphData={graphData}
        backgroundColor="#090D14"
        enableNodeDrag={!lassoModeActive}
        enablePanInteraction={!lassoModeActive}
        cooldownTicks={80}
        d3VelocityDecay={0.34}
        onEngineStop={() => fgRef.current?.zoomToFit?.(220, 62)}
        onNodeClick={handleNodeClick}
        linkDirectionalArrowLength={5.5}
        linkDirectionalArrowRelPos={0.88}
        linkWidth={(link: any) => {
          const incident = isIncidentLink(link);
          if (!incident) return 1.0;
          return link.is_user_created ? Math.max(2.6, (link.weight || 1.5) * 1.1) : 2.1;
        }}
        linkColor={(link: any) => {
          const base = link.is_user_created
            ? "#F59E0B"
            : RELATION_COLOR[link.relation_type as RelationType] || "#38BDF8";
          return isIncidentLink(link) ? base : "rgba(100, 116, 139, 0.24)";
        }}
        linkCanvasObjectMode={() => "after"}
        linkCanvasObject={(link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
          if (!isIncidentLink(link)) return;
          const start = link.source;
          const end = link.target;
          if (typeof start !== "object" || typeof end !== "object") return;
          const midX = (start.x + end.x) / 2;
          const midY = (start.y + end.y) / 2;
          const label = link.is_user_created
            ? `[[${link.relation_type}]]`
            : link.relation_type;

          const fontSize = Math.max(8, 9.5 / Math.max(0.8, globalScale));
          ctx.save();
          ctx.font = `600 ${fontSize}px JetBrains Mono, monospace`;
          const textWidth = ctx.measureText(label).width;
          ctx.fillStyle = "rgba(9, 13, 20, 0.9)";
          ctx.fillRect(midX - textWidth / 2 - 3, midY - fontSize / 2 - 2, textWidth + 6, fontSize + 4);
          ctx.fillStyle = link.is_user_created
            ? "#F59E0B"
            : RELATION_COLOR[link.relation_type as RelationType] || "#94A3B8";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(label, midX, midY);
          ctx.restore();
        }}
        nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const score = Number(node.composite_score || 80);
          const radius = Math.max(9, Math.min(17, 7 + Math.sqrt(score) * 0.42));
          const isSelected = node.id === selectedNodeId;
          const isNeighbor = neighborIds.has(node.id);
          const isLassoed = lassoNodeIds.includes(node.id);
          const isConnectSource = node.id === connectModeSourceId;
          const dimmed = Boolean(selectedNodeId && !isSelected && !isNeighbor && !isLassoed);
          const fillColor = MATURITY_COLOR[node.maturity_stage] || "#38BDF8";

          ctx.save();
          ctx.globalAlpha = dimmed ? 0.42 : 1.0;

          if (isSelected || isLassoed || isConnectSource || isNeighbor) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius + (isSelected ? 5.5 : 3.5), 0, 2 * Math.PI, false);
            ctx.strokeStyle = isConnectSource
              ? "#F43F5E"
              : isSelected
              ? "#38BDF8"
              : isLassoed
              ? "#F59E0B"
              : "rgba(56, 189, 248, 0.45)";
            ctx.lineWidth = (isSelected ? 2.4 : 1.5) / Math.max(0.7, globalScale);
            ctx.stroke();
          }

          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
          ctx.fillStyle = "#101722";
          ctx.fill();
          ctx.lineWidth = 2.2;
          ctx.strokeStyle = fillColor;
          ctx.stroke();

          const scoreFontSize = Math.max(7, Math.min(10, radius * 0.65));
          ctx.font = `700 ${scoreFontSize}px JetBrains Mono, monospace`;
          ctx.fillStyle = "#F8FAFC";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(Math.round(score)), node.x, node.y);

          const shortTitle = node.title.length > 32 ? `${node.title.slice(0, 30)}…` : node.title;
          const labelFontSize = Math.max(8.5, 10.5 / Math.max(0.85, globalScale));
          ctx.font = `500 ${labelFontSize}px Inter, system-ui, sans-serif`;
          const tw = ctx.measureText(shortTitle).width;
          const labelY = node.y + radius + labelFontSize + 3;

          ctx.fillStyle = isSelected ? "rgba(56, 189, 248, 0.24)" : "rgba(16, 23, 34, 0.88)";
          ctx.fillRect(node.x - tw / 2 - 4, labelY - labelFontSize / 2 - 2, tw + 8, labelFontSize + 4);
          ctx.fillStyle = isSelected ? "#38BDF8" : "#E2E8F0";
          ctx.fillText(shortTitle, node.x, labelY);
          ctx.restore();
        }}
      />

      {lassoRect && (
        <div
          id="active-lasso-selection-box"
          className="pointer-events-none absolute border-2 border-dashed border-amber-400 bg-amber-400/10 rounded"
          style={{
            left: Math.min(lassoRect.startX, lassoRect.endX),
            top: Math.min(lassoRect.startY, lassoRect.endY),
            width: Math.abs(lassoRect.endX - lassoRect.startX),
            height: Math.abs(lassoRect.endY - lassoRect.startY),
          }}
        />
      )}

      {/* Bottom 1-Hop Neighbor Quick-Jump & Semantics Strip */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 pointer-events-auto bg-[#101722]/95 border border-slate-800 rounded px-2.5 py-1.5 text-[11px] space-y-1">
        {neighborNodes.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <span className="font-mono text-[10px] uppercase text-sky-400 shrink-0">
              1-Hop Linked:
            </span>
            {neighborNodes.map((nb) => (
              <button
                key={nb.id}
                type="button"
                onClick={() => onSelectNode(nb.id)}
                className="px-2 py-0.5 rounded bg-[#090D14] hover:bg-sky-500/20 border border-slate-700 hover:border-sky-400 text-[10px] font-mono text-slate-200 truncate max-w-[175px] shrink-0 transition"
              >
                {nb.title.slice(0, 24)}… ↗
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-sky-400">■ ENABLES</span>
            <span className="text-emerald-400">■ CASE_STUDY</span>
            <span className="text-amber-400">■ REGULATES / [[WIKILINK]]</span>
            <span className="text-rose-400">■ CONFLICTS</span>
          </div>
          <span className="text-slate-400">
            Lens: <strong className="text-sky-300 uppercase">{variantLens}</strong> • Shift+Drag Lasso
          </span>
        </div>
      </div>
    </div>
  );
}
