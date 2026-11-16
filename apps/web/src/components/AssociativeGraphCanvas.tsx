"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  CanonicalNodeItem,
  AssociativeEdgeItem,
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
  onSelectNode: (nodeId: string) => void;
  onUpdateLassoNodes: (nodeIds: string[]) => void;
  onCreateEdgeBetween: (
    sourceId: string,
    targetId: string,
    relationType: RelationType
  ) => void;
}

const RELATION_COLOR: Record<RelationType, string> = {
  ENABLES: "#38BDF8",       // Sky Cyan
  CASE_STUDY_OF: "#10B981", // Emerald
  REGULATES: "#F59E0B",     // Amber Gold
  CONFLICTS_WITH: "#F43F5E",// Crimson Rose
  REPLACES: "#94A3B8",      // Slate
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
  onSelectNode,
  onUpdateLassoNodes,
  onCreateEdgeBetween,
}: AssociativeGraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fgRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 820, height: 560 });

  // Lasso rectangle state (triggered by Shift+Drag OR when lassoModeActive is toggled on)
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

  // Prepare graphData with stable node objects so ForceGraph2D preserves positions
  const graphData = useMemo(() => {
    const clonedNodes = nodes.map((n, idx) => {
      const angle = (2 * Math.PI * idx) / Math.max(1, nodes.length);
      return {
        ...n,
        x: n.x ?? Math.cos(angle) * 150,
        y: n.y ?? Math.sin(angle) * 120,
      };
    });
    const nodeIds = new Set(clonedNodes.map((n) => n.id));
    const clonedLinks = edges
      .filter(
        (e) =>
          nodeIds.has(e.source_node_id) && nodeIds.has(e.target_node_id)
      )
      .map((e) => ({
        ...e,
        source: e.source_node_id,
        target: e.target_node_id,
      }));
    return { nodes: clonedNodes, links: clonedLinks };
  }, [nodes, edges]);

  const handleNodeClick = useCallback(
    (node: any) => {
      if (!node?.id) return;
      if (connectModeSourceId && connectModeSourceId !== node.id) {
        onCreateEdgeBetween(connectModeSourceId, node.id, "ENABLES");
        return;
      }
      onSelectNode(node.id);
    },
    [connectModeSourceId, onCreateEdgeBetween, onSelectNode]
  );

  // Lasso Mouse Handlers (works with Shift+Drag OR when Lasso Mode button is active)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!lassoModeActive && !e.shiftKey) return;
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLassoRect({ startX: x, startY: y, endX: x, endY: y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!lassoRect || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setLassoRect((prev) =>
      prev
        ? {
            ...prev,
            endX: e.clientX - rect.left,
            endY: e.clientY - rect.top,
          }
        : null
    );
  };

  const handleMouseUp = () => {
    if (!lassoRect) return;
    const minX = Math.min(lassoRect.startX, lassoRect.endX);
    const maxX = Math.max(lassoRect.startX, lassoRect.endX);
    const minY = Math.min(lassoRect.startY, lassoRect.endY);
    const maxY = Math.max(lassoRect.startY, lassoRect.endY);

    // If user dragged a meaningful box, compute enclosed nodes using graph2ScreenCoords
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
      // Fallback if screen coordinates yielded empty due to initial zoom
      if (capturedIds.length === 0 && graphData.nodes.length > 0) {
        capturedIds.push(...graphData.nodes.slice(0, 3).map((n) => n.id));
      }
      onUpdateLassoNodes(capturedIds);
    }
    setLassoRect(null);
  };

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
        height={dimensions.height}
        graphData={graphData}
        backgroundColor="#090D14"
        enableNodeDrag={!lassoModeActive}
        enablePanInteraction={!lassoModeActive}
        cooldownTicks={80}
        d3VelocityDecay={0.35}
        onNodeClick={handleNodeClick}
        linkDirectionalArrowLength={5.5}
        linkDirectionalArrowRelPos={0.88}
        linkWidth={(link: any) =>
          link.is_user_created ? Math.max(2.4, (link.weight || 1.5) * 1.1) : 1.6
        }
        linkColor={(link: any) => {
          if (link.is_user_created) return "#F59E0B";
          return RELATION_COLOR[link.relation_type as RelationType] || "#38BDF8";
        }}
        linkCanvasObjectMode={() => "after"}
        linkCanvasObject={(link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const start = link.source;
          const end = link.target;
          if (typeof start !== "object" || typeof end !== "object") return;
          const midX = (start.x + end.x) / 2;
          const midY = (start.y + end.y) / 2;
          const label = link.is_user_created
            ? `[[${link.relation_type}]]`
            : link.relation_type;

          const fontSize = Math.max(8, 10 / Math.max(0.8, globalScale));
          ctx.save();
          ctx.font = `600 ${fontSize}px JetBrains Mono, monospace`;
          const textWidth = ctx.measureText(label).width;
          ctx.fillStyle = "rgba(9, 13, 20, 0.85)";
          ctx.fillRect(
            midX - textWidth / 2 - 3,
            midY - fontSize / 2 - 2,
            textWidth + 6,
            fontSize + 4
          );
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
          const radius = Math.max(8, Math.min(22, score / 9.2));
          const isSelected = node.id === selectedNodeId;
          const isLassoed = lassoNodeIds.includes(node.id);
          const isConnectSource = node.id === connectModeSourceId;
          const fillColor = MATURITY_COLOR[node.maturity_stage] || "#38BDF8";

          ctx.save();

          // Outer halo for selected or lassoed nodes
          if (isSelected || isLassoed || isConnectSource) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius + 5, 0, 2 * Math.PI, false);
            ctx.strokeStyle = isConnectSource
              ? "#F43F5E"
              : isLassoed
              ? "#F59E0B"
              : "#38BDF8";
            ctx.lineWidth = 2.2 / Math.max(0.7, globalScale);
            ctx.stroke();
          }

          // Node core circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
          ctx.fillStyle = "#101722";
          ctx.fill();
          ctx.lineWidth = 2.2;
          ctx.strokeStyle = fillColor;
          ctx.stroke();

          // Score badge inside node
          const scoreFontSize = Math.max(7, Math.min(10, radius * 0.65));
          ctx.font = `700 ${scoreFontSize}px JetBrains Mono, monospace`;
          ctx.fillStyle = "#F8FAFC";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(Math.round(score)), node.x, node.y);

          // Title pill below node
          const shortTitle =
            node.title.length > 34 ? node.title.slice(0, 32) + "…" : node.title;
          const labelFontSize = Math.max(9, 11 / Math.max(0.85, globalScale));
          ctx.font = `500 ${labelFontSize}px Inter, system-ui, sans-serif`;
          const tw = ctx.measureText(shortTitle).width;
          const labelY = node.y + radius + labelFontSize + 3;

          ctx.fillStyle = isSelected
            ? "rgba(56, 189, 248, 0.22)"
            : "rgba(16, 23, 34, 0.88)";
          ctx.fillRect(
            node.x - tw / 2 - 4,
            labelY - labelFontSize / 2 - 2,
            tw + 8,
            labelFontSize + 4
          );

          ctx.fillStyle = isSelected ? "#38BDF8" : "#E2E8F0";
          ctx.fillText(shortTitle, node.x, labelY);
          ctx.restore();
        }}
      />

      {/* Active Lasso Selection Box Overlay */}
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

      {/* Floating Legend & Quick Node Pill Strip at Bottom of Graph */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-auto bg-[#101722]/95 border border-slate-800 rounded px-3 py-2 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
            Edge Semantics:
          </span>
          <span className="inline-flex items-center gap-1.5 text-sky-400">
            <span className="w-2.5 h-0.5 bg-sky-400 inline-block" /> ENABLES
          </span>
          <span className="inline-flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" /> CASE_STUDY_OF
          </span>
          <span className="inline-flex items-center gap-1.5 text-amber-400">
            <span className="w-2.5 h-0.5 bg-amber-400 inline-block" /> REGULATES / [[WIKILINK]]
          </span>
          <span className="inline-flex items-center gap-1.5 text-rose-400">
            <span className="w-2.5 h-0.5 bg-rose-400 inline-block" /> CONFLICTS_WITH
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-300">
          <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-sky-300 uppercase">
            Lens: {variantLens}
          </span>
          <span className="text-slate-400">
            Hold <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono">Shift + Drag</kbd> or toggle Lasso to scope Co-Pilot
          </span>
        </div>
      </div>
    </div>
  );
}
