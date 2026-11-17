"use client";

import React from "react";
import {
  Calculator,
  Lasso,
  Layers,
  Link2,
  Network,
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
  onSetCenterMode: (mode: "graph" | "matrix") => void;
  onSetRelationFilter: (rel: RelationType | "ALL") => void;
  onToggleLassoMode: () => void;
  onQuickLassoSubgraph: () => void;
  onOpenCypherModal: () => void;
  onToggleConnectNode: () => void;
  onSelectNode: (id: string) => void;
  onUpdateLassoNodes: (ids: string[]) => void;
  onCreateEdgeBetween: (sourceId: string, targetId: string, relationType: RelationType) => void;
  onInspectSource: () => void;
}

const RELATION_CHIPS: { id: RelationType | "ALL"; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "ENABLES", label: "Enables" },
  { id: "CASE_STUDY_OF", label: "Case Study" },
  { id: "REGULATES", label: "Regulates" },
  { id: "CONFLICTS_WITH", label: "Conflicts" },
  { id: "REPLACES", label: "Replaces" },
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
  onSetCenterMode,
  onSetRelationFilter,
  onToggleLassoMode,
  onQuickLassoSubgraph,
  onOpenCypherModal,
  onToggleConnectNode,
  onSelectNode,
  onUpdateLassoNodes,
  onCreateEdgeBetween,
  onInspectSource,
}: CenterWorkspacePaneProps) {
  return (
    <main className="col-span-5 flex flex-col min-h-0 bg-[#090D14] relative">
      {/* Primary View & Scoping Toolbar (Single-Line Non-Wrapping) */}
      <div className="h-11 shrink-0 border-b border-slate-800 bg-[#101722] px-2.5 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1 bg-[#090D14] p-0.5 rounded border border-slate-800 shrink-0">
          <button
            id="mode-switch-graph-btn"
            type="button"
            onClick={() => onSetCenterMode("graph")}
            className={`px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap flex items-center gap-1.5 transition ${
              centerMode === "graph"
                ? "bg-sky-500/20 text-sky-200 border border-sky-500/40 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Network className="w-3.5 h-3.5 shrink-0" />
            <span>Map ({nodes.length})</span>
          </button>
          <button
            id="mode-switch-matrix-btn"
            type="button"
            onClick={() => onSetCenterMode("matrix")}
            className={`px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap flex items-center gap-1.5 transition ${
              centerMode === "matrix"
                ? "bg-sky-500/20 text-sky-200 border border-sky-500/40 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span>Compare</span>
          </button>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            id="toggle-lasso-mode-btn"
            type="button"
            onClick={onToggleLassoMode}
            title="Drag a box on the map to select multiple topics for an AI Brief"
            className={`px-2 py-1 rounded text-[11px] font-medium whitespace-nowrap flex items-center gap-1 border transition ${
              lassoModeActive
                ? "bg-amber-500 text-slate-950 font-semibold border-amber-400"
                : "bg-[#090D14] text-amber-300 border-slate-700 hover:border-amber-400/60"
            }`}
          >
            <Lasso className="w-3 h-3 shrink-0" />
            <span>{lassoNodeIds.length > 0 ? `Selected (${lassoNodeIds.length})` : "Select"}</span>
          </button>

          <button
            id="quick-lasso-subgraph-btn"
            type="button"
            onClick={onQuickLassoSubgraph}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-medium whitespace-nowrap text-slate-200"
            title="Send top 4 ranked topics into the AI Brief"
          >
            Top 4
          </button>

          {selectedNode && (
            <button
              id="connect-node-edge-btn"
              type="button"
              onClick={onToggleConnectNode}
              title="Click another topic on the map to create a relationship link"
              className={`px-2 py-1 rounded text-[11px] font-medium whitespace-nowrap border flex items-center gap-1 transition ${
                connectModeSourceId
                  ? "bg-rose-500 text-slate-950 font-semibold border-rose-400"
                  : "bg-[#090D14] text-slate-300 border-slate-700 hover:border-sky-400"
              }`}
            >
              <Link2 className="w-3 h-3 shrink-0" />
              <span>{connectModeSourceId ? "Pick Target…" : "Connect"}</span>
            </button>
          )}

          <button
            id="open-cypher-math-modal-btn"
            type="button"
            onClick={onOpenCypherModal}
            className="px-2 py-1 rounded bg-[#090D14] hover:bg-slate-800 border border-slate-700 text-[11px] font-medium whitespace-nowrap text-sky-300 flex items-center gap-1 transition"
            title="Inspect Score Formula & Apache AGE Graph Query"
          >
            <Calculator className="w-3 h-3 text-sky-400 shrink-0" />
            <span>Formula</span>
          </button>
        </div>
      </div>

      {/* Plain-English Relationship Type Filter Bar */}
      {centerMode === "graph" && (
        <div className="bg-[#0D131F] border-b border-slate-800 px-2.5 py-1.5 flex items-center gap-1.5 overflow-x-auto text-xs shrink-0">
          <span className="text-[11px] text-slate-400 font-medium shrink-0">Show Links:</span>
          <div className="flex items-center gap-1">
            {RELATION_CHIPS.map((chip) => {
              const active = relationFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  id={`relation-filter-${chip.id.toLowerCase()}`}
                  type="button"
                  onClick={() => onSetRelationFilter(chip.id)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap border transition ${
                    active
                      ? "bg-sky-500/20 text-sky-200 border-sky-400/60 font-semibold"
                      : "bg-[#090D14] text-slate-400 border-slate-800 hover:text-slate-200"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

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
