"use client";

import React, { useState } from "react";
import { Check, Code2, Copy, PlusCircle, X } from "lucide-react";
import { VERTICAL_LIST } from "@/lib/vectraDefaults";
import { CanonicalNodeItem } from "@/types/vectra";

interface IngestAndCypherModalsProps {
  ingestModalOpen: boolean;
  onCloseIngestModal: () => void;
  cypherModalOpen: boolean;
  onCloseCypherModal: () => void;
  selectedNode: CanonicalNodeItem | null;
  activeVertical: string;
  cypherSql: string;
  cypherGraphName: string;
  cypherLoading: boolean;
  onSignalIngested: (nodeId?: string, toastMsg?: string) => Promise<void>;
  onTriggerToast: (msg: string) => void;
}

export default function IngestAndCypherModals({
  ingestModalOpen,
  onCloseIngestModal,
  cypherModalOpen,
  onCloseCypherModal,
  selectedNode,
  activeVertical,
  cypherSql,
  cypherGraphName,
  cypherLoading,
  onSignalIngested,
  onTriggerToast,
}: IngestAndCypherModalsProps) {
  const [ingestSubmitting, setIngestSubmitting] = useState<boolean>(false);
  const [ingestTitle, setIngestTitle] = useState<string>(
    "Deterministic Temporal DAGs & vLLM Grammar Masking in Tier-1 AML"
  );
  const [ingestQuote, setIngestQuote] = useState<string>(
    "Production audit across 14M wire settlements confirmed 61% manual review reduction with zero ungrounded tool invocations when combining Temporal state graphs with Outlines JSON-schema decoding."
  );
  const [ingestUrl, setIngestUrl] = useState<string>(
    "https://stratechery.com/2026/deterministic-banking-agents-audit/"
  );
  const [ingestSourceName, setIngestSourceName] = useState<string>(
    "Stratechery Executive Dispatch (Field Telemetry)"
  );
  const [ingestLicense, setIngestLicense] = useState<"subscriber_licensed" | "public">(
    "subscriber_licensed"
  );
  const [ingestVisibility, setIngestVisibility] = useState<
    "user_private" | "org_private" | "global"
  >("user_private");
  const [ingestVertical, setIngestVertical] = useState<string>("Financial Services");
  const [copiedCypher, setCopiedCypher] = useState<boolean>(false);

  const handleIngestCustomSignal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingestTitle.trim() || !ingestQuote.trim()) return;
    setIngestSubmitting(true);
    try {
      const res = await fetch(
        `/api/signals/ingest?tenant_user_id=erik&tenant_org_id=vectra-advisory`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: ingestTitle.trim(),
            exact_quote: ingestQuote.trim(),
            direct_url: ingestUrl.trim() || "https://sec.gov/edgar",
            source_type: ingestLicense === "subscriber_licensed" ? "newsletter" : "eng_blog",
            source_name: ingestSourceName.trim() || "VECTRA Field Dispatch",
            author_handle: "@erik_vectra_ai",
            authority_tier: 1,
            provenance_license: ingestLicense,
            visibility: ingestVisibility,
            industry_verticals: [ingestVertical],
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const clusterResult = data.cluster_result || data;
        const actionLabel = clusterResult?.clustered_into_existing
          ? `Clustered into existing Canonical Node "${clusterResult.node_title}" (cosine ${clusterResult.cosine_similarity})`
          : `Created new Canonical Node "${clusterResult?.node_title || ingestTitle}"`;
        await onSignalIngested(clusterResult?.node_id, `Ingested Signal: ${actionLabel}`);
        onCloseIngestModal();
      }
    } finally {
      setIngestSubmitting(false);
    }
  };

  return (
    <>
      {ingestModalOpen && (
        <div
          id="ingest-signal-modal"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onCloseIngestModal}
        >
          <div
            className="w-full max-w-lg bg-[#101722] border border-sky-500/40 rounded-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 bg-[#0D131F]">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-100">
                  Ingest Primary Intelligence Signal (14-Day Canonical Clustering)
                </h3>
              </div>
              <button
                type="button"
                onClick={onCloseIngestModal}
                className="text-slate-400 hover:text-slate-200 p-1 rounded bg-slate-800/80"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleIngestCustomSignal} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                  Signal / Topic Title
                </label>
                <input
                  id="ingest-signal-title-input"
                  type="text"
                  required
                  value={ingestTitle}
                  onChange={(e) => setIngestTitle(e.target.value)}
                  className="w-full bg-[#090D14] border border-slate-700 focus:border-sky-400 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                  Verbatim Pull-Quote (`exact_quote`)
                </label>
                <textarea
                  id="ingest-signal-quote-input"
                  rows={3}
                  required
                  value={ingestQuote}
                  onChange={(e) => setIngestQuote(e.target.value)}
                  className="w-full bg-[#090D14] border border-slate-700 focus:border-sky-400 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                    Primary Source Name
                  </label>
                  <input
                    id="ingest-signal-source-input"
                    type="text"
                    required
                    value={ingestSourceName}
                    onChange={(e) => setIngestSourceName(e.target.value)}
                    className="w-full bg-[#090D14] border border-slate-700 focus:border-sky-400 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                    Direct Verification URL
                  </label>
                  <input
                    id="ingest-signal-url-input"
                    type="url"
                    required
                    value={ingestUrl}
                    onChange={(e) => setIngestUrl(e.target.value)}
                    className="w-full bg-[#090D14] border border-slate-700 focus:border-sky-400 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                    Provenance License
                  </label>
                  <select
                    id="ingest-signal-license-select"
                    value={ingestLicense}
                    onChange={(e) =>
                      setIngestLicense(e.target.value as "subscriber_licensed" | "public")
                    }
                    className="w-full bg-[#090D14] border border-slate-700 rounded px-2 py-1.5 text-xs font-mono text-slate-100"
                  >
                    <option value="subscriber_licensed">subscriber_licensed</option>
                    <option value="public">public</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                    RLS Visibility Scope
                  </label>
                  <select
                    id="ingest-signal-visibility-select"
                    value={ingestVisibility}
                    onChange={(e) =>
                      setIngestVisibility(
                        e.target.value as "user_private" | "org_private" | "global"
                      )
                    }
                    className="w-full bg-[#090D14] border border-slate-700 rounded px-2 py-1.5 text-xs font-mono text-slate-100"
                  >
                    <option value="user_private">user_private</option>
                    <option value="org_private">org_private</option>
                    <option value="global">global</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                    Industry Vertical
                  </label>
                  <select
                    id="ingest-signal-vertical-select"
                    value={ingestVertical}
                    onChange={(e) => setIngestVertical(e.target.value)}
                    className="w-full bg-[#090D14] border border-slate-700 rounded px-2 py-1.5 text-xs font-mono text-slate-100"
                  >
                    {VERTICAL_LIST.filter((v) => v !== "All Verticals").map((vert) => (
                      <option key={vert} value={vert}>
                        {vert}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onCloseIngestModal}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300"
                >
                  Cancel
                </button>
                <button
                  id="submit-ingest-signal-btn"
                  type="submit"
                  disabled={ingestSubmitting}
                  className="px-4 py-1.5 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs font-mono uppercase tracking-wider"
                >
                  {ingestSubmitting ? "Clustering (Cosine > 0.84)..." : "Ingest & Cluster Signal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cypherModalOpen && (
        <div
          id="cypher-score-math-modal"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onCloseCypherModal}
        >
          <div
            className="w-full max-w-2xl bg-[#101722] border border-sky-500/40 rounded-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 bg-[#0D131F]">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-100">
                  Composite Signal Score Math & Apache AGE OpenCypher Inspector
                </h3>
              </div>
              <button
                id="close-cypher-math-modal-btn"
                type="button"
                onClick={onCloseCypherModal}
                className="text-slate-400 hover:text-slate-200 p-1 rounded bg-slate-800/80"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 space-y-4 text-xs">
              {selectedNode && (
                <div className="bg-[#090D14] border border-slate-800 rounded p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-amber-400">
                      Focused Canonical Node Mathematical Breakdown
                    </span>
                    <span className="font-mono text-xs text-sky-400 font-bold">
                      {selectedNode.title}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-2 text-center font-mono">
                    <div className="p-2 rounded bg-[#101722] border border-slate-800">
                      <div className="text-[10px] text-slate-400">0.35·Base</div>
                      <div className="text-sm font-bold text-slate-200 mt-0.5">
                        {selectedNode.score_breakdown?.base_signal_component ??
                          Math.round(selectedNode.base_signal_score * 35) / 100}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-[#101722] border border-slate-800">
                      <div className="text-[10px] text-slate-400">S_auth</div>
                      <div
                        id="math-source-authority-val"
                        className="text-sm font-bold text-emerald-400 mt-0.5"
                      >
                        {selectedNode.score_breakdown?.source_authority_component ?? 80.0}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-[#101722] border border-slate-800">
                      <div className="text-[10px] text-slate-400">G_centrality</div>
                      <div
                        id="math-graph-centrality-val"
                        className="text-sm font-bold text-sky-400 mt-0.5"
                      >
                        {selectedNode.score_breakdown?.graph_centrality_component ?? 75.0}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-[#101722] border border-slate-800">
                      <div className="text-[10px] text-slate-400">W_consultant</div>
                      <div
                        id="math-consultant-weight-val"
                        className="text-sm font-bold text-amber-400 mt-0.5"
                      >
                        {selectedNode.score_breakdown?.consultant_weight ??
                          selectedNode.consultant_weight}
                        x
                      </div>
                    </div>
                    <div className="p-2 rounded bg-sky-500/15 border border-sky-500/40">
                      <div className="text-[10px] text-sky-300">Composite</div>
                      <div
                        id="math-composite-score-val"
                        className="text-sm font-bold text-slate-100 mt-0.5"
                      >
                        {selectedNode.score_breakdown?.composite_score ??
                          selectedNode.composite_score}
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] font-mono text-slate-400 bg-[#101722] px-2.5 py-1.5 rounded border border-slate-800">
                    Formula: Composite_Score = round((0.35 · Base_Signal + S_auth + G_centrality) ×
                    clip(W_consultant, 0.5, 5.0), 1)
                  </div>
                </div>
              )}

              <div className="bg-[#090D14] border border-slate-800 rounded p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase text-emerald-400">
                      Live Apache AGE OpenCypher SQL ({cypherGraphName})
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      Vertical: {activeVertical}
                    </span>
                  </div>
                  <button
                    id="copy-cypher-query-btn"
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(cypherSql);
                      setCopiedCypher(true);
                      onTriggerToast("Copied Apache AGE OpenCypher SQL to clipboard");
                      setTimeout(() => setCopiedCypher(false), 2000);
                    }}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-200 flex items-center gap-1"
                  >
                    {copiedCypher ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    {copiedCypher ? "Copied" : "Copy Cypher SQL"}
                  </button>
                </div>

                <pre
                  id="apache-age-cypher-code"
                  className="p-2.5 rounded bg-[#101722] border border-slate-800 font-mono text-[11px] text-sky-300 whitespace-pre-wrap overflow-x-auto leading-relaxed"
                >
                  {cypherLoading ? "Loading Apache AGE OpenCypher query..." : cypherSql}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
