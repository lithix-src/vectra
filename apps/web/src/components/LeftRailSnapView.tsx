"use client";

import React from "react";
import { GitBranch, Search, X } from "lucide-react";
import LeftRailDrawers from "@/components/LeftRailDrawers";
import { NodeContextMatchResult } from "@/lib/contextMatcher";
import { VERTICAL_LIST } from "@/lib/vectraDefaults";
import {
  CanonicalNodeItem,
  CollectorPacksStatus,
  UserIntegrationItem,
  VariantLens,
} from "@/types/vectra";

interface LeftRailSnapViewProps {
  nodes: CanonicalNodeItem[];
  totalNodeCount: number;
  nodeMatchMap: Record<string, NodeContextMatchResult>;
  selectedNode: CanonicalNodeItem | null;
  activeVertical: string;
  variantLens: VariantLens;
  contextQuery: string;
  integrations: UserIntegrationItem[];
  collectorStatus: CollectorPacksStatus;
  collectorBusyPackId: string | null;
  onChangeContextQuery: (q: string) => void;
  onSelectNode: (id: string) => void;
  onInspectNodeAssociations: (id: string) => void;
  onVerticalChange: (vert: string) => void;
  onSimulateInboundNewsletter: () => void;
  onRunPublicCollectors: () => void;
  onOpenCollectorModal: () => void;
  onRefreshIntegration: (provider: string) => void;
  onTriggerToast: (msg: string) => void;
  getLensSummary: (node: CanonicalNodeItem | null) => string;
}

const CONTEXT_PRESETS = [
  { label: "SR 11-7 / Audit", query: "SR 11-7" },
  { label: "KV-Cache Latency", query: "KV-cache" },
  { label: "Zero-Trust MCP", query: "MCP" },
  { label: "Subscriber Exclusive", query: "subscriber" },
];

const LENS_READABLE: Record<VariantLens, string> = {
  c_suite: "Executive View",
  cto: "Architect View",
  contrarian: "Skeptic View",
};

