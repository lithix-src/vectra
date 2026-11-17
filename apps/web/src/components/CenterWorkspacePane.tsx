"use client";

import React from "react";
import {
  Calculator,
  Lasso,
  Layers,
  Network,
  Sliders,
} from "lucide-react";
import AssociativeGraphCanvas from "@/components/AssociativeGraphCanvas";
import VariantDiffMatrix from "@/components/VariantDiffMatrix";
import {
  AssociativeEdgeItem,
  CanonicalNodeItem,
  RelationType,
  VariantLens,
} from "@/types/vectra";

interface CenterWorkspacePaneProps {
  nodes: CanonicalNodeItem[];
  edges: AssociativeEdgeItem[];
  selectedNode: CanonicalNodeItem | null;
  centerMode: "graph" | "matrix";
  variantLens: VariantLens;
  relationFilter: RelationType | "ALL";
  lassoModeActive: boolean;
  lassoNodeIds: string[];
  connectModeSourceId: string | null;
  weightSliderValue: number;
  onSetCenterMode: (mode: "graph" | "matrix") => void;
  onSetRelationFilter: (rel: RelationType | "ALL") => void;
  onToggleLassoMode: () => void;
  onQuickLassoSubgraph: () => void;
  onOpenCypherModal: () => void;
  onToggleConnectNode: () => void;
  onWeightCommit: (weight: number) => void;
  onSelectNode: (id: string) => void;
  onUpdateLassoNodes: (ids: string[]) => void;
  onCreateEdgeBetween: (sourceId: string, targetId: string, relationType: RelationType) => void;
  onInspectSource: () => void;
}

const RELATION_CHIPS: { id: RelationType | "ALL"; label: string }[] = [
  { id: "ALL", label: "All Links" },
  { id: "ENABLES", label: "ENABLES" },
  { id: "CASE_STUDY_OF", label: "CASE_STUDY" },
  { id: "REGULATES", label: "REGULATES" },
  { id: "CONFLICTS_WITH", label: "CONFLICTS" },
  { id: "REPLACES", label: "REPLACES" },
];

export default function CenterWorkspacePane({
  nodes,
  edges,
  selectedNode,
  centerMode,
  variantLens,
  relationFilter,
  lassoModeActive,
  lassoNodeIds,
  connectModeSourceId,
  weightSliderValue,
  onSetCenterMode,
  onSetRelationFilter,
  onToggleLassoMode,
  onQuickLassoSubgraph,
  onOpenCypherModal,
  onToggleConnectNode,
  onWeightCommit,
  onSelectNode,
  onUpdateLassoNodes,
  onCreateEdgeBetween,
  onInspectSource,
}: CenterWorkspacePaneProps) {
  return (
    <main className="col-span-5 flex flex-col min-h-0 bg-[#090D14] relative">
      {/* Primary View & Scoping Toolbar */}
      <div className="h-11 shrink-0 border-b border-slate-800 bg-[#101722] px-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-[#090D14] p-0.5 rounded border border-slate-800">
          <button
            id="mode-switch-graph-btn"
            type="button"
            onClick={() => onSetCenterMode("graph")}
            className={`px-2 py-1 rounded text-[11px] font-mono uppercase flex items-center gap-1 transition ${
              centerMode === "graph"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Graph ({edges.length})</span>
          </button>
          <button
            id="mode-switch-matrix-btn"
            type="button"
            onClick={() => onSetCenterMode("matrix")}
            className={`px-2 py-1 rounded text-[11px] font-mono uppercase flex items-center gap-1 transition ${
              centerMode === "matrix"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Diff Matrix</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            id="toggle-lasso-mode-btn"
            type="button"
            onClick={onToggleLassoMode}
            className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1 border transition ${
              lassoModeActive
                ? "bg-amber-500 text-slate-950 font-bold border-amber-400"
                : "bg-[#090D14] text-amber-300 border-slate-700 hover:border-amber-400/60"
            }`}
          >
            <Lasso className="w-3 h-3" />
            <span>{lassoNodeIds.length > 0 ? `Lasso (${lassoNodeIds.length})` : "Lasso"}</span>
          </button>

          <button
            id="quick-lasso-subgraph-btn"
            type="button"
            onClick={onQuickLassoSubgraph}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-mono text-slate-200"
            title="Lasso top matched canonical nodes into Subgraph Co-Pilot"
          >
            Top 4
          </button>

          <button
            id="open-cypher-math-modal-btn"
            type="button"
            onClick={onOpenCypherModal}
            className="px-2 py-1 rounded bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-[10px] font-mono text-sky-300 flex items-center gap-1 transition"
            title="Inspect Apache AGE OpenCypher query & Composite Score mathematical breakdown"
          >
            <Calculator className="w-3 h-3 text-sky-400" />
            <span>Math</span>
          </button>

          {selectedNode && (
            <button
              id="connect-node-edge-btn"
              type="button"
              onClick={onToggleConnectNode}
              className={`px-2 py-1 rounded text-[10px] font-mono border transition ${
                connectModeSourceId
                  ? "bg-rose-500 text-slate-950 font-bold border-rose-400"
                  : "bg-[#090D14] text-slate-300 border-slate-700 hover:border-sky-400"
              }`}
            >
              {connectModeSourceId ? "Pick Target…" : "+ Link"}
            </button>
          )}
        </div>
      </div>

      {/* Association Relation Filter + Consultant Weight Strip */}
      <div className="bg-[#0D131F] border-b border-slate-800 px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1 flex-wrap">
          {RELATION_CHIPS.map((chip) => {
            const active = relationFilter === chip.id;
            return (
              <button
                key={chip.id}
                id={`relation-filter-${chip.id.toLowerCase()}`}
                type="button"
                onClick={() => onSetRelationFilter(chip.id)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition ${
                  active
                    ? "bg-sky-500/25 text-sky-200 border-sky-400/60 font-semibold"
                    : "bg-[#090D14] text-slate-400 border-slate-800 hover:text-slate-200"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {selectedNode && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Sliders className="w-3 h-3 text-amber-400" />
            <label htmlFor="consultant-weight-slider" className="font-mono text-[10px] text-slate-300">
              <strong className="text-amber-400">{weightSliderValue.toFixed(1)}x</strong>
            </label>
            <input
              id="consultant-weight-slider"
              type="range"
              min={0.5}
              max={5.0}
              step={0.1}
              value={weightSliderValue}
              onChange={(e) => onWeightCommit(parseFloat(e.target.value))}
              className="w-20 accent-amber-400 cursor-pointer"
            />
          </div>
        )}
      </div>

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
            activeRelationForLink={relationFilter === "ALL" ? "ENABLES" : relationFilter}
            onSelectNode={onSelectNode}
            onUpdateLassoNodes={onUpdateLassoNodes}
            onCreateEdgeBetween={onCreateEdgeBetween}
          />
        ) : (
          <VariantDiffMatrix
            nodes={nodes}
            selectedNode={selectedNode}
            variantLens={variantLens}
            onSelectNode={onSelectNode}
            onInspectSource={onInspectSource}
          />
        )}
      </div>
    </main>
  );
}
