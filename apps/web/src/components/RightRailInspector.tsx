"use client";

import React from "react";
import {
  Bot,
  Download,
  ExternalLink,
  FileText,
  GitBranch,
  Link2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import AssociationNavigator from "@/components/AssociationNavigator";
import ContextMatchBanner from "@/components/ContextMatchBanner";
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
  llmStatus: LocalLLMStatus;
  copilotQuestion: string;
  copilotLoading: boolean;
  copilotResponse: CopilotStructuredResponse | null;
  pptxDownloading: boolean;
  briefDownloading: boolean;
  onSelectNode: (id: string) => void;
  onSetRightTab: (tab: RightInspectorTab) => void;
  onSetCopilotQuestion: (q: string) => void;
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
  llmStatus,
  copilotQuestion,
  copilotLoading,
  copilotResponse,
  pptxDownloading,
  briefDownloading,
  onSelectNode,
  onSetRightTab,
  onSetCopilotQuestion,
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

  return (
    <aside
      id="right-rail-inspector"
      className="col-span-4 border-l border-slate-800 bg-[#0D131F] flex flex-col min-h-0 overflow-hidden"
    >
      {/* 4-Tab Progressive Disclosure Navigation */}
      <div className="h-11 shrink-0 border-b border-slate-800 bg-[#101722] px-2 flex items-center gap-1">
        <button
          id="right-tab-associations"
          type="button"
          onClick={() => onSetRightTab("associations")}
          className={`flex-1 py-1.5 px-1.5 rounded text-[11px] font-mono uppercase transition flex items-center justify-center gap-1 ${
            rightTab === "associations"
              ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <GitBranch className="w-3 h-3" />
          <span>Links ({assocCount})</span>
        </button>
        <button
          id="right-tab-citations"
          type="button"
          onClick={() => onSetRightTab("citations")}
          className={`flex-1 py-1.5 px-1.5 rounded text-[11px] font-mono uppercase transition flex items-center justify-center gap-1 ${
            rightTab === "citations"
              ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <ShieldCheck className="w-3 h-3" />
          <span>Quotes ({selectedNode?.sources.length || 0})</span>
        </button>
        <button
          id="right-tab-notes"
          type="button"
          onClick={() => onSetRightTab("notes")}
          className={`flex-1 py-1.5 px-1.5 rounded text-[11px] font-mono uppercase transition flex items-center justify-center gap-1 ${
            rightTab === "notes"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Link2 className="w-3 h-3" />
          <span>[[Notes]]</span>
        </button>
        <button
          id="right-tab-copilot"
          type="button"
          onClick={() => onSetRightTab("copilot")}
          className={`flex-1 py-1.5 px-1.5 rounded text-[11px] font-mono uppercase transition flex items-center justify-center gap-1 ${
            rightTab === "copilot"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Bot className="w-3 h-3" />
          <span>Co-Pilot ({lassoNodeIds.length || 4})</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2.5">
        {selectedNode && (
          <>
            <div className="bg-[#101722] border border-slate-800 rounded p-2.5">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  Lens: {variantLens.toUpperCase()}
                </span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  {selectedNode.maturity_stage} • {selectedNode.composite_score}
                </span>
              </div>
              <h2
                id="inspector-active-node-title"
                className="text-sm font-bold text-slate-100 leading-snug mb-1.5"
              >
                {selectedNode.title}
              </h2>
              <p
                id="inspector-active-lens-summary"
                className="text-xs text-slate-200 leading-relaxed bg-[#090D14] p-2 rounded border border-slate-800"
              >
                {getLensSummary(selectedNode)}
              </p>
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
          <div id="verified-citation-drawer" className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Primary Evidence & Verbatim Pull-Quotes
              </span>
              <span className="text-[10px] font-mono text-emerald-400">RLS Filtered</span>
            </div>

            {selectedNode.sources.map((src) => (
              <div
                key={src.id}
                className="bg-[#101722] border border-slate-800 rounded p-2.5 flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-semibold ${
                      src.provenance_license === "subscriber_licensed"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    }`}
                  >
                    {src.provenance_license === "subscriber_licensed"
                      ? "[Subscriber Licensed • user_private]"
                      : `[Public • Tier-${src.authority_tier}]`}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{src.author_handle}</span>
                </div>
                <div className="text-xs font-semibold text-slate-100">{src.source_name}</div>
                <blockquote className="text-xs text-slate-200 italic border-l-2 border-sky-400 pl-2.5 py-1 bg-[#090D14] rounded-r leading-relaxed">
                  “{src.exact_quote}”
                </blockquote>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">{src.source_type}</span>
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

        {rightTab === "notes" && selectedNode && (
          <div className="bg-[#101722] border border-slate-800 rounded p-2.5">
            <WikilinkNoteEditor activeNode={selectedNode} allNodes={nodes} onSaveNote={onSaveNote} />
          </div>
        )}

        {rightTab === "copilot" && (
          <div
            id="subgraph-copilot-panel"
            className="flex flex-col gap-2.5 bg-[#101722] border border-slate-800 rounded p-2.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Bot className="w-4 h-4" /> Subgraph Executive Co-Pilot
              </span>
              <button
                id="copilot-select-all-visible-btn"
                type="button"
                onClick={onQuickLassoSubgraph}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700"
              >
                Scope Top 4
              </button>
            </div>

            <div className="bg-[#090D14] border border-emerald-500/30 rounded px-2 py-1.5 flex items-center justify-between gap-2 text-[10px] font-mono">
              <div className="flex items-center gap-1.5 truncate text-slate-300">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    llmStatus.daemon_online ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />
                <span className="text-emerald-300 font-semibold uppercase">{llmStatus.provider}</span>
                <span className="truncate text-slate-200">{llmStatus.model}</span>
              </div>
              <button type="button" onClick={onOpenLLMModal} className="text-sky-400 hover:underline shrink-0">
                Configure
              </button>
            </div>

            <div className="bg-[#090D14] border border-slate-800 rounded p-2">
              <div className="text-[10px] font-mono uppercase text-slate-400 mb-1">
                Scoped Subgraph ({scopedNodes.length} Nodes):
              </div>
              <div className="flex flex-wrap gap-1">
                {scopedNodes.map((n) => (
                  <span
                    key={n.id}
                    className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px] font-mono truncate max-w-[220px]"
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
              onChange={(e) => onSetCopilotQuestion(e.target.value)}
              className="w-full bg-[#090D14] border border-slate-700 focus:border-emerald-400 rounded p-2 text-xs text-slate-100 leading-relaxed focus:outline-none"
            />

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                id="run-subgraph-copilot-btn"
                type="button"
                disabled={copilotLoading}
                onClick={onRunCopilotQuery}
                className="flex-1 py-1.5 px-2.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono uppercase tracking-wider transition flex items-center justify-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {copilotLoading ? "Synthesizing..." : "Query Co-Pilot"}
              </button>
              <button
                id="copilot-export-pptx-btn"
                type="button"
                disabled={pptxDownloading}
                onClick={onDownloadPptx}
                className="py-1.5 px-2.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono uppercase flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> .pptx
              </button>
              <button
                id="export-markdown-brief-btn"
                type="button"
                disabled={briefDownloading}
                onClick={onDownloadBriefMarkdown}
                className="py-1.5 px-2.5 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs font-mono uppercase flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5" /> {briefDownloading ? "..." : ".md"}
              </button>
            </div>

            {copilotResponse && (
              <div id="copilot-structured-response" className="flex flex-col gap-2 border-t border-slate-800 pt-2 text-xs">
                <div className="bg-[#090D14] border border-emerald-500/40 rounded p-2.5">
                  <div className="text-[10px] font-mono uppercase text-emerald-400 mb-1">
                    Executive Synthesis ({variantLens.toUpperCase()} • {copilotResponse.execution_mode})
                  </div>
                  <p className="text-slate-100 leading-relaxed">{copilotResponse.executive_answer}</p>
                </div>
                <div className="bg-[#090D14] border border-slate-800 rounded p-2.5">
                  <div className="text-[10px] font-mono uppercase text-sky-400 mb-1">90-Day Action Plan</div>
                  <ul className="list-disc list-inside text-slate-200 space-y-1">
                    {copilotResponse.recommended_90_day_actions.map((act, i) => (
                      <li key={i} className="leading-snug">{act}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
