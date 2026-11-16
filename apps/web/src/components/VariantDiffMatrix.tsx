"use client";

import React, { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  Node,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CanonicalNodeItem, NodeSourceItem, VariantLens } from "@/types/vectra";
import { ExternalLink, ShieldCheck, AlertTriangle, Sparkles } from "lucide-react";

interface VariantDiffMatrixProps {
  nodes: CanonicalNodeItem[];
  selectedNode: CanonicalNodeItem | null;
  variantLens: VariantLens;
  onSelectNode: (nodeId: string) => void;
  onInspectSource: (source: NodeSourceItem) => void;
}

export default function VariantDiffMatrix({
  nodes,
  selectedNode,
  variantLens,
  onSelectNode,
  onInspectSource,
}: VariantDiffMatrixProps) {
  const focusNode = selectedNode || nodes[0] || null;

  const { flowNodes, flowEdges } = useMemo(() => {
    if (!focusNode) return { flowNodes: [], flowEdges: [] };

    const fNodes: Node[] = [
      {
        id: "claim-vendor",
        position: { x: 25, y: 35 },
        data: {
          label: (
            <div className="text-left p-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 mb-1">
                1. VENDOR MARKETING CLAIM
              </div>
              <div className="text-xs text-slate-200 leading-snug">
                {focusNode.claim_vendor}
              </div>
            </div>
          ),
        },
        style: {
          background: "#101722",
          color: "#F8FAFC",
          border: "1px solid #F59E0B",
          borderRadius: "6px",
          width: 260,
        },
      },
      {
        id: "claim-builder",
        position: { x: 335, y: 35 },
        data: {
          label: (
            <div className="text-left p-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-rose-400 mb-1">
                2. BUILDER FIELD REALITY (CONTRARIAN)
              </div>
              <div className="text-xs text-slate-200 leading-snug">
                {focusNode.claim_builder}
              </div>
            </div>
          ),
        },
        style: {
          background: "#101722",
          color: "#F8FAFC",
          border: "1px solid #F43F5E",
          borderRadius: "6px",
          width: 280,
        },
      },
      {
        id: "claim-production",
        position: { x: 665, y: 35 },
        data: {
          label: (
            <div className="text-left p-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 mb-1">
                3. AUDITED ENTERPRISE PRODUCTION PROOF
              </div>
              <div className="text-xs text-slate-200 leading-snug">
                {focusNode.claim_production}
              </div>
            </div>
          ),
        },
        style: {
          background: "#101722",
          color: "#F8FAFC",
          border: "1px solid #10B981",
          borderRadius: "6px",
          width: 280,
        },
      },
    ];

    const fEdges: Edge[] = [
      {
        id: "e-vendor-builder",
        source: "claim-vendor",
        target: "claim-builder",
        label: "STRESS-TESTED BY",
        animated: true,
        style: { stroke: "#F43F5E", strokeWidth: 1.8 },
        labelStyle: { fill: "#F43F5E", fontSize: 9, fontWeight: 700 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#F43F5E" },
      },
      {
        id: "e-builder-prod",
        source: "claim-builder",
        target: "claim-production",
        label: "PRODUCTION GATED",
        animated: true,
        style: { stroke: "#10B981", strokeWidth: 1.8 },
        labelStyle: { fill: "#10B981", fontSize: 9, fontWeight: 700 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#10B981" },
      },
    ];

    return { flowNodes: fNodes, flowEdges: fEdges };
  }, [focusNode]);

  return (
    <div
      id="variant-diff-matrix-view"
      className="flex flex-col w-full h-full bg-[#090D14] overflow-y-auto"
    >
      {/* Top Interactive @xyflow/react Variant Pipeline Canvas */}
      <div className="h-52 min-h-[208px] w-full border-b border-slate-800 relative bg-[#0B101B]">
        <div className="absolute top-2 left-3 z-10 flex items-center gap-2 bg-[#101722]/90 border border-slate-800 px-2.5 py-1 rounded text-xs">
          <span className="font-mono text-[11px] text-sky-400 uppercase">
            @xyflow/react Variant Pipeline:
          </span>
          <span className="font-semibold text-slate-200 truncate max-w-md">
            {focusNode?.title}
          </span>
        </div>
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#1E293B" gap={18} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      {/* Synchronized Side-by-Side Variant Comparison Table */}
      <div className="p-4 flex-1">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider font-mono">
              Synchronized Variant Diff Matrix — Vendor Claim vs. Builder Reality vs. Production Proof
            </h2>
            <p className="text-xs text-slate-400">
              Click any row to focus node on graph or click inline provenance pills to inspect verbatim primary quotes.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-xs text-sky-400">
            Active Lens: {variantLens.toUpperCase()}
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-md">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#101722] border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400">
                <th className="p-3 w-[20%]">Canonical Node & Score</th>
                <th className="p-3 w-[23%] text-amber-400">
                  <span className="inline-flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Vendor Marketing Claim
                  </span>
                </th>
                <th className="p-3 w-[26%] text-rose-400">
                  <span className="inline-flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Independent Builder Reality
                  </span>
                </th>
                <th className="p-3 w-[31%] text-emerald-400">
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Enterprise Production Proof & Citations
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {nodes.map((node) => {
                const isSelected = focusNode?.id === node.id;
                return (
                  <tr
                    key={node.id}
                    onClick={() => onSelectNode(node.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-sky-950/30 border-l-2 border-l-sky-400"
                        : "hover:bg-[#101722]/70"
                    }`}
                  >
                    <td className="p-3 align-top">
                      <div className="font-semibold text-slate-100 leading-snug mb-1">
                        {node.title}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
                        <span className="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                          Score: {node.composite_score}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {node.consultant_weight}x
                        </span>
                      </div>
                    </td>
                    <td className="p-3 align-top text-slate-300 leading-relaxed">
                      {node.claim_vendor}
                    </td>
                    <td className="p-3 align-top text-slate-200 leading-relaxed">
                      {node.claim_builder}
                    </td>
                    <td className="p-3 align-top">
                      <div className="text-slate-100 leading-relaxed mb-2">
                        {node.claim_production}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {node.sources.map((src) => (
                          <button
                            key={src.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectNode(node.id);
                              onInspectSource(src);
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border transition ${
                              src.provenance_license === "subscriber_licensed"
                                ? "bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25"
                                : "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25"
                            }`}
                          >
                            <span>
                              {src.provenance_license === "subscriber_licensed"
                                ? "[Subscriber]"
                                : "[Public]"}
                            </span>
                            <span>{src.author_handle}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
