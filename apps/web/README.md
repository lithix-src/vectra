# `@vectra/web` — Next.js 15 3-Pane Progressive Disclosure UI & Boardroom Engine (`/apps/web`)

`@vectra/web` is the Next.js 15 (App Router, React 19, TypeScript) frontend for **VECTRA**, running on `http://localhost:3000`. It implements a tactical dark obsidian interface designed for 30-second executive situational awareness, multi-lens variant analysis, associative graph exploration, and one-click boardroom presentation instantiation.

---

## Table of Contents
1. [Component & Route Architecture](#1-component--route-architecture)
2. [3-Pane Progressive Disclosure Layout](#2-3-pane-progressive-disclosure-layout)
3. [Associative Knowledge Graph (`react-force-graph-2d`)](#3-associative-knowledge-graph-react-force-graph-2d)
4. [Variant Diff Matrix (`@xyflow/react` + Synchronized Table)](#4-variant-diff-matrix-xyflowreact--synchronized-table)
5. [Obsidian `[[Wikilink]]` Editor (`@tiptap/react`)](#5-obsidian-wikilink-editor-tiptapreact)
6. [Boardroom Mode & Dual-Window Presenter Console (`/present/[sessionId]`)](#6-boardroom-mode--dual-window-presenter-console-presentsessionid)
7. [Cross-Platform `pnpm` Commands](#7-cross-platform-pnpm-commands)

---

## 1. Component & Route Architecture

| File | Symbol | Purpose |
| :--- | :--- | :--- |
| [`src/app/page.tsx`](./src/app/page.tsx) | `VectraAdvisoryWorkspace` | Main 3-Pane Progressive Disclosure workspace, Top Executive Header, Variant Lens Switcher, `+ Ingest Signal` Modal, `Cypher & Score Math` Inspector, `cmdk` (`Cmd+K`) Command Palette, and Subgraph Co-Pilot. |
| [`src/app/present/[sessionId]/page.tsx`](./src/app/present/[sessionId]/page.tsx) | `BoardroomPresentationPage` | Zero-chrome Boardroom Mode with dual-window Speaker Console (`?role=presenter`), `BroadcastChannel("vectra_boardroom_sync")` real-time synchronization, `ArrowLeft`/`ArrowRight` keyboard navigation, and `.pptx` export. |
| [`src/components/AssociativeGraphCanvas.tsx`](./src/components/AssociativeGraphCanvas.tsx) | `AssociativeGraphCanvas` | Interactive 2D/WebGL force-directed graph (`react-force-graph-2d`) with `Composite_Score` node sizing, relation-colored edges, and Shift+Drag Lasso selection. |
| [`src/components/VariantDiffMatrix.tsx`](./src/components/VariantDiffMatrix.tsx) | `VariantDiffMatrix` | `@xyflow/react` Variant Pipeline diagram + synchronized comparison table (*Vendor Marketing Claim* vs. *Independent Builder Reality* vs. *Enterprise Production Proof*). |
| [`src/components/WikilinkNoteEditor.tsx`](./src/components/WikilinkNoteEditor.tsx) | `WikilinkNoteEditor` | `@tiptap/react` + Markdown field note editor with live `[[` node autocomplete that auto-upserts `associative_edges`. |
| [`src/types/vectra.ts`](./src/types/vectra.ts) | `CanonicalNodeItem`, `AssociativeEdgeItem`, `VariantLens` | TypeScript interfaces matching the FastAPI Pydantic v2 models. |

---

## 2. 3-Pane Progressive Disclosure Layout

1. **Top Executive Command Header, Zero-Trust MCP Inspector, Sovereign Local LLM Config & `+ Ingest Signal` Modal**:
   - **Variant Lens Switcher**: Persistent 3-lens toggle (`C-Suite` | `CTO/Architect` | `Contrarian`).
   - **Zero-Trust MCP Gateway Modal (`#open-mcp-gateway-modal-btn` / `#mcp-gateway-modal`)**: Inspects configured MCP servers (`vectra-graph-mcp`, `vectra-citations-mcp`, `vectra-notes-mcp`, `vectra-embeddings-mcp`), executes live JSON-RPC 2.0 `tools/call` requests against `POST /api/mcp/rpc`, and displays the immutable `ALLOWED` / `DENIED` MCP audit trail.
   - **Sovereign Local LLM & Embeddings Modal (`#open-local-llm-modal-btn` / `#local-llm-config-modal`)**: Configures the active local inference runtime (`ollama` default, `litellm_proxy`, `vllm`, `llamacpp`, `lmstudio`), discovers local models, and enforces `VECTRA_BLOCK_COMMERCIAL_LLMS=true` (`0% Commercial Cloud`).
   - **`+ Ingest Signal` Modal (`#open-ingest-signal-modal-btn`)**: Allows Erik to submit a custom field intelligence signal (`title`, `exact_quote`, `direct_url`, `source_name`, `provenance_license` (`subscriber_licensed` | `public`), `visibility` (`user_private` | `org_private` | `global`), and `industry_vertical`) to `POST /api/signals/ingest`, clustering into existing 14-day Canonical Nodes (`cosine > 0.84`) or instantiating a new node.
2. **Left Rail (Snap View & Auth Health)**:
   - **Industry Vertical Switcher**: Filter by *All Verticals*, *Financial Services*, *Healthcare & Life Sciences*, *Manufacturing & Supply Chain*, *Retail/CPG*, *Legal/Professional Services*, or *Cross-Industry Horizontal*.
   - **Executive Pulse Heatmap**: SVG 2D quadrant plotting *Adoption Velocity* vs. *Verified ROI*.
   - **30-Second Snap-View Feed**: Ranked canonical nodes dynamically reflecting the active Variant Lens (`C-Suite` | `CTO/Architect` | `Contrarian`).
   - **Credential Vault & Auth Health Drawer**: Displays `AES-256-GCM` DEK fingerprints, copyable `intel+erik@ingest.vectra.ai` alias, one-click **Simulate Forwarded Issue Webhook**, **Sync Public Collectors**, and expired session cookie rotation.
3. **Center Canvas (Dual-Mode Workspace & `Cypher & Score Math` Inspector)**:
   - **Graph Mode** (`AssociativeGraphCanvas`) and **Variant Diff Matrix** (`VariantDiffMatrix`).
   - Real-time **Consultant Weight Slider (`0.5x–5.0x`)**, **Lasso Select**, and **`+ Link Node`** edge creation.
   - **`Cypher & Score Math` Modal (`#open-cypher-math-modal-btn`)**: Fetches `GET /api/graph/cypher?vertical=...` to inspect the focused node's real-time mathematical `score_breakdown` (`source_authority_component`, `graph_centrality_component`, `consultant_weight`, `composite_score`) alongside the live Apache AGE `open_cypher_sql` query with one-click copy.
4. **Right Rail (Citation Inspector, `[[Field Notes]]` & Subgraph Co-Pilot)**:
   - **Citations Tab**: Verbatim pull-quotes, authority tiers, `[Public]` vs. `[Subscriber Licensed]` badges, and primary URLs.
   - **`[[Field Notes]]` Tab**: Bidirectional `[[Wikilink]]` editor.
   - **Co-Pilot Tab**: Scoped RAG synthesis over lassoed nodes + one-click `.pptx` readout download and **Export Brief (`.md`)** (`#export-markdown-brief-btn` -> `POST /api/export/brief` -> `VECTRA_Executive_Brief.md`).

---

## 3. Associative Knowledge Graph (`react-force-graph-2d`)

- **Node Radius**: Proportional to `Composite_Score`.
- **Node Border Color**: Encodes `maturity_stage` (`production_scale` = Emerald `#10B981`, `pilot` = Cyan `#38BDF8`, `research` = Amber `#F59E0B`).
- **Directed Edge Semantics**: `ENABLES` (`#38BDF8`), `CASE_STUDY_OF` (`#10B981`), `REGULATES` (`#F59E0B`), `CONFLICTS_WITH` (`#F43F5E`), `REPLACES` (`#94A3B8`), and user-created `[[Wikilink]]` edges highlighted in gold (`#F59E0B`).
- **Subgraph Lasso Selection**: Hold `Shift + Drag` (or toggle the `Lasso Select` toolbar button) to draw a selection box and pipe captured nodes directly into the Subgraph Co-Pilot.

---

## 4. Variant Diff Matrix (`@xyflow/react` + Synchronized Table)

- Renders a 3-stage `@xyflow/react` verification pipeline (*1. Vendor Marketing Claim* → *2. Builder Field Reality* → *3. Audited Enterprise Production Proof*) for the focused node.
- Below the flow canvas, a synchronized multi-row comparison matrix lets Erik compare all visible nodes side-by-side and click inline provenance pills (`[Public]` / `[Subscriber]`) to inspect verbatim quotes.

---

## 5. Obsidian `[[Wikilink]]` Editor (`@tiptap/react`)

- Typing `[[` inside the field note editor opens an interactive autocomplete dropdown of Canonical Nodes (or click any quick-insert `+ [[Node Title]]` pill).
- Clicking **Save Field Note & Sync `[[Wikilink]]` Edges** sends `PUT /api/nodes/{node_id}/note`, persists the note to `consultant_notes`, auto-upserts `associative_edges`, and immediately renders the new link on the canvas.

---

## 6. Boardroom Mode & Dual-Window Presenter Console (`/present/[sessionId]`)

- Clicking **Boardroom Mode** in the top header creates a presentation session and navigates to `/present/[sessionId]`.
- Clicking **Open Private Speaker Window** launches `/present/[sessionId]?role=presenter` via `window.open()`, displaying Erik's private `user_private` field notes on his presenter monitor while keeping the main boardroom projection clean for C-suite clients.
- **Real-Time Dual-Window Synchronization (`BroadcastChannel("vectra_boardroom_sync")`) & Keyboard Navigation**: Changing slides (`activeSlideIdx`) or switching Variant Lenses (`c_suite` | `cto` | `contrarian`)—via clicks or `ArrowLeft`/`ArrowRight` keys—synchronizes instantaneously between the Speaker Console and the Boardroom Projection window.

---

## 7. Cross-Platform `pnpm` Commands

```powershell
# Start Next.js 15 development server on http://localhost:3000
pnpm --filter @vectra/web dev

# Typecheck and build production bundle
pnpm --filter @vectra/web build
```
