"use client";

import React from "react";
import {
  Bot,
  ExternalLink,
  FileEdit,
  GitBranch,
  ShieldCheck,
  Sliders,
} from "lucide-react";
import AssociationNavigator from "@/components/AssociationNavigator";
import ContextMatchBanner from "@/components/ContextMatchBanner";
import CopilotBriefPanel from "@/components/CopilotBriefPanel";
import WikilinkNoteEditor from "@/components/WikilinkNoteEditor";
import { RightInspectorTab } from "@/hooks/useVectraWorkspace";
import { NodeContextMatchResult } from "@/lib/contextMatcher";
import {
  AssociativeEdgeItem,
  CanonicalNodeItem,
  CopilotStructuredResponse,
  LocalLLMStatus,
  RelationType,
  VariantLens,
} from "@/types/vectra";

interface RightRailInspectorProps {
  nodes: CanonicalNodeItem[];
  edges: AssociativeEdgeItem[];
  nodeMatchMap: Record<string, NodeContextMatchResult>;
  selectedNode: CanonicalNodeItem | null;
  rightTab: RightInspectorTab;
  variantLens: VariantLens;
  activeVertical: string;
  contextQuery: string;
  relationFilter: RelationType | "ALL";
  lassoNodeIds: string[];
  weightSliderValue: number;
  llmStatus: LocalLLMStatus;
  copilotQuestion: string;
  copilotLoading: boolean;
  copilotResponse: CopilotStructuredResponse | null;
  pptxDownloading: boolean;
  briefDownloading: boolean;
  onSelectNode: (id: string) => void;
  onSetRightTab: (tab: RightInspectorTab) => void;
  onSetCopilotQuestion: (q: string) => void;
  onWeightCommit: (weight: number) => void;
  onSaveNote: (nodeId: string, markdown: string, rel: RelationType) => Promise<void>;
  onScopeNeighborhood: (nodeId: string) => void;
  onToggleLassoNode: (nodeId: string) => void;
  onCreateTypedEdge: (
    sourceId: string,
    targetId: string,
    relationType: RelationType,
    rationaleNote: string
  ) => Promise<void>;
  onQuickLassoSubgraph: () => void;
  onOpenLLMModal: () => void;
  onOpenCypherModal: () => void;
  onRunCopilotQuery: () => void;
  onDownloadPptx: () => void;
  onDownloadBriefMarkdown: () => void;
  getLensSummary: (node: CanonicalNodeItem | null) => string;
}

const LENS_BADGE: Record<VariantLens, { label: string; style: string }> = {
  c_suite: {
    label: "Executive Lens (ROI & Risk)",
    style: "bg-sky-500/15 text-sky-300 border-sky-500/35",
  },
  cto: {
    label: "Architect Lens (Latency & Stack)",
    style: "bg-emerald-500/15 text-emerald-300 border-emerald-500/35",
  },
  contrarian: {
    label: "Skeptic Lens (Failure Modes)",
    style: "bg-rose-500/15 text-rose-300 border-rose-500/35",
  },
};

const MATURITY_LABEL: Record<string, string> = {
  production_scale: "Production Scale",
  pilot: "Enterprise Pilot",
  research: "Emerging Research",
};

