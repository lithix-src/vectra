"use client";

import React from "react";
import {
  AlertTriangle,
  Briefcase,
  Clock,
  Cpu,
  Download,
  Lock,
  PlusCircle,
  Presentation,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  CollectorPacksStatus,
  LocalLLMStatus,
  VariantLens,
} from "@/types/vectra";

interface WorkspaceHeaderProps {
  variantLens: VariantLens;
  onSelectLens: (lens: VariantLens, toastMsg: string) => void;
  llmStatus: LocalLLMStatus;
  collectorStatus: CollectorPacksStatus;
  pptxDownloading: boolean;
  onOpenMCPModal: () => void;
  onOpenLLMModal: () => void;
  onOpenCollectorModal: () => void;
  onOpenIngestModal: () => void;
  onOpenCmdk: () => void;
  onLaunchBoardroom: () => void;
  onDownloadPptx: () => void;
}

export default function WorkspaceHeader({
  variantLens,
  onSelectLens,
  llmStatus,
  collectorStatus,
  pptxDownloading,
  onOpenMCPModal,
  onOpenLLMModal,
  onOpenCollectorModal,
  onOpenIngestModal,
  onOpenCmdk,
  onLaunchBoardroom,
  onDownloadPptx,
}: WorkspaceHeaderProps) {
  const enabledPacks = collectorStatus.packs.filter((p) => p.schedule.enabled).length;

  return (
    <header className="h-13 py-1.5 shrink-0 border-b border-slate-800 bg-[#0D131F] px-3.5 flex items-center justify-between gap-2.5">
      {/* Brand & Tenant Badge */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-7 h-7 rounded bg-sky-500/15 border border-sky-400/50 flex items-center justify-center font-mono font-bold text-sky-400 text-xs">
          V
        </div>
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-sm font-bold tracking-wide text-slate-100 leading-none">
              VECTRA
            </h1>
            <span className="text-[10px] text-slate-400 hidden xl:block leading-tight mt-0.5">
              AI Advisory Intelligence
            </span>
          </div>
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 hidden lg:inline-flex items-center gap-1"
            title="Multi-Tenant Row-Level Security Active (erik@vectra-advisory)"
          >
            <Lock className="w-2.5 h-2.5" />
            <span>Erik • Private</span>
          </span>
        </div>
      </div>

      {/* Labeled Perspective Lens Switcher */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[11px] font-medium text-slate-400 hidden md:inline">
          Perspective:
        </span>
        <div
          id="variant-lens-toggle-group"
          className="flex items-center bg-[#090D14] p-0.5 rounded-md border border-slate-800"
        >
          <button
            id="lens-btn-c_suite"
            type="button"
            title="Executive Lens: ROI, Capital Allocation & Regulatory Audit"
            onClick={() =>
              onSelectLens("c_suite", "Perspective: Executive (ROI, Capital & Regulatory Risk)")
            }
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition flex items-center gap-1.5 ${
              variantLens === "c_suite"
                ? "bg-sky-500 text-slate-950 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Briefcase className="w-3 h-3" />
            <span>Executive</span>
          </button>
          <button
            id="lens-btn-cto"
            type="button"
            title="Architect Lens: Systems, p99 Latency & Data Topology"
            onClick={() =>
              onSelectLens("cto", "Perspective: Architect (Latency, KV-Cache & Data Topology)")
            }
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition flex items-center gap-1.5 ${
              variantLens === "cto"
                ? "bg-emerald-500 text-slate-950 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Cpu className="w-3 h-3" />
            <span>Architect</span>
          </button>
          <button
            id="lens-btn-contrarian"
            type="button"
            title="Skeptic Lens: Vendor Hype vs. Production Failure Modes"
            onClick={() =>
              onSelectLens("contrarian", "Perspective: Skeptic (Failure Modes & Hidden TCO)")
            }
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition flex items-center gap-1.5 ${
              variantLens === "contrarian"
                ? "bg-rose-500 text-slate-950 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Skeptic</span>
          </button>
        </div>
      </div>

      {/* System Status & Primary Actions */}
      <div className="flex items-center gap-1.5 min-w-0">
        <div className="flex items-center bg-[#090D14] p-0.5 rounded border border-slate-800 gap-0.5">
          <button
            id="open-mcp-gateway-modal-btn"
            type="button"
            onClick={onOpenMCPModal}
            className="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-sky-300 text-[11px] font-medium flex items-center gap-1 transition"
            title="Zero-Trust MCP Security Gateway & Tool Audit"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden xl:inline">MCP</span>
          </button>

          <button
            id="open-local-llm-modal-btn"
            type="button"
            onClick={onOpenLLMModal}
            className="px-2 py-1 rounded hover:bg-slate-800 text-slate-200 text-[11px] font-mono flex items-center gap-1.5 transition"
            title={`Local AI Engine (${llmStatus.provider}: ${llmStatus.model})`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                llmStatus.daemon_online ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            <span className="truncate max-w-[96px]">{llmStatus.model}</span>
          </button>

          <button
            id="open-collector-scheduler-modal-btn"
            type="button"
            onClick={onOpenCollectorModal}
            className="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-amber-300 text-[11px] font-medium flex items-center gap-1 transition"
            title="Automated Data Feed Collectors (Fortune 500, SEC 8-K, NIST/EU AI Act)"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Feeds ({enabledPacks})</span>
          </button>
        </div>

        <button
          id="open-cmdk-palette-btn"
          type="button"
          onClick={onOpenCmdk}
          className="px-2 py-1.5 rounded bg-[#090D14] hover:bg-slate-800 border border-slate-700 text-[11px] font-mono text-slate-300 flex items-center gap-1 shrink-0"
          title="Quick Jump & Commands (⌘K)"
        >
          <Search className="w-3.5 h-3.5 text-sky-400" />
          <kbd className="text-[10px] text-slate-400">⌘K</kbd>
        </button>

        <button
          id="open-ingest-signal-modal-btn"
          type="button"
          onClick={onOpenIngestModal}
          className="px-2.5 py-1.5 rounded bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-200 font-medium text-[11px] whitespace-nowrap flex items-center gap-1 transition shrink-0"
        >
          <PlusCircle className="w-3.5 h-3.5 text-sky-400" />
          <span>Add Signal</span>
        </button>

        <button
          id="launch-boardroom-mode-btn"
          type="button"
          onClick={onLaunchBoardroom}
          className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-medium whitespace-nowrap text-slate-100 flex items-center gap-1 transition shrink-0"
          title="Launch Dual-Screen Boardroom Presenter Mode"
        >
          <Presentation className="w-3.5 h-3.5 text-sky-400" />
          <span>Present</span>
        </button>

        <button
          id="header-export-pptx-btn"
          type="button"
          disabled={pptxDownloading}
          onClick={onDownloadPptx}
          className="px-2.5 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-[11px] whitespace-nowrap flex items-center gap-1 transition shrink-0"
          title="Download 5-Slide Executive PowerPoint (.pptx)"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{pptxDownloading ? "..." : "Slides"}</span>
        </button>
      </div>
    </header>
  );
}
