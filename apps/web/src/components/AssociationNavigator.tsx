"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  GitBranch,
  Lasso,
  Link2,
  Plus,
} from "lucide-react";
import { getNodeAssociations, ResolvedAssociation } from "@/lib/contextMatcher";
import {
  AssociativeEdgeItem,
  CanonicalNodeItem,
  RelationType,
} from "@/types/vectra";

interface AssociationNavigatorProps {
  activeNode: CanonicalNodeItem;
  allNodes: CanonicalNodeItem[];
  edges: AssociativeEdgeItem[];
  lassoNodeIds: string[];
  relationFilter: RelationType | "ALL";
  onSelectNode: (nodeId: string) => void;
  onScopeNeighborhood: (nodeId: string) => void;
  onToggleLassoNode: (nodeId: string) => void;
  onCreateTypedEdge: (
    sourceId: string,
    targetId: string,
    relationType: RelationType,
    rationaleNote: string
  ) => Promise<void>;
}

const RELATION_BADGE_STYLE: Record<RelationType, string> = {
  ENABLES: "bg-sky-500/15 text-sky-300 border-sky-500/40",
  CASE_STUDY_OF: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  REGULATES: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  CONFLICTS_WITH: "bg-rose-500/15 text-rose-300 border-rose-500/40",
  REPLACES: "bg-slate-700/60 text-slate-200 border-slate-600",
};

const RELATION_OPTIONS: RelationType[] = [
  "ENABLES",
  "CASE_STUDY_OF",
  "REGULATES",
  "CONFLICTS_WITH",
  "REPLACES",
];

