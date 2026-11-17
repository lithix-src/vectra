"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Maximize2, Minus, Plus } from "lucide-react";
import {
  installSpaciousGraphForces,
  paintGraphLinkLabel,
  paintGraphNode,
  RELATION_COLOR,
} from "@/lib/graphCanvasHelpers";
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

export default function AssociativeGraphCanvas({
  nodes,
  edges,
  selectedNodeId,
  lassoNodeIds,
  lassoModeActive,
  connectModeSourceId,
  activeRelationForLink = "ENABLES",
  onSelectNode,
  onUpdateLassoNodes,
  onCreateEdgeBetween,
}: AssociativeGraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fgRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 760, height: 560 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
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
        width: Math.max(380, Math.floor(rect.width)),
        height: Math.max(340, Math.floor(rect.height)),
      });
    };
    updateSize();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateSize) : null;
    if (ro && containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", updateSize);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  const graphData = useMemo(() => {
    const count = Math.max(1, nodes.length);
    const clonedNodes = nodes.map((n, idx) => {
      const angle = (2 * Math.PI * idx) / count - Math.PI / 2;
      const ring = idx % 2 === 0 ? 155 : 225;
      return {
        ...n,
        x: n.x ?? Math.cos(angle) * ring * 1.25,
        y: n.y ?? Math.sin(angle) * ring * 0.9,
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

  const handleFitGraph = useCallback(() => {
    fgRef.current?.zoomToFit?.(260, 52);
  }, []);

  const handleZoomStep = useCallback((factor: number) => {
    const fg = fgRef.current;
    if (!fg || typeof fg.zoom !== "function") return;
    const current = fg.zoom() || 1;
    fg.zoom(Math.max(0.45, Math.min(3.2, current * factor)), 200);
  }, []);

  useEffect(() => {
    let fitTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    const applyForces = (fg: any) => {
      installSpaciousGraphForces(fg);
      fg.d3ReheatSimulation?.();
      fitTimer = setTimeout(() => fg.zoomToFit?.(240, 52), 450);
    };

    if (fgRef.current) {
      applyForces(fgRef.current);
      return () => {
        if (fitTimer) clearTimeout(fitTimer);
      };
    }

    const poll = setInterval(() => {
      attempts += 1;
      if (fgRef.current) {
        clearInterval(poll);
        applyForces(fgRef.current);
      } else if (attempts > 50) {
        clearInterval(poll);
      }
    }, 60);

    return () => {
      clearInterval(poll);
      if (fitTimer) clearTimeout(fitTimer);
    };
  }, [graphData]);

  const focusNodeId = hoveredNodeId || selectedNodeId;
  const { neighborIds, neighborNodes } = useMemo(() => {
    if (!selectedNodeId) return { neighborIds: new Set<string>(), neighborNodes: [] };
    const nSet = new Set<string>();
    for (const e of edges) {
      if (e.source_node_id === selectedNodeId) nSet.add(e.target_node_id);
      if (e.target_node_id === selectedNodeId) nSet.add(e.source_node_id);
    }
    return { neighborIds: nSet, neighborNodes: nodes.filter((n) => nSet.has(n.id)) };
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
    !focusNodeId ||
    link.source_node_id === focusNodeId ||
    link.target_node_id === focusNodeId;

  return (
    <div
      ref={containerRef}
      id="associative-graph-canvas-container"
      className="relative w-full h-full bg-[#090D14] overflow-hidden select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Floating Map Zoom & Fit Controls */}
      <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 bg-[#101722]/95 border border-slate-800 rounded-md p-1 shadow-lg">
        <button
          type="button"
          onClick={() => handleZoomStep(1.25)}
          className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition"
          title="Zoom In"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => handleZoomStep(0.8)}
          className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition"
          title="Zoom Out"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleFitGraph}
          className="px-1.5 py-1 rounded hover:bg-slate-800 text-[10px] font-medium text-sky-300 flex items-center gap-1 transition"
          title="Fit all topics in view"
        >
          <Maximize2 className="w-3 h-3" />
          <span>Fit</span>
        </button>
      </div>

      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={Math.max(280, dimensions.height - 62)}
        graphData={graphData}
        backgroundColor="#090D14"
        enableNodeDrag={!lassoModeActive}
        enablePanInteraction={!lassoModeActive}
        cooldownTicks={90}
        d3VelocityDecay={0.32}
        onEngineStop={handleFitGraph}
        onNodeClick={handleNodeClick}
        onNodeHover={(n: any) => setHoveredNodeId(n?.id || null)}
        linkDirectionalArrowLength={5}
        linkDirectionalArrowRelPos={0.86}
        linkWidth={(link: any) => (isIncidentLink(link) ? 2.1 : 0.9)}
        linkColor={(link: any) => {
          const base = link.is_user_created
            ? "#F59E0B"
            : RELATION_COLOR[link.relation_type as RelationType] || "#38BDF8";
          return isIncidentLink(link) ? base : "rgba(100, 116, 139, 0.22)";
        }}
        linkCanvasObjectMode={() => "after"}
        linkCanvasObject={(link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
          if (!focusNodeId || !isIncidentLink(link)) return;
          paintGraphLinkLabel(link, ctx, globalScale);
        }}
        nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) =>
          paintGraphNode(node, ctx, globalScale, {
            selectedNodeId,
            hoveredNodeId,
            neighborIds,
            lassoNodeIds,
            connectModeSourceId,
          })
        }
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

      {/* Clean Bottom Connected Topics & Plain-English Legend */}
      <div className="absolute bottom-2 left-2.5 right-2.5 pointer-events-auto bg-[#101722]/95 border border-slate-800 rounded-md px-3 py-1.5 text-[11px] space-y-1">
        {neighborNodes.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <span className="text-[10px] font-medium text-sky-400 shrink-0">
              Connected ({neighborNodes.length}):
            </span>
            {neighborNodes.map((nb) => (
              <button
                key={nb.id}
                type="button"
                onClick={() => onSelectNode(nb.id)}
                className="px-2 py-0.5 rounded bg-[#090D14] hover:bg-sky-500/20 border border-slate-700/90 hover:border-sky-400 text-[11px] text-slate-200 truncate max-w-[185px] shrink-0 transition"
              >
                {nb.title.slice(0, 25)}… ↗
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
          <div className="flex flex-wrap items-center gap-3">
            <span><strong className="text-emerald-400">●</strong> Production</span>
            <span><strong className="text-sky-400">●</strong> Pilot</span>
            <span><strong className="text-sky-400">—</strong> Enables</span>
            <span><strong className="text-amber-400">—</strong> Regulates</span>
            <span><strong className="text-rose-400">—</strong> Conflicts</span>
          </div>
          <span>Click node to inspect • Drag to pan • Scroll to zoom</span>
        </div>
      </div>
    </div>
  );
}
