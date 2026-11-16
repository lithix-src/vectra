"use client";

import React, { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { CanonicalNodeItem, RelationType } from "@/types/vectra";
import { Link2, CheckCircle2, Sparkles } from "lucide-react";

interface WikilinkNoteEditorProps {
  activeNode: CanonicalNodeItem;
  allNodes: CanonicalNodeItem[];
  onSaveNote: (
    nodeId: string,
    markdownContent: string,
    relationType: RelationType
  ) => Promise<void>;
}

export default function WikilinkNoteEditor({
  activeNode,
  allNodes,
  onSaveNote,
}: WikilinkNoteEditorProps) {
  const [markdownText, setMarkdownText] = useState<string>(
    activeNode.consultant_note || ""
  );
  const [relationType, setRelationType] = useState<RelationType>("ENABLES");
  const [autocompleteQuery, setAutocompleteQuery] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  // Sync editor when activeNode changes
  useEffect(() => {
    setMarkdownText(activeNode.consultant_note || "");
    setAutocompleteQuery(null);
    setSaveBanner(null);
  }, [activeNode.id, activeNode.consultant_note]);

  // Also instantiate a TipTap editor instance so rich editing and plain [[wikilink]] markdown stay in sync
  const editor = useEditor({
    extensions: [StarterKit],
    content: `<p>${(activeNode.consultant_note || "").replace(/\n/g, "<br/>")}</p>`,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const txt = editor.getText({ blockSeparator: "\n" });
      setMarkdownText(txt);
      checkTriggerAutocomplete(txt);
    },
  });

  useEffect(() => {
    if (editor && activeNode) {
      const currentTxt = editor.getText({ blockSeparator: "\n" });
      if (currentTxt !== (activeNode.consultant_note || "")) {
        editor.commands.setContent(
          `<p>${(activeNode.consultant_note || "").replace(/\n/g, "<br/>")}</p>`
        );
      }
    }
  }, [activeNode.id]);

  const checkTriggerAutocomplete = (val: string) => {
    const openIdx = val.lastIndexOf("[[");
    const closeIdx = val.lastIndexOf("]]");
    if (openIdx !== -1 && openIdx > closeIdx) {
      const query = val.slice(openIdx + 2).trim();
      setAutocompleteQuery(query);
    } else {
      setAutocompleteQuery(null);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMarkdownText(val);
    checkTriggerAutocomplete(val);
    if (editor) {
      editor.commands.setContent(`<p>${val.replace(/\n/g, "<br/>")}</p>`);
    }
  };

  const insertWikilinkTarget = (targetTitle: string) => {
    let updated = markdownText;
    const openIdx = updated.lastIndexOf("[[");
    const closeIdx = updated.lastIndexOf("]]");
    if (openIdx !== -1 && openIdx > closeIdx) {
      updated = `${updated.slice(0, openIdx)}[[${targetTitle}]] `;
    } else {
      updated = `${updated.trim()}\n- Linked via Advisory Graph: [[${targetTitle}]]`;
    }
    setMarkdownText(updated);
    setAutocompleteQuery(null);
    if (editor) {
      editor.commands.setContent(`<p>${updated.replace(/\n/g, "<br/>")}</p>`);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveBanner(null);
    try {
      await onSaveNote(activeNode.id, markdownText, relationType);
      setSaveBanner(
        "Saved to consultant_notes & synced [[wikilink]] edges on WebGL graph"
      );
    } finally {
      setSaving(false);
    }
  };

  const candidateNodes = allNodes.filter((n) => {
    if (n.id === activeNode.id) return false;
    if (!autocompleteQuery) return true;
    return n.title.toLowerCase().includes(autocompleteQuery.toLowerCase());
  });

  return (
    <div id="obsidian-wikilink-editor" className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5" /> Obsidian [[Wikilink]] Field Notes (RLS: user_private)
        </span>
        <select
          id="wikilink-relation-select"
          value={relationType}
          onChange={(e) => setRelationType(e.target.value as RelationType)}
          className="bg-[#090D14] border border-slate-700 rounded px-2 py-0.5 text-[11px] font-mono text-slate-200"
        >
          <option value="ENABLES">Edge: ENABLES</option>
          <option value="CASE_STUDY_OF">Edge: CASE_STUDY_OF</option>
          <option value="REGULATES">Edge: REGULATES</option>
          <option value="CONFLICTS_WITH">Edge: CONFLICTS_WITH</option>
          <option value="REPLACES">Edge: REPLACES</option>
        </select>
      </div>

      {/* Quick-Insert [[Wikilink]] Node Pills */}
      <div className="bg-[#090D14] border border-slate-800 rounded p-2">
        <div className="text-[10px] font-mono uppercase text-slate-400 mb-1.5">
          Quick Insert Bidirectional [[Wikilink]] to Canonical Node:
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
          {allNodes
            .filter((n) => n.id !== activeNode.id)
            .map((target) => (
              <button
                key={target.id}
                id={`quick-wikilink-${target.slug}`}
                type="button"
                onClick={() => insertWikilinkTarget(target.title)}
                className="text-left px-2 py-0.5 rounded bg-slate-900 hover:bg-amber-500/20 border border-slate-700 hover:border-amber-400/60 text-[11px] font-mono text-amber-300 transition truncate max-w-[260px]"
                title={`Insert [[${target.title}]]`}
              >
                + [[{target.title.slice(0, 32)}…]]
              </button>
            ))}
        </div>
      </div>

      {/* Markdown + TipTap Bidirectional Editor Surface */}
      <div className="relative">
        <textarea
          id="consultant-note-textarea"
          value={markdownText}
          onChange={handleTextareaChange}
          rows={6}
          placeholder="Type private consultant field notes... Use [[Node Title]] to dynamically create an associative edge on the graph."
          className="w-full bg-[#090D14] border border-slate-700 focus:border-sky-400 rounded p-2.5 text-xs font-mono text-slate-100 leading-relaxed focus:outline-none"
        />

        {/* Hidden/Synced TipTap Rich Surface for ProseMirror inspection */}
        <div className="sr-only" aria-hidden="true">
          <EditorContent editor={editor} />
        </div>

        {/* Live `[[` Autocomplete Popover */}
        {autocompleteQuery !== null && candidateNodes.length > 0 && (
          <div
            id="wikilink-autocomplete-dropdown"
            className="absolute left-2 right-2 bottom-full mb-1 z-30 bg-[#101722] border border-sky-500/60 rounded shadow-xl max-h-40 overflow-y-auto p-1"
          >
            <div className="px-2 py-1 text-[10px] font-mono uppercase text-sky-400 border-b border-slate-800">
              Select Canonical Node to Link ([[{autocompleteQuery}):
            </div>
            {candidateNodes.map((cand) => (
              <button
                key={cand.id}
                type="button"
                onClick={() => insertWikilinkTarget(cand.title)}
                className="w-full text-left px-2.5 py-1.5 text-xs text-slate-200 hover:bg-sky-500/20 rounded flex items-center justify-between"
              >
                <span className="truncate">{cand.title}</span>
                <span className="font-mono text-[10px] text-amber-400 ml-2">
                  {cand.composite_score}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          id="save-consultant-note-btn"
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="w-full py-2 px-3 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs font-mono uppercase tracking-wider transition flex items-center justify-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {saving ? "Syncing [[Wikilinks]] to Graph..." : "Save Field Note & Sync [[Wikilink]] Edges"}
        </button>
      </div>

      {saveBanner && (
        <div
          id="wikilink-save-confirmation"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono"
        >
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{saveBanner}</span>
        </div>
      )}
    </div>
  );
}