export default function RightRailInspector({
  nodes,
  edges,
  nodeMatchMap,
  selectedNode,
  rightTab,
  variantLens,
  activeVertical,
  contextQuery,
  relationFilter,
  lassoNodeIds,
  weightSliderValue,
  llmStatus,
  copilotQuestion,
  copilotLoading,
  copilotResponse,
  pptxDownloading,
  briefDownloading,
  onSelectNode,
  onSetRightTab,
  onSetCopilotQuestion,
  onWeightCommit,
  onSaveNote,
  onScopeNeighborhood,
  onToggleLassoNode,
  onCreateTypedEdge,
  onQuickLassoSubgraph,
  onOpenLLMModal,
  onOpenCypherModal,
  onRunCopilotQuery,
  onDownloadPptx,
  onDownloadBriefMarkdown,
  getLensSummary,
}: RightRailInspectorProps) {
  const scopedNodes =
    lassoNodeIds.length > 0 ? nodes.filter((n) => lassoNodeIds.includes(n.id)) : nodes.slice(0, 4);
  const selectedMatch = selectedNode ? nodeMatchMap[selectedNode.id] : undefined;
  const assocCount = selectedMatch?.associationCount ?? 0;
  const lensInfo = LENS_BADGE[variantLens];

  return (
    <aside
      id="right-rail-inspector"
      className="col-span-4 border-l border-slate-800 bg-[#0D131F] flex flex-col min-h-0 overflow-hidden"
    >
      {/* Clear, Plain-English 4-Tab Bar */}
      <div className="h-11 shrink-0 border-b border-slate-800 bg-[#101722] px-2 flex items-center gap-1">
        <button
          id="right-tab-associations"
          type="button"
          onClick={() => onSetRightTab("associations")}
          className={`flex-1 py-1.5 px-1.5 rounded text-[11px] font-medium whitespace-nowrap transition flex items-center justify-center gap-1 ${
            rightTab === "associations"
              ? "bg-sky-500/20 text-sky-200 border border-sky-500/40 font-semibold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <GitBranch className="w-3.5 h-3.5 shrink-0" />
          <span>Connections ({assocCount})</span>
        </button>
        <button
          id="right-tab-citations"
          type="button"
          onClick={() => onSetRightTab("citations")}
          className={`flex-1 py-1.5 px-1.5 rounded text-[11px] font-medium whitespace-nowrap transition flex items-center justify-center gap-1 ${
            rightTab === "citations"
              ? "bg-sky-500/20 text-sky-200 border border-sky-500/40 font-semibold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span>Sources ({selectedNode?.sources.length || 0})</span>
        </button>
        <button
          id="right-tab-notes"
          type="button"
          onClick={() => onSetRightTab("notes")}
          className={`flex-1 py-1.5 px-1.5 rounded text-[11px] font-medium whitespace-nowrap transition flex items-center justify-center gap-1 ${
            rightTab === "notes"
              ? "bg-amber-500/20 text-amber-200 border border-amber-500/40 font-semibold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileEdit className="w-3.5 h-3.5 shrink-0" />
          <span>Notes</span>
        </button>
        <button
          id="right-tab-copilot"
          type="button"
          onClick={() => onSetRightTab("copilot")}
          className={`flex-1 py-1.5 px-1.5 rounded text-[11px] font-medium whitespace-nowrap transition flex items-center justify-center gap-1 ${
            rightTab === "copilot"
              ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 font-semibold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Bot className="w-3.5 h-3.5 shrink-0" />
          <span>AI Brief ({lassoNodeIds.length || 4})</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {/* Single-Topic Header (shown on Connections / Sources / Notes; hidden on multi-topic AI Brief) */}
        {selectedNode && rightTab !== "copilot" && (
          <>
            <div className="bg-[#101722] border border-slate-800 rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${lensInfo.style}`}>
                  {lensInfo.label}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                  {MATURITY_LABEL[selectedNode.maturity_stage] || selectedNode.maturity_stage} •{" "}
                  <strong className="text-sky-300">Score {selectedNode.composite_score}</strong>
                </span>
              </div>

              <h2
                id="inspector-active-node-title"
                className="text-[15px] font-semibold text-slate-100 leading-snug"
              >
                {selectedNode.title}
              </h2>

              <p
                id="inspector-active-lens-summary"
                className="text-[12.5px] text-slate-200 leading-relaxed bg-[#090D14] p-2.5 rounded border border-slate-800/90"
              >
                {getLensSummary(selectedNode)}
              </p>

              {/* Labeled Priority Multiplier Control */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80 text-[11px]">
                <label
                  htmlFor="consultant-weight-slider"
                  className="text-slate-400 flex items-center gap-1.5"
                  title="Adjusts your advisory priority multiplier (0.5x to 5.0x) for this topic's Composite Score"
                >
                  <Sliders className="w-3 h-3 text-amber-400" />
                  <span>
                    Priority Weight:{" "}
                    <strong className="font-mono text-amber-300">
                      {weightSliderValue.toFixed(1)}x
                    </strong>
                  </span>
                </label>
                <input
                  id="consultant-weight-slider"
                  type="range"
                  min={0.5}
                  max={5.0}
                  step={0.1}
                  value={weightSliderValue}
                  onChange={(e) => onWeightCommit(parseFloat(e.target.value))}
                  className="w-28 accent-amber-400 cursor-pointer"
                />
              </div>
            </div>

            <ContextMatchBanner
              node={selectedNode}
              match={selectedMatch}
              contextQuery={contextQuery}
              activeVertical={activeVertical}
              variantLens={variantLens}
              relationFilter={relationFilter}
              onOpenAssociationsTab={() => onSetRightTab("associations")}
              onOpenCypherModal={onOpenCypherModal}
            />
          </>
        )}

        {rightTab === "associations" && selectedNode && (
          <AssociationNavigator
            activeNode={selectedNode}
            allNodes={nodes}
            edges={edges}
            lassoNodeIds={lassoNodeIds}
            relationFilter={relationFilter}
            onSelectNode={onSelectNode}
            onScopeNeighborhood={onScopeNeighborhood}
            onToggleLassoNode={onToggleLassoNode}
            onCreateTypedEdge={onCreateTypedEdge}
          />
        )}

        {rightTab === "citations" && selectedNode && (
          <div id="verified-citation-drawer" className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-slate-300">
                Verified Primary Sources & Quotes
              </span>
              <span className="text-[10px] font-mono text-emerald-400">Tenant Verified</span>
            </div>

            {selectedNode.sources.map((src) => (
              <div
                key={src.id}
                className="bg-[#101722] border border-slate-800 rounded-md p-3 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
                      src.provenance_license === "subscriber_licensed"
                        ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                        : "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                    }`}
                  >
                    {src.provenance_license === "subscriber_licensed"
                      ? "Subscriber Exclusive (Private)"
                      : `Public Source (Tier ${src.authority_tier})`}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">{src.author_handle}</span>
                </div>
                <div className="text-xs font-semibold text-slate-100">{src.source_name}</div>
                <blockquote className="text-xs text-slate-200 italic border-l-2 border-sky-400 pl-3 py-1.5 bg-[#090D14] rounded-r leading-relaxed">
                  “{src.exact_quote}”
                </blockquote>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">{src.source_type}</span>
                  <a
                    href={src.direct_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-400 hover:underline"
                  >
                    <span>Open Original Source</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {rightTab === "notes" && selectedNode && (
          <div className="bg-[#101722] border border-slate-800 rounded-md p-3">
            <WikilinkNoteEditor activeNode={selectedNode} allNodes={nodes} onSaveNote={onSaveNote} />
          </div>
        )}

        {rightTab === "copilot" && (
          <CopilotBriefPanel
            scopedNodes={scopedNodes}
            lassoNodeIds={lassoNodeIds}
            variantLens={variantLens}
            llmStatus={llmStatus}
            copilotQuestion={copilotQuestion}
            copilotLoading={copilotLoading}
            copilotResponse={copilotResponse}
            pptxDownloading={pptxDownloading}
            briefDownloading={briefDownloading}
            onSelectNode={onSelectNode}
            onToggleLassoNode={onToggleLassoNode}
            onQuickLassoSubgraph={onQuickLassoSubgraph}
            onSetCopilotQuestion={onSetCopilotQuestion}
            onOpenLLMModal={onOpenLLMModal}
            onRunCopilotQuery={onRunCopilotQuery}
            onDownloadPptx={onDownloadPptx}
            onDownloadBriefMarkdown={onDownloadBriefMarkdown}
          />
        )}
      </div>
    </aside>
  );
}
