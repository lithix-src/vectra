"use client";

import React, { useState } from "react";
import { Command } from "cmdk";
import { Clock, RefreshCw, Search, X } from "lucide-react";
import {
  CanonicalNodeItem,
  CollectorPackItem,
  CollectorPacksStatus,
  VariantLens,
} from "@/types/vectra";

interface CollectorAndCmdkModalsProps {
  collectorModalOpen: boolean;
  onCloseCollectorModal: () => void;
  collectorStatus: CollectorPacksStatus;
  collectorAllowLiveHttp: boolean;
  collectorBusyPackId: string | null;
  onToggleAllowLiveHttp: (val: boolean) => void;
  onRunPublicCollectors: () => Promise<void>;
  onUpdateCollectorSchedule: (
    pack: CollectorPackItem,
    opts: { interval_minutes?: number; enabled?: boolean; run_immediately?: boolean }
  ) => Promise<void>;
  cmdkOpen: boolean;
  onCloseCmdk: () => void;
  nodes: CanonicalNodeItem[];
  onSelectLens: (lens: VariantLens) => void;
  onSelectNode: (nodeId: string) => void;
  onDownloadPptx: () => void;
  onDownloadBriefMarkdown: () => void;
  onOpenCollectorModal: () => void;
}

export default function CollectorAndCmdkModals({
  collectorModalOpen,
  onCloseCollectorModal,
  collectorStatus,
  collectorAllowLiveHttp,
  collectorBusyPackId,
  onToggleAllowLiveHttp,
  onRunPublicCollectors,
  onUpdateCollectorSchedule,
  cmdkOpen,
  onCloseCmdk,
  nodes,
  onSelectLens,
  onSelectNode,
  onDownloadPptx,
  onDownloadBriefMarkdown,
  onOpenCollectorModal,
}: CollectorAndCmdkModalsProps) {
  const [cmdkSearch, setCmdkSearch] = useState<string>("");

  return (
    <>
      {cmdkOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
          onClick={onCloseCmdk}
        >
          <div
            className="w-full max-w-xl bg-[#101722] border border-slate-700 rounded-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <Command
              className="w-full"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  onCloseCmdk();
                }
              }}
            >
              <div className="flex items-center border-b border-slate-800 px-3 py-2.5">
                <Search className="w-4 h-4 text-sky-400 mr-2" />
                <Command.Input
                  autoFocus
                  value={cmdkSearch}
                  onValueChange={setCmdkSearch}
                  placeholder="Jump to Canonical Node, switch Variant Lens, or trigger .pptx readout..."
                  className="w-full bg-transparent text-sm text-slate-100 focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={onCloseCmdk}
                  className="text-xs font-mono text-slate-400 hover:text-slate-200 px-1.5 py-0.5 bg-slate-800 rounded"
                >
                  ESC
                </button>
              </div>
              <Command.List className="max-h-80 overflow-y-auto p-2 space-y-2 text-xs">
                <Command.Empty className="p-3 text-slate-400 font-mono">
                  No matching commands or canonical nodes.
                </Command.Empty>

                <Command.Group
                  heading="Variant Lenses & Actions"
                  className="text-[10px] font-mono uppercase text-slate-400 px-2"
                >
                  <Command.Item
                    onSelect={() => {
                      onSelectLens("c_suite");
                      onCloseCmdk();
                    }}
                    className="p-2 rounded hover:bg-sky-500/20 text-slate-200 cursor-pointer flex items-center justify-between"
                  >
                    <span>Switch to C-Suite Executive ROI Lens</span>
                    <span className="font-mono text-sky-400">Lens</span>
                  </Command.Item>
                  <Command.Item
                    onSelect={() => {
                      onSelectLens("cto");
                      onCloseCmdk();
                    }}
                    className="p-2 rounded hover:bg-sky-500/20 text-slate-200 cursor-pointer flex items-center justify-between"
                  >
                    <span>Switch to CTO Architecture & Latency Lens</span>
                    <span className="font-mono text-emerald-400">Lens</span>
                  </Command.Item>
                  <Command.Item
                    onSelect={() => {
                      onSelectLens("contrarian");
                      onCloseCmdk();
                    }}
                    className="p-2 rounded hover:bg-sky-500/20 text-slate-200 cursor-pointer flex items-center justify-between"
                  >
                    <span>Switch to Contrarian / Failure Modes Lens</span>
                    <span className="font-mono text-rose-400">Lens</span>
                  </Command.Item>
                  <Command.Item
                    onSelect={() => {
                      onCloseCmdk();
                      onDownloadPptx();
                    }}
                    className="p-2 rounded hover:bg-amber-500/20 text-amber-300 cursor-pointer flex items-center justify-between"
                  >
                    <span>Generate & Download Executive .pptx Deck</span>
                    <span className="font-mono">python-pptx</span>
                  </Command.Item>
                  <Command.Item
                    onSelect={() => {
                      onCloseCmdk();
                      onDownloadBriefMarkdown();
                    }}
                    className="p-2 rounded hover:bg-sky-500/20 text-sky-300 cursor-pointer flex items-center justify-between"
                  >
                    <span>Generate & Download Executive Brief (.md)</span>
                    <span className="font-mono">Markdown</span>
                  </Command.Item>
                  <Command.Item
                    onSelect={() => {
                      onCloseCmdk();
                      onOpenCollectorModal();
                    }}
                    className="p-2 rounded hover:bg-amber-500/20 text-amber-300 cursor-pointer flex items-center justify-between"
                  >
                    <span>Configure Collector Packs & SEC EDGAR / RSS Schedules</span>
                    <span className="font-mono">Temporal</span>
                  </Command.Item>
                </Command.Group>

                <Command.Group
                  heading="Canonical Intelligence Nodes"
                  className="text-[10px] font-mono uppercase text-slate-400 px-2 pt-2"
                >
                  {nodes.map((n) => (
                    <Command.Item
                      key={n.id}
                      onSelect={() => {
                        onSelectNode(n.id);
                        onCloseCmdk();
                      }}
                      className="p-2 rounded hover:bg-slate-800 text-slate-100 cursor-pointer flex items-center justify-between"
                    >
                      <span className="truncate">{n.title}</span>
                      <span className="font-mono text-sky-400 ml-2">{n.composite_score}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              </Command.List>
            </Command>
          </div>
        </div>
      )}

      {collectorModalOpen && (
        <div
          id="collector-scheduler-modal"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onCloseCollectorModal}
        >
          <div
            className="w-full max-w-2xl bg-[#101722] border border-amber-500/40 rounded-lg shadow-2xl overflow-hidden max-h-[88vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 bg-[#0D131F] shrink-0">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-100">
                  Enterprise Collector Packs & Temporal RSS / SEC EDGAR Scheduler
                </h3>
              </div>
              <button
                id="close-collector-scheduler-modal-btn"
                type="button"
                onClick={onCloseCollectorModal}
                className="text-slate-400 hover:text-slate-200 p-1 rounded bg-slate-800/80"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 text-xs font-mono">
              <div className="bg-[#090D14] border border-slate-800 rounded p-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="text-[10px] text-slate-400 uppercase">
                    Queue:{" "}
                    <span className="text-sky-300 font-semibold">
                      {collectorStatus.worker_queue}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    SEC EDGAR User-Agent: {collectorStatus.sec_edgar_user_agent}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-[10px] text-slate-300 cursor-pointer bg-[#101722] border border-slate-700 rounded px-2 py-1">
                    <input
                      id="collector-allow-live-http-checkbox"
                      type="checkbox"
                      checked={collectorAllowLiveHttp}
                      onChange={(e) => onToggleAllowLiveHttp(e.target.checked)}
                      className="accent-amber-400"
                    />
                    <span>Live RSS/Atom Probe</span>
                  </label>
                  <button
                    id="collector-modal-run-all-btn"
                    type="button"
                    disabled={collectorBusyPackId !== null}
                    onClick={onRunPublicCollectors}
                    className="px-2.5 py-1 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-[10px] uppercase flex items-center gap-1 transition"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{collectorBusyPackId === "all" ? "Syncing..." : "Run All Packs"}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                {collectorStatus.packs.map((pack) => {
                  const isBusy = collectorBusyPackId === pack.id;
                  const sched = pack.schedule;
                  return (
                    <div
                      key={pack.id}
                      id={`collector-pack-card-${pack.id}`}
                      className="bg-[#090D14] border border-slate-800 rounded p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold text-slate-100">
                              {pack.name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 uppercase">
                              Tier-{pack.tier} • {pack.source_type}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-md">
                            Feeds: {pack.feed_urls.join(", ")}
                          </div>
                        </div>

                        <button
                          id={`toggle-collector-pack-${pack.id}`}
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            onUpdateCollectorSchedule(pack, { enabled: !sched.enabled })
                          }
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border shrink-0 transition ${
                            sched.enabled
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                              : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
                          }`}
                        >
                          {sched.enabled ? "ACTIVE" : "PAUSED"}
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-800/80 text-[10px]">
                        <div className="flex items-center gap-2 text-slate-400">
                          <span>Interval:</span>
                          <select
                            id={`collector-interval-select-${pack.id}`}
                            value={sched.interval_minutes}
                            disabled={isBusy}
                            onChange={(e) =>
                              onUpdateCollectorSchedule(pack, {
                                interval_minutes: parseInt(e.target.value, 10),
                              })
                            }
                            className="bg-[#101722] border border-slate-700 rounded px-2 py-0.5 text-slate-100 text-[10px]"
                          >
                            {[5, 15, 30, 60, 180, 360, 1440].map((mins) => (
                              <option key={mins} value={mins}>
                                Every {mins}m
                              </option>
                            ))}
                          </select>
                          <span className="text-slate-500">•</span>
                          <span>
                            Last Ingested:{" "}
                            <strong className="text-sky-300">{sched.last_items_ingested}</strong>
                          </span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-400">Mode: {sched.execution_mode}</span>
                        </div>

                        <button
                          id={`run-collector-pack-${pack.id}`}
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            onUpdateCollectorSchedule(pack, { run_immediately: true })
                          }
                          className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold uppercase text-[10px] flex items-center gap-1 transition"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>{isBusy ? "Running..." : "Run Pack Now"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
