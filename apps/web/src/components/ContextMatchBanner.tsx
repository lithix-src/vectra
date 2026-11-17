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
  relationFilter,
  onOpenAssociationsTab,
  onOpenCypherModal,
}: ContextMatchBannerProps) {
  const hasCustomQuery = contextQuery.trim().length > 0 || relationFilter !== "ALL";
  const breakdown = node.score_breakdown;

  return (
    <div
      id="context-match-rationale-card"
      className="bg-[#101722] border border-slate-800 rounded-md p-3 space-y-2 text-xs"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-sky-300 flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-sky-400" />
          <span>{hasCustomQuery ? "Why This Topic Matches Your Filter" : "Ranking & Relevance Drivers"}</span>
        </span>
        <div className="flex items-center gap-1.5">
          {hasCustomQuery && match && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold">
              Match {match.matchScore}%
            </span>
          )}
          <button
            type="button"
            onClick={onOpenCypherModal}
            className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#090D14] hover:bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1 transition"
            title="View Score Formula & OpenCypher Graph Query"
          >
            <Calculator className="w-3 h-3 text-amber-400" />
            <span>Score Formula</span>
          </button>
        </div>
      </div>

      {/* Active Filter Summary when filtering */}
      {hasCustomQuery && (
        <div className="flex flex-wrap items-center gap-1 text-[11px]">
          <span className="text-slate-400">Active filter:</span>
          {activeVertical !== "All Verticals" && (
            <span className="px-2 py-0.5 rounded bg-[#090D14] border border-slate-800 text-slate-200">
              {activeVertical}
            </span>
          )}
          {relationFilter !== "ALL" && (
            <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300">
              Link: {relationFilter}
            </span>
          )}
          {contextQuery.trim() && (
            <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 truncate max-w-[200px]">
              “{contextQuery.trim()}”
            </span>
          )}
        </div>
      )}

      {/* Matched Facet Pills */}
      {hasCustomQuery && match && match.matchedFacets.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {match.matchedFacets.map((facet) => (
            <span
              key={facet}
              className="text-[10px] font-medium px-2 py-0.5 rounded bg-sky-500/15 text-sky-200 border border-sky-500/30 flex items-center gap-1"
            >
              <Sparkles className="w-2.5 h-2.5 text-sky-400" />
              {facet}
            </span>
          ))}
        </div>
      )}

      {/* Highlighted Excerpt */}
      {hasCustomQuery && match?.primarySnippet && (
        <div className="bg-[#090D14] border border-slate-800 rounded p-2 text-[11.5px] text-slate-200 leading-relaxed">
          <span className="font-semibold text-emerald-400 mr-1.5">
            {match.primarySnippet.facet}:
          </span>
          <span>{match.primarySnippet.excerpt}</span>
        </div>
      )}

      {/* Plain-English Score Breakdown */}
      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
        <span>
          Source Authority <strong className="text-emerald-400 font-mono">{breakdown?.source_authority_component ?? "—"}</strong>{" "}
          • Graph Centrality <strong className="text-sky-400 font-mono">{breakdown?.graph_centrality_component ?? "—"}</strong>{" "}
          • Priority <strong className="text-amber-400 font-mono">{node.consultant_weight}x</strong>
        </span>
        <button
          type="button"
          onClick={onOpenAssociationsTab}
          className="text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium shrink-0"
        >
          <GitBranch className="w-3 h-3" />
          <span>{match?.associationCount ?? 0} links →</span>
        </button>
      </div>
    </div>
  );
}