export default function LeftRailSnapView({
  nodes,
  totalNodeCount,
  nodeMatchMap,
  selectedNode,
  activeVertical,
  variantLens,
  contextQuery,
  integrations,
  collectorStatus,
  collectorBusyPackId,
  onChangeContextQuery,
  onSelectNode,
  onInspectNodeAssociations,
  onVerticalChange,
  onSimulateInboundNewsletter,
  onRunPublicCollectors,
  onOpenCollectorModal,
  onRefreshIntegration,
  onTriggerToast,
  getLensSummary,
}: LeftRailSnapViewProps) {
  return (
    <aside
      id="left-rail-snap-view"
      className="col-span-3 border-r border-slate-800 bg-[#0D131F] flex flex-col min-h-0 overflow-hidden p-2.5 gap-2.5"
    >
      {/* 1. Search & Industry Filter */}
      <section className="bg-[#101722] border border-slate-800 rounded-md p-2.5 shrink-0 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-slate-200">Search & Filter Topics</span>
          <span className="font-mono text-[10px] text-sky-400">
            {nodes.length} of {totalNodeCount} shown
          </span>
        </div>

        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-sky-400 absolute left-2.5 pointer-events-none" />
          <input
            id="target-context-expression-input"
            type="text"
            value={contextQuery}
            onChange={(e) => onChangeContextQuery(e.target.value)}
            placeholder="Search topics, quotes, risks (e.g. SR 11-7)..."
            className="w-full bg-[#090D14] border border-slate-700 focus:border-sky-400 rounded pl-8 pr-7 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          {contextQuery && (
            <button
              type="button"
              onClick={() => onChangeContextQuery("")}
              className="absolute right-2 text-slate-400 hover:text-slate-200"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          {CONTEXT_PRESETS.map((preset) => {
            const active = contextQuery.toLowerCase() === preset.query.toLowerCase();
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => onChangeContextQuery(active ? "" : preset.query)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium border transition ${
                  active
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-semibold"
                    : "bg-[#090D14] text-slate-400 border-slate-800 hover:text-slate-200"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="pt-1.5 border-t border-slate-800/80">
          <div className="text-[10px] font-medium text-slate-400 mb-1">Industry Sector</div>
          <div className="flex flex-wrap gap-1">
            {VERTICAL_LIST.map((vert) => {
              const isActive = activeVertical === vert;
              const slugId = vert.toLowerCase().replace(/[^a-z0-9]+/g, "-");
              const shortLabel =
                vert === "All Verticals"
                  ? "All"
                  : vert === "Cross-Industry Horizontal"
                  ? "Cross-Sector"
                  : vert.split(" ")[0].replace(/\/.*/, "");
              return (
                <button
                  key={vert}
                  id={`vertical-filter-${slugId}`}
                  type="button"
                  title={vert}
                  onClick={() => onVerticalChange(vert)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition border ${
                    isActive
                      ? "bg-sky-500/20 text-sky-200 border-sky-400/60 font-semibold"
                      : "bg-[#090D14] text-slate-400 border-slate-800 hover:text-slate-200"
                  }`}
                >
                  {shortLabel}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 2. Ranked Topics Feed */}
      <section className="bg-[#101722] border border-slate-800 rounded-md p-2.5 flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between mb-2 shrink-0">
          <span className="text-[11px] font-semibold text-slate-200">
            {contextQuery.trim()
              ? `Matching Topics (${nodes.length})`
              : `Ranked Topics • ${LENS_READABLE[variantLens]}`}
          </span>
          <span className="text-[10px] text-slate-500">By Score</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {nodes.length === 0 ? (
            <div className="p-3 rounded bg-[#090D14] border border-slate-800 text-xs text-slate-400">
              No topics match “{contextQuery}” in {activeVertical}.
            </div>
          ) : (
            nodes.map((node) => {
              const isSel = selectedNode?.id === node.id;
              const match = nodeMatchMap[node.id];
              const showQueryMatch = contextQuery.trim().length > 0 && match?.primarySnippet;
              return (
                <div
                  key={node.id}
                  id={`snap-node-card-${node.slug}`}
                  onClick={() => onSelectNode(node.id)}
                  className={`p-2.5 rounded-md border cursor-pointer transition space-y-1.5 ${
                    isSel
                      ? "bg-sky-950/40 border-sky-400/70"
                      : "bg-[#090D14] border-slate-800/90 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[12.5px] font-semibold text-slate-100 leading-snug">
                      {node.title}
                    </span>
                    <span
                      className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/25 shrink-0"
                      title="Composite Signal Score"
                    >
                      {Math.round(node.composite_score)}
                    </span>
                  </div>

                  <p className="text-[11.5px] text-slate-300 line-clamp-2 leading-relaxed">
                    {showQueryMatch ? (
                      <>
                        <strong className="text-[10.5px] text-emerald-400 mr-1">
                          {match.primarySnippet!.facet}:
                        </strong>
                        {match.primarySnippet!.excerpt}
                      </>
                    ) : (
                      getLensSummary(node)
                    )}
                  </p>

                  <div className="flex items-center justify-between gap-1 pt-0.5">
                    <span className="text-[10px] text-slate-400 truncate">
                      {node.industry_verticals[0] || "Enterprise AI"}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onInspectNodeAssociations(node.id);
                      }}
                      className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-800/90 hover:bg-sky-500/20 text-sky-300 border border-slate-700 hover:border-sky-500/40 flex items-center gap-1 shrink-0 transition"
                      title="Inspect connected topics"
                    >
                      <GitBranch className="w-2.5 h-2.5" />
                      <span>{match?.associationCount ?? 0} links</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <LeftRailDrawers
        nodes={nodes}
        selectedNode={selectedNode}
        integrations={integrations}
        collectorStatus={collectorStatus}
        collectorBusyPackId={collectorBusyPackId}
        onSelectNode={onSelectNode}
        onSimulateInboundNewsletter={onSimulateInboundNewsletter}
        onRunPublicCollectors={onRunPublicCollectors}
        onOpenCollectorModal={onOpenCollectorModal}
        onRefreshIntegration={onRefreshIntegration}
        onTriggerToast={onTriggerToast}
      />
    </aside>
  );
}
