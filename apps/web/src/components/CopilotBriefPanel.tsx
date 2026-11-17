"use client";

import React from "react";
import {
  AlertTriangle,
  Bot,
  CalendarCheck,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Layers,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import {
  LENS_HUMAN_LABEL,
  PROMPT_TEMPLATES,
  splitLeadPhrase,
  splitReadableBlocks,
} from "@/lib/copilotFormatting";
import {
  CanonicalNodeItem,
  CopilotStructuredResponse,
  LocalLLMStatus,
  VariantLens,
} from "@/types/vectra";

interface CopilotBriefPanelProps {
  scopedNodes: CanonicalNodeItem[];
  lassoNodeIds: string[];
  variantLens: VariantLens;
  llmStatus: LocalLLMStatus;
  copilotQuestion: string;
  copilotLoading: boolean;
  copilotResponse: CopilotStructuredResponse | null;
  pptxDownloading: boolean;
  briefDownloading: boolean;
  onSelectNode: (id: string) => void;
  onToggleLassoNode: (id: string) => void;
  onQuickLassoSubgraph: () => void;
  onSetCopilotQuestion: (q: string) => void;
  onOpenLLMModal: () => void;
  onRunCopilotQuery: () => void;
  onDownloadPptx: () => void;
  onDownloadBriefMarkdown: () => void;
}

export default function CopilotBriefPanel({
  scopedNodes,
  lassoNodeIds,
  variantLens,
  llmStatus,
  copilotQuestion,
  copilotLoading,
  copilotResponse,
  pptxDownloading,
  briefDownloading,
  onSelectNode,
  onToggleLassoNode,
  onQuickLassoSubgraph,
  onSetCopilotQuestion,
  onOpenLLMModal,
  onRunCopilotQuery,
  onDownloadPptx,
  onDownloadBriefMarkdown,
}: CopilotBriefPanelProps) {
  const parsedAnswer = copilotResponse
    ? splitReadableBlocks(copilotResponse.executive_answer)
    : null;

  return (
    <div id="subgraph-copilot-panel" className="flex flex-col gap-3">
      {/* 1. Clear Purpose Header & Local Model Status */}
      <div className="bg-[#101722] border border-slate-800 rounded-md p-3 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-emerald-400" />
              <span>AI Advisory Brief</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Synthesizes your selected topics, verified quotes, and private notes locally.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenLLMModal}
            className="px-2 py-1 rounded bg-[#090D14] hover:bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-200 flex items-center gap-1.5 shrink-0"
            title="Configure local LLM provider and model"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                llmStatus.daemon_online ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            <span className="truncate max-w-[115px]">{llmStatus.model}</span>
          </button>
        </div>

        {/* Scoped Topics Bar */}
        <div className="bg-[#090D14] border border-slate-800/90 rounded p-2 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-300 font-medium">
              Analyzing <strong className="text-emerald-400">{scopedNodes.length}</strong>{" "}
              {scopedNodes.length === 1 ? "topic" : "topics"} •{" "}
              <span className="text-sky-300">{LENS_HUMAN_LABEL[variantLens]}</span>
            </span>
            <button
              id="copilot-select-all-visible-btn"
              type="button"
              onClick={onQuickLassoSubgraph}
              className="text-[10px] font-mono text-sky-400 hover:text-sky-300"
            >
              Reset to Top 4
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {scopedNodes.map((n) => (
              <span
                key={n.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/90 border border-slate-700 text-slate-200 text-[11px] max-w-full"
              >
                <button
                  type="button"
                  onClick={() => onSelectNode(n.id)}
                  className="truncate max-w-[195px] hover:text-sky-300 text-left"
                  title={n.title}
                >
                  {n.title}
                </button>
                {lassoNodeIds.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onToggleLassoNode(n.id)}
                    className="text-slate-400 hover:text-rose-300"
                    title="Remove from brief scope"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* 1-Click Question Starters */}
        <div className="space-y-1">
          <div className="text-[10px] font-medium text-slate-400">Suggested Questions:</div>
          <div className="flex flex-wrap gap-1">
            {PROMPT_TEMPLATES.map((tpl) => (
              <button
                key={tpl.label}
                type="button"
                onClick={() => onSetCopilotQuestion(tpl.prompt)}
                className="px-2 py-0.5 rounded bg-[#090D14] hover:bg-slate-800 border border-slate-700/80 text-[11px] text-slate-300 hover:text-sky-300 transition"
              >
                {tpl.label}
              </button>
            ))}
          </div>
        </div>

        <textarea
          id="copilot-question-input"
          rows={2}
          value={copilotQuestion}
          onChange={(e) => onSetCopilotQuestion(e.target.value)}
          placeholder="Ask a question across these topics..."
          className="w-full bg-[#090D14] border border-slate-700 focus:border-emerald-400 rounded p-2 text-xs text-slate-100 leading-relaxed focus:outline-none"
        />

        {/* Primary Generate CTA + Secondary Export Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            id="run-subgraph-copilot-btn"
            type="button"
            disabled={copilotLoading}
            onClick={onRunCopilotQuery}
            className="flex-1 py-2 px-3 rounded bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-semibold text-xs transition flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{copilotLoading ? "Generating Brief..." : "Generate Brief"}</span>
          </button>
          <button
            id="copilot-export-pptx-btn"
            type="button"
            disabled={pptxDownloading}
            onClick={onDownloadPptx}
            className="py-2 px-2.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-medium flex items-center gap-1 transition"
            title="Export 5-slide PowerPoint briefing (.pptx)"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Slides</span>
          </button>
          <button
            id="export-markdown-brief-btn"
            type="button"
            disabled={briefDownloading}
            onClick={onDownloadBriefMarkdown}
            className="py-2 px-2.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-medium flex items-center gap-1 transition"
            title="Export Markdown Executive Memorandum (.md)"
          >
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span>{briefDownloading ? "..." : "Memo"}</span>
          </button>
        </div>
      </div>

      {/* 2. Structured, Scannable Executive Brief Output */}
      {copilotResponse && parsedAnswer && (
        <div id="copilot-structured-response" className="flex flex-col gap-2.5 pb-2">
          {/* Bottom-Line Answer Card */}
          <section className="bg-[#101722] border border-emerald-500/35 rounded-md p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Bottom-Line Answer
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#090D14] border border-slate-800 text-slate-400">
                {copilotResponse.execution_mode === "local_llm"
                  ? `${copilotResponse.llm_model} • ${((copilotResponse.latency_ms ?? 0) / 1000).toFixed(1)}s`
                  : "Structured Local Synthesis"}
              </span>
            </div>

            <div className="space-y-2 text-[13px] text-slate-100 leading-relaxed">
              {parsedAnswer.paragraphs.map((para, idx) => (
                <p key={idx}>{para}</p>
              ))}
            </div>

            {parsedAnswer.bullets.length > 0 && (
              <ul className="space-y-1.5 pt-1 border-t border-slate-800/80 text-xs text-slate-200">
                {parsedAnswer.bullets.map((b, idx) => {
                  const { lead, rest } = splitLeadPhrase(b);
                  return (
                    <li key={idx} className="flex items-start gap-2 leading-relaxed">
                      <span className="text-emerald-400 mt-0.5">•</span>
                      <span>
                        {lead && <strong className="text-slate-100">{lead}: </strong>}
                        {rest}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Key Topic Takeaways */}
          {copilotResponse.architectural_implications.length > 0 && (
            <section className="bg-[#101722] border border-slate-800 rounded-md p-3 space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-sky-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Key Findings Across Selected Topics
              </h3>
              <div className="space-y-2">
                {copilotResponse.architectural_implications.map((item, idx) => {
                  const { lead, rest } = splitLeadPhrase(item);
                  return (
                    <div
                      key={idx}
                      className="bg-[#090D14] border border-slate-800/90 rounded p-2.5 text-xs leading-relaxed text-slate-200"
                    >
                      {lead && <div className="font-semibold text-sky-200 mb-0.5">{lead}</div>}
                      <div>{rest}</div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Risks & Watchouts */}
          {copilotResponse.contrarian_risks.length > 0 && (
            <section className="bg-[#101722] border border-slate-800 rounded-md p-3 space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Risks & Implementation Watchouts
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-200">
                {copilotResponse.contrarian_risks.map((risk, idx) => {
                  const { lead, rest } = splitLeadPhrase(risk);
                  return (
                    <li
                      key={idx}
                      className="bg-[#090D14] border-l-2 border-rose-500/70 pl-2.5 pr-2 py-1.5 rounded-r leading-relaxed"
                    >
                      {lead && <strong className="text-rose-200">{lead}: </strong>}
                      <span>{rest}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* 90-Day Action Plan */}
          {copilotResponse.recommended_90_day_actions.length > 0 && (
            <section className="bg-[#101722] border border-slate-800 rounded-md p-3 space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-amber-400 flex items-center gap-1.5">
                <CalendarCheck className="w-3.5 h-3.5" />
                Recommended 90-Day Roadmap
              </h3>
              <ol className="space-y-1.5 text-xs text-slate-200">
                {copilotResponse.recommended_90_day_actions.map((act, idx) => {
                  const { lead, rest } = splitLeadPhrase(act);
                  return (
                    <li
                      key={idx}
                      className="bg-[#090D14] border border-slate-800/90 rounded p-2.5 leading-relaxed flex items-start gap-2"
                    >
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono text-[10px] font-semibold shrink-0 mt-0.5">
                        {lead || `Step ${idx + 1}`}
                      </span>
                      <span>{rest}</span>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {/* Collapsible Grounding Citations & Zero-Trust MCP Provenance */}
          <details className="bg-[#101722] border border-slate-800 rounded-md p-2.5 text-xs group">
            <summary className="cursor-pointer list-none flex items-center justify-between text-[11px] text-slate-300 font-medium">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  Verified Grounding ({copilotResponse.citations_used.length} Sources • Zero-Trust MCP)
                </span>
              </span>
              <span className="text-[10px] font-mono text-sky-400 group-open:rotate-180 transition">
                ▾
              </span>
            </summary>
            <div className="mt-2 pt-2 border-t border-slate-800 space-y-1.5">
              {copilotResponse.citations_used.map((cit) => (
                <div
                  key={cit.source_id}
                  className="bg-[#090D14] border border-slate-800 rounded p-2 flex items-start justify-between gap-2 text-[11px]"
                >
                  <div className="space-y-0.5">
                    <div className="font-medium text-slate-200">{cit.source_name}</div>
                    <div className="text-slate-400 line-clamp-2 italic">“{cit.exact_quote}”</div>
                  </div>
                  <a
                    href={cit.direct_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-400 hover:text-sky-300 shrink-0 mt-0.5"
                    title="Open primary URL"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
