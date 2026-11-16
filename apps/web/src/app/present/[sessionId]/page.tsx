"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Lock,
  Monitor,
  Radio,
  ShieldCheck,
} from "lucide-react";
import { CanonicalNodeItem, VariantLens } from "@/types/vectra";

interface BoardroomSyncMessage {
  sessionId: string;
  slideIdx?: number;
  lens?: VariantLens;
}

function BoardroomPresentationContent() {
  const params = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();
  const isPresenterWindow = searchParams.get("role") === "presenter";

  const [sessionData, setSessionData] = useState<any>(null);
  const [activeLens, setActiveLens] = useState<VariantLens>("c_suite");
  const [activeSlideIdx, setActiveSlideIdx] = useState<number>(0);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    const loadSession = async () => {
      const res = await fetch(`/api/present/${params.sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setSessionData(data);
        if (data.variant_lens) setActiveLens(data.variant_lens);
      }
    };
    loadSession();
  }, [params.sessionId]);

  // Real-time Dual-Window Synchronization via BroadcastChannel("vectra_boardroom_sync")
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    const bc = new BroadcastChannel("vectra_boardroom_sync");
    channelRef.current = bc;

    bc.onmessage = (event: MessageEvent<BoardroomSyncMessage>) => {
      const msg = event.data;
      if (!msg || msg.sessionId !== params.sessionId) return;
      if (typeof msg.slideIdx === "number") {
        setActiveSlideIdx(msg.slideIdx);
      }
      if (msg.lens) {
        setActiveLens(msg.lens);
      }
    };

    return () => {
      bc.close();
      channelRef.current = null;
    };
  }, [params.sessionId]);

  const handleSelectSlide = useCallback(
    (idx: number) => {
      setActiveSlideIdx(idx);
      channelRef.current?.postMessage({
        sessionId: params.sessionId,
        slideIdx: idx,
      } satisfies BoardroomSyncMessage);
    },
    [params.sessionId]
  );

  const handleSelectLens = useCallback(
    (lens: VariantLens) => {
      setActiveLens(lens);
      channelRef.current?.postMessage({
        sessionId: params.sessionId,
        lens,
      } satisfies BoardroomSyncMessage);
    },
    [params.sessionId]
  );

  const nodes: CanonicalNodeItem[] = sessionData?.nodes || [];
  const focusedNode = nodes[activeSlideIdx] || nodes[0] || null;

  // Keyboard Navigation (ArrowRight = next slide, ArrowLeft = previous slide)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (nodes.length === 0) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        const nextIdx = (activeSlideIdx + 1) % nodes.length;
        handleSelectSlide(nextIdx);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const prevIdx = (activeSlideIdx - 1 + nodes.length) % nodes.length;
        handleSelectSlide(prevIdx);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeSlideIdx, nodes.length, handleSelectSlide]);

  const openDualWindowPresenterConsole = () => {
    window.open(
      `/present/${params.sessionId}?role=presenter`,
      "VectraPresenterSpeakerView",
      "width=1100,height=780,menubar=no,toolbar=no,location=no,status=no"
    );
  };

  const handleExportPptx = async () => {
    if (!sessionData) return;
    const res = await fetch(`/api/export/pptx`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deck_title: sessionData.title || "VECTRA Boardroom Briefing",
        node_ids: (sessionData.nodes || []).map((n: CanonicalNodeItem) => n.id),
        variant_lens: activeLens,
        industry_vertical: sessionData.industry_vertical || "All Verticals",
        copilot_synthesis: sessionData.copilot_synthesis || null,
      }),
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `VECTRA_Boardroom_${params.sessionId}.pptx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="min-h-screen bg-[#090D14] text-slate-100 flex flex-col p-6">
      {/* Minimal Zero-Chrome Boardroom Bar */}
      <header className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Exit Boardroom
          </a>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">
                {isPresenterWindow
                  ? "SPEAKER CONSOLE (ERIK PRIVATE)"
                  : "BOARDROOM PROJECTION VIEW"}
              </span>
              <span className="font-mono text-xs text-slate-400">
                Session: {params.sessionId}
              </span>
              <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Radio className="w-3 h-3" /> BroadcastChannel Sync Active (←/→ Keys)
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-100 mt-0.5">
              {sessionData?.title || "VECTRA Executive Boardroom Readout"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-[#101722] p-1 rounded border border-slate-800">
            {(["c_suite", "cto", "contrarian"] as VariantLens[]).map((lens) => (
              <button
                key={lens}
                id={`boardroom-lens-${lens}`}
                type="button"
                onClick={() => handleSelectLens(lens)}
                className={`px-2.5 py-1 rounded text-xs font-mono uppercase ${
                  activeLens === lens
                    ? "bg-sky-500 text-slate-950 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {lens}
              </button>
            ))}
          </div>

          {!isPresenterWindow && (
            <button
              id="open-dual-window-presenter-btn"
              type="button"
              onClick={openDualWindowPresenterConsole}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-mono text-amber-300 flex items-center gap-1.5"
            >
              <Monitor className="w-3.5 h-3.5" /> Open Private Speaker Window
            </button>
          )}

          <button
            id="boardroom-download-pptx-btn"
            type="button"
            onClick={handleExportPptx}
            className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Download .pptx
          </button>
        </div>
      </header>

      {/* Slide Selector Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-4 border-b border-slate-800/80">
        {nodes.map((n, idx) => (
          <button
            key={n.id}
            id={`boardroom-slide-btn-${idx}`}
            type="button"
            onClick={() => handleSelectSlide(idx)}
            className={`px-3 py-2 rounded border text-left shrink-0 transition ${
              idx === activeSlideIdx
                ? "bg-sky-500/20 border-sky-400 text-sky-200"
                : "bg-[#101722] border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <div className="font-mono text-[10px] uppercase">
              Slide {idx + 1} • Composite {n.composite_score}
            </div>
            <div className="text-xs font-semibold truncate max-w-[220px]">
              {n.title}
            </div>
          </button>
        ))}
      </div>

      {/* Main Projection Content */}
      {focusedNode && (
        <div className="flex-1 grid grid-cols-12 gap-6 items-start">
          <div className="col-span-7 bg-[#101722] border border-slate-800 rounded-lg p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono text-xs uppercase">
                Stage: {focusedNode.maturity_stage}
              </span>
              <span className="font-mono text-sm text-sky-400 font-bold">
                Composite Signal Score: {focusedNode.composite_score} ({focusedNode.consultant_weight}x)
              </span>
            </div>

            <h2 className="text-2xl font-bold text-slate-100 leading-tight">
              {focusedNode.title}
            </h2>

            <div className="p-4 rounded bg-[#090D14] border border-slate-800">
              <div className="text-xs font-mono uppercase text-sky-400 mb-2">
                Primary {activeLens.toUpperCase()} Executive Readout
              </div>
              <p className="text-base text-slate-100 leading-relaxed">
                {activeLens === "cto"
                  ? focusedNode.summary_technical
                  : activeLens === "contrarian"
                  ? focusedNode.summary_contrarian
                  : focusedNode.summary_executive}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded bg-[#090D14] border border-amber-500/40">
                <div className="font-mono text-[10px] uppercase text-amber-400 mb-1">
                  Vendor Marketing Claim
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {focusedNode.claim_vendor}
                </p>
              </div>
              <div className="p-3 rounded bg-[#090D14] border border-rose-500/40">
                <div className="font-mono text-[10px] uppercase text-rose-400 mb-1">
                  Builder Field Reality
                </div>
                <p className="text-slate-200 leading-relaxed">
                  {focusedNode.claim_builder}
                </p>
              </div>
              <div className="p-3 rounded bg-[#090D14] border border-emerald-500/40">
                <div className="font-mono text-[10px] uppercase text-emerald-400 mb-1">
                  Audited Production Proof
                </div>
                <p className="text-slate-100 leading-relaxed">
                  {focusedNode.claim_production}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Clean Public Citations OR Private Speaker Notes (when role=presenter) */}
          <div className="col-span-5 flex flex-col gap-4">
            {isPresenterWindow && (
              <div
                id="presenter-private-field-notes"
                className="bg-amber-950/25 border border-amber-500/50 rounded-lg p-5"
              >
                <div className="flex items-center gap-2 text-xs font-mono uppercase text-amber-400 mb-2">
                  <Lock className="w-4 h-4" /> Erik&apos;s Private Speaker Field Notes (Hidden on Client Screen)
                </div>
                <pre className="whitespace-pre-wrap text-xs font-mono text-amber-100 leading-relaxed">
                  {focusedNode.consultant_note ||
                    "No private consultant notes recorded for this node."}
                </pre>
              </div>
            )}

            <div className="bg-[#101722] border border-slate-800 rounded-lg p-5 flex flex-col gap-3">
              <div className="text-xs font-mono uppercase text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Verified Primary Evidence & Citations
              </div>
              {focusedNode.sources.map((src) => (
                <div
                  key={src.id}
                  className="p-3 rounded bg-[#090D14] border border-slate-800 flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span
                      className={
                        src.provenance_license === "subscriber_licensed"
                          ? "text-amber-400"
                          : "text-emerald-400"
                      }
                    >
                      [{src.provenance_license === "subscriber_licensed" ? "Subscriber Licensed" : "Public"}]
                    </span>
                    <span className="text-slate-400">{src.author_handle}</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-100">
                    {src.source_name}
                  </div>
                  <blockquote className="text-xs text-slate-300 italic border-l-2 border-sky-400 pl-2">
                    “{src.exact_quote}”
                  </blockquote>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BoardroomPresentationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#090D14] text-slate-400 font-mono text-xs flex items-center justify-center">
          Loading VECTRA Boardroom Session...
        </div>
      }
    >
      <BoardroomPresentationContent />
    </Suspense>
  );
}
