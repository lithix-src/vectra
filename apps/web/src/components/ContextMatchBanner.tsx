"use client";

import React from "react";
import { Calculator, GitBranch, Sparkles, Target } from "lucide-react";
import { NodeContextMatchResult } from "@/lib/contextMatcher";
import { CanonicalNodeItem, RelationType, VariantLens } from "@/types/vectra";

interface ContextMatchBannerProps {
  node: CanonicalNodeItem;
  match: NodeContextMatchResult | undefined;
  contextQuery: string;
  activeVertical: string;
  variantLens: VariantLens;
  relationFilter: RelationType | "ALL";
  onOpenAssociationsTab: () => void;
  onOpenCypherModal: () => void;
}

export default function ContextMatchBanner({
  node,
  match,
  contextQuery,
  activeVertical,
  variantLens,
  relationFilter,
  onOpenAssociationsTab,
  onOpenCypherModal,
}: ContextMatchBannerProps) {
  const hasCustomQuery = contextQuery.trim().length > 0 || relationFilter !== "ALL";
  const breakdown = node.score_breakdown;

  return (
    <div
      id="context-match-rationale-card"
      className="bg-[#101722] border border-sky-500/35 rounded p-2.5 space-y-2 text-xs"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-sky-300 flex items-center gap-1.5 font-semibold">
          <Target className="w-3.5 h-3.5 text-sky-400" />
          Why Content Matches Target Context
        </span>
        <div className="flex items-center gap-1.5">
          {hasCustomQuery && match && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
              Match {match.matchScore}%
            </span>
          )}
          <button
            type="button"
            onClick={onOpenCypherModal}
            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1"
            title="Inspect exact mathematical score drivers & OpenCypher query"
          >
            <Calculator className="w-3 h-3 text-amber-400" />
            <span>Score Math</span>
          </button>
        </div>
      </div>

      {/* Active Target Context Expression Summary */}
      <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono">
        <span className="text-slate-400">Target:</span>
        <span className="px-1.5 py-0.5 rounded bg-[#090D14] border border-slate-800 text-slate-200">
          {activeVertical}
        </span>
        <span className="px-1.5 py-0.5 rounded bg-[#090D14] border border-slate-800 text-sky-300 uppercase">
          Lens:{variantLens}
        </span>
        {relationFilter !== "ALL" && (
          <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300">
            Edge:{relationFilter}
          </span>
        )}
        {contextQuery.trim() && (
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 truncate max-w-[180px]">
            &ldquo;{contextQuery.trim()}&rdquo;
          </span>
        )}
      </div>

      {/* Matched Facet Pills */}
      {match && match.matchedFacets.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {match.matchedFacets.map((facet) => (
            <span
              key={facet}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-200 border border-sky-500/30 flex items-center gap-1"
            >
              <Sparkles className="w-2.5 h-2.5 text-sky-400" />
              {facet}
            </span>
          ))}
        </div>
      )}

      {/* Matched Evidence Excerpt when Query or Edge Filter is Active */}
      {hasCustomQuery && match?.primarySnippet && (
        <div className="bg-[#090D14] border border-slate-800 rounded p-2 text-[11px] text-slate-200 leading-snug">
          <span className="font-mono text-[10px] uppercase text-emerald-400 mr-1.5">
            [{match.primarySnippet.facet}]:
          </span>
          <span>{match.primarySnippet.excerpt}</span>
        </div>
      )}

      {/* Score Drivers + Quick Association Jump */}
      <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[10px] font-mono text-slate-400">
        <span>
          Drivers: Auth <strong className="text-emerald-400">{breakdown?.source_authority_component ?? "—"}</strong>{" "}
          + Graph <strong className="text-sky-400">{breakdown?.graph_centrality_component ?? "—"}</strong>{" "}
          × <strong className="text-amber-400">{node.consultant_weight}x</strong>
        </span>
        <button
          type="button"
          onClick={onOpenAssociationsTab}
          className="text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold shrink-0"
        >
          <GitBranch className="w-3 h-3" />
          <span>{match?.associationCount ?? 0} Data Links →</span>
        </button>
      </div>
    </div>
  );
}
