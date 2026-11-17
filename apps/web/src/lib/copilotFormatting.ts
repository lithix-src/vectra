import { VariantLens } from "@/types/vectra";

export const PROMPT_TEMPLATES = [
  {
    label: "ROI & Audit Readiness",
    prompt:
      "Summarize verified production ROI, cost compression, and SR 11-7 / EU AI Act audit readiness across these topics.",
  },
  {
    label: "Latency & Architecture",
    prompt:
      "Compare p99 latency bottlenecks, KV-cache or storage architecture, and key engineering tradeoffs.",
  },
  {
    label: "90-Day Rollout Plan",
    prompt:
      "Outline a phased 90-day enterprise implementation roadmap and the top failure modes to avoid.",
  },
];

export const LENS_HUMAN_LABEL: Record<VariantLens, string> = {
  c_suite: "Executive (ROI & Risk)",
  cto: "Architect (Systems & Latency)",
  contrarian: "Skeptic (Failure Modes)",
};

/** Break dense text or inline bullet lists into clean, readable paragraphs and bullets. */
export function splitReadableBlocks(raw: string): { paragraphs: string[]; bullets: string[] } {
  const cleaned = raw
    .replace(/^\[[^\]]+\]\s*/g, "")
    .replace(/Scoped strictly via Zero-Trust MCP Gateway[^:]*:\s*/i, "")
    .trim();

  const rawParts = cleaned
    .split(/\s*(?:•|\n-\s+|\n\*\s+)\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (rawParts.length > 1) {
    return { paragraphs: [rawParts[0]], bullets: rawParts.slice(1) };
  }

  const sentences = cleaned.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g)?.map((s) => s.trim()) || [
    cleaned,
  ];
  if (sentences.length <= 2) {
    return { paragraphs: [cleaned], bullets: [] };
  }
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    paragraphs.push(sentences.slice(i, i + 2).join(" "));
  }
  return { paragraphs, bullets: [] };
}

const GENERIC_PLACEHOLDER_LEADS = new Set([
  "topic title",
  "topic",
  "risk area",
  "risk",
  "implication",
  "finding",
  "takeaway",
  "action",
]);

/** Split 'Lead Title: Detail text' so the lead phrase can be bolded cleanly. */
export function splitLeadPhrase(text: string): { lead: string | null; rest: string } {
  const clean = text.replace(/^[•\-*]\s*/, "").trim();
  const colonIdx = clean.indexOf(":");
  if (colonIdx > 2 && colonIdx < 78) {
    const candidateLead = clean.slice(0, colonIdx).trim();
    const rest = clean.slice(colonIdx + 1).trim();
    if (GENERIC_PLACEHOLDER_LEADS.has(candidateLead.toLowerCase())) {
      return { lead: null, rest };
    }
    return {
      lead: candidateLead,
      rest,
    };
  }
  return { lead: null, rest: clean };
}
