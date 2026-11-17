"use client";

import React, { useState } from "react";
import {
  Activity,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  KeyRound,
  Mail,
  RefreshCw,
} from "lucide-react";
import {
  CanonicalNodeItem,
  CollectorPacksStatus,
  UserIntegrationItem,
} from "@/types/vectra";

interface LeftRailDrawersProps {
  nodes: CanonicalNodeItem[];
  selectedNode: CanonicalNodeItem | null;
  integrations: UserIntegrationItem[];
  collectorStatus: CollectorPacksStatus;
  collectorBusyPackId: string | null;
  onSelectNode: (id: string) => void;
  onSimulateInboundNewsletter: () => void;
  onRunPublicCollectors: () => void;
  onOpenCollectorModal: () => void;
  onRefreshIntegration: (provider: string) => void;
  onTriggerToast: (msg: string) => void;
}

export default function LeftRailDrawers({
  nodes,
  selectedNode,
  integrations,
  collectorStatus,
  collectorBusyPackId,
  onSelectNode,
  onSimulateInboundNewsletter,
  onRunPublicCollectors,
  onOpenCollectorModal,
  onRefreshIntegration,
  onTriggerToast,
}: LeftRailDrawersProps) {
  const [heatmapOpen, setHeatmapOpen] = useState<boolean>(false);
  const [authDrawerOpen, setAuthDrawerOpen] = useState<boolean>(false);
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);
  const enabledPacks = collectorStatus.packs.filter((p) => p.schedule.enabled).length;
  const expiringCount = integrations.filter((i) => i.status !== "healthy").length;

  return (
    <>
      <section className="bg-[#101722] border border-slate-800 rounded p-2 shrink-0">
        <button
          type="button"
          onClick={() => setHeatmapOpen((v) => !v)}
          className="w-full flex items-center justify-between text-left"
        >
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            {heatmapOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <Activity className="w-3 h-3 text-emerald-400" /> Pulse Heatmap (Velocity × ROI)
          </span>
          <span className="text-[10px] font-mono text-emerald-400">{nodes.length} Plotted</span>
        </button>
        {heatmapOpen && (
          <div className="relative w-full h-32 bg-[#090D14] border border-slate-800 rounded p-1.5 mt-2">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 240 120">
              <line x1="120" y1="0" x2="120" y2="108" stroke="#1E293B" strokeDasharray="3 3" />
              <line x1="0" y1="54" x2="240" y2="54" stroke="#1E293B" strokeDasharray="3 3" />
              <text x="142" y="10" fill="#10B981" fontSize="7" fontFamily="monospace">
                SCALE LEADERS
              </text>
              {nodes.map((n) => {
                const cx = Math.max(14, Math.min(226, (n.adoption_velocity / 100) * 230));
                const cy = Math.max(12, Math.min(100, 108 - (n.verified_roi_score / 100) * 96));
                const isSel = selectedNode?.id === n.id;
                return (
                  <circle
                    key={n.id}
                    cx={cx}
                    cy={cy}
                    r={isSel ? 6 : 4}
                    fill={isSel ? "#38BDF8" : "#10B981"}
                    stroke={isSel ? "#F8FAFC" : "#064E3B"}
                    strokeWidth={1.5}
                    className="cursor-pointer"
                    onClick={() => onSelectNode(n.id)}
                  />
                );
              })}
            </svg>
          </div>
        )}
      </section>

      <section
        id="connected-sources-auth-drawer"
        className="bg-[#101722] border border-slate-800 rounded p-2 shrink-0"
      >
        <button
          type="button"
          onClick={() => setAuthDrawerOpen((v) => !v)}
          className="w-full flex items-center justify-between text-left"
        >
          <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            {authDrawerOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <KeyRound className="w-3 h-3" /> KMS Vault & Ingest Ops
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            {expiringCount > 0 ? `${expiringCount} Expiring` : `${integrations.length} Healthy`}
          </span>
        </button>

        {authDrawerOpen && (
          <div className="mt-2 flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-0.5">
            <div className="p-2 rounded bg-[#090D14] border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between gap-1">
                <code id="inbound-newsletter-email-alias" className="text-[10px] font-mono text-sky-300 truncate">
                  intel+erik@ingest.vectra.ai
                </code>
                <button
                  id="copy-ingest-email-btn"
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText("intel+erik@ingest.vectra.ai");
                    setCopiedEmail(true);
                    onTriggerToast("Copied intel+erik@ingest.vectra.ai to clipboard");
                    setTimeout(() => setCopiedEmail(false), 2000);
                  }}
                  className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-200 flex items-center gap-1 shrink-0"
                >
                  {copiedEmail ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                  {copiedEmail ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <button
                  id="simulate-inbound-newsletter-btn"
                  type="button"
                  onClick={onSimulateInboundNewsletter}
                  className="py-1 px-1.5 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-[9px] font-mono uppercase flex items-center justify-center gap-1"
                >
                  <Mail className="w-2.5 h-2.5" /> Webhook
                </button>
                <button
                  id="run-public-collectors-btn"
                  type="button"
                  disabled={collectorBusyPackId === "all"}
                  onClick={onRunPublicCollectors}
                  className="py-1 px-1.5 rounded bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 text-[9px] font-mono uppercase flex items-center justify-center gap-1"
                >
                  <RefreshCw className="w-2.5 h-2.5" /> {collectorBusyPackId === "all" ? "Sync..." : "Sync Feeds"}
                </button>
              </div>
              <button
                id="left-rail-open-collector-scheduler-btn"
                type="button"
                onClick={onOpenCollectorModal}
                className="w-full py-1 px-2 rounded bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[9px] font-mono uppercase flex items-center justify-between"
              >
                <span className="flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5 text-amber-400" /> Schedules
                </span>
                <span className="text-emerald-400">{enabledPacks}/{collectorStatus.packs.length} ACTIVE</span>
              </button>
            </div>

            {integrations.map((integ) => (
              <div
                key={integ.id}
                className="p-1.5 rounded bg-[#090D14] border border-slate-800 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-[11px] font-mono font-semibold text-slate-200 truncate">
                    {integ.provider}
                  </div>
                  <div className="text-[9px] font-mono text-slate-500 truncate">{integ.account_handle}</div>
                </div>
                {integ.status !== "healthy" ? (
                  <button
                    id={`refresh-integration-${integ.provider}`}
                    type="button"
                    onClick={() => onRefreshIntegration(integ.provider)}
                    className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-mono font-bold text-[9px] shrink-0"
                  >
                    Rotate
                  </button>
                ) : (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 shrink-0">
                    OK
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