export default function AssociationNavigator({
  activeNode,
  allNodes,
  edges,
  lassoNodeIds,
  relationFilter,
  onSelectNode,
  onScopeNeighborhood,
  onToggleLassoNode,
  onCreateTypedEdge,
}: AssociationNavigatorProps) {
  const { incoming, outgoing, neighborIds } = useMemo(
    () => getNodeAssociations(activeNode.id, allNodes, edges, relationFilter),
    [activeNode.id, allNodes, edges, relationFilter]
  );

  const otherNodes = useMemo(
    () => allNodes.filter((n) => n.id !== activeNode.id),
    [allNodes, activeNode.id]
  );

  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [targetId, setTargetId] = useState<string>("");
  const [relType, setRelType] = useState<RelationType>("ENABLES");
  const [rationale, setRationale] = useState<string>("");
  const [creating, setCreating] = useState<boolean>(false);

  const handleSubmitEdge = async (e: React.FormEvent) => {
    e.preventDefault();
    const chosenTarget = targetId || otherNodes[0]?.id;
    if (!chosenTarget) return;
    setCreating(true);
    try {
      await onCreateTypedEdge(
        activeNode.id,
        chosenTarget,
        relType,
        rationale.trim() || `Associated via ${relType} in VECTRA Association Explorer`
      );
      setRationale("");
      setShowAddForm(false);
    } finally {
      setCreating(false);
    }
  };

  const renderAssocCard = (assoc: ResolvedAssociation) => {
    const { edge, peerNode, direction, sharedVerticals } = assoc;
    const isLassoed = lassoNodeIds.includes(peerNode.id);
    return (
      <div
        key={edge.id}
        id={`assoc-card-${edge.id}`}
        className="bg-[#090D14] border border-slate-800 hover:border-slate-700 rounded p-2.5 space-y-2 transition"
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border font-semibold ${
                RELATION_BADGE_STYLE[edge.relation_type]
              }`}
            >
              {direction === "outgoing" ? `──[${edge.relation_type}]──▶` : `◀──[${edge.relation_type}]──`}
            </span>
            {edge.is_user_created && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-0.5">
                <Link2 className="w-2.5 h-2.5" /> [[Wikilink]]
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            w={edge.weight.toFixed(1)} • Score{" "}
            <strong className="text-sky-300">{peerNode.composite_score}</strong>
          </span>
        </div>

        <button
          id={`jump-assoc-node-${peerNode.slug}`}
          type="button"
          onClick={() => onSelectNode(peerNode.id)}
          className="w-full text-left group flex items-start justify-between gap-2"
        >
          <span className="text-xs font-semibold text-slate-100 group-hover:text-sky-300 leading-snug transition">
            {peerNode.title}
          </span>
          <ArrowUpRight className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5 group-hover:translate-x-0.5 transition" />
        </button>

        {/* Verbatim Association Rationale (Why these two nodes are linked) */}
        {edge.consultant_note && (
          <div className="text-[11px] text-slate-300 bg-[#101722] border-l-2 border-sky-500/60 pl-2.5 py-1.5 pr-2 rounded-r leading-relaxed">
            <span className="font-mono text-[9px] uppercase text-slate-400 block mb-0.5">
              Association Rationale:
            </span>
            {edge.consultant_note}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex flex-wrap gap-1">
            {sharedVerticals.slice(0, 2).map((vert) => (
              <span
                key={vert}
                className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800/90 text-slate-300"
              >
                Shared: {vert}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onToggleLassoNode(peerNode.id)}
            className={`text-[10px] font-mono px-2 py-0.5 rounded border transition shrink-0 ${
              isLassoed
                ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
            }`}
          >
            {isLassoed ? "✓ In Co-Pilot" : "+ Scope"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div id="data-association-navigator" className="flex flex-col gap-3">
      {/* Top Neighborhood Action Bar */}
      <div className="bg-[#101722] border border-slate-800 rounded p-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] font-mono text-slate-300 flex items-center gap-1.5">
          <GitBranch className="w-3.5 h-3.5 text-sky-400" />
          <span>
            <strong>{outgoing.length + incoming.length}</strong> Typed Links (
            {neighborIds.length} Connected Nodes)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            id="scope-1hop-neighborhood-btn"
            type="button"
            onClick={() => onScopeNeighborhood(activeNode.id)}
            className="px-2 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-[10px] font-mono uppercase font-semibold flex items-center gap-1 transition"
            title="Lasso this node and all its 1-hop associated neighbors into Subgraph Co-Pilot"
          >
            <Lasso className="w-3 h-3" />
            <span>Lasso 1-Hop ({neighborIds.length + 1})</span>
          </button>
          <button
            id="toggle-inline-edge-creator-btn"
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="px-2 py-1 rounded bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 text-[10px] font-mono uppercase font-semibold flex items-center gap-1 transition"
          >
            <Plus className="w-3 h-3" />
            <span>Link</span>
          </button>
        </div>
      </div>

      {/* Inline Typed Association Creator */}
      {showAddForm && otherNodes.length > 0 && (
        <form
          onSubmit={handleSubmitEdge}
          className="bg-[#101722] border border-sky-500/40 rounded p-2.5 space-y-2 text-xs"
        >
          <div className="text-[10px] font-mono uppercase text-sky-300 font-semibold">
            Create Directed Association from &ldquo;{activeNode.title.slice(0, 32)}…&rdquo;
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <select
              value={relType}
              onChange={(e) => setRelType(e.target.value as RelationType)}
              className="bg-[#090D14] border border-slate-700 rounded px-2 py-1 text-[11px] font-mono text-slate-100"
            >
              {RELATION_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <select
              value={targetId || otherNodes[0]?.id || ""}
              onChange={(e) => setTargetId(e.target.value)}
              className="col-span-2 bg-[#090D14] border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-100"
            >
              {otherNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title}
                </option>
              ))}
            </select>
          </div>
          <input
            type="text"
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder="Why are these nodes associated? (e.g. Sub-190ms SLA depends on KV-cache routing)"
            className="w-full bg-[#090D14] border border-slate-700 rounded px-2 py-1 text-xs text-slate-100"
          />
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-2 py-1 rounded bg-slate-800 text-[10px] font-mono text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-2.5 py-1 rounded bg-sky-500 text-slate-950 font-bold text-[10px] font-mono uppercase"
            >
              {creating ? "Saving..." : "Save Association"}
            </button>
          </div>
        </form>
      )}

      {/* Outgoing Impacts */}
      <div className="bg-[#101722] border border-slate-800 rounded p-2.5 space-y-2">
        <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <ArrowRight className="w-3 h-3" /> Outgoing Impacts (This Node Drives / Regulates)
          </span>
          <span>{outgoing.length}</span>
        </div>
        {outgoing.length === 0 ? (
          <div className="text-[11px] text-slate-500 font-mono py-1">
            No outgoing {relationFilter !== "ALL" ? relationFilter : ""} associations on current view.
          </div>
        ) : (
          <div className="space-y-2">{outgoing.map(renderAssocCard)}</div>
        )}
      </div>

      {/* Incoming Drivers & Constraints */}
      <div className="bg-[#101722] border border-slate-800 rounded p-2.5 space-y-2">
        <div className="text-[10px] font-mono uppercase tracking-wider text-sky-400 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <ArrowRight className="w-3 h-3" /> Upstream Drivers & Governance Constraints
          </span>
          <span>{incoming.length}</span>
        </div>
        {incoming.length === 0 ? (
          <div className="text-[11px] text-slate-500 font-mono py-1">
            No incoming {relationFilter !== "ALL" ? relationFilter : ""} associations on current view.
          </div>
        ) : (
          <div className="space-y-2">{incoming.map(renderAssocCard)}</div>
        )}
      </div>
    </div>
  );
}
