# `@vectra/web` — Modular Next.js 15 3-Pane Workspace & Boardroom UI (`/apps/web`)

`@vectra/web` is the Next.js 15 (App Router, React 19, strict TypeScript) frontend for **VECTRA**. All components, hooks, and modals are decomposed under the `<= 350 + 20%` (`420` LOC) modularity rule in [`../../AGENTS.md`](../../AGENTS.md) and verified by **Gate 5** (`tsc --noEmit` + 15 DOM Test-IDs) in [`../../scripts/review_gates.py`](../../scripts/review_gates.py) plus real-Chromium Playwright E2E testing.

---

## Table of Contents
1. [Modular Component, Hook & Route Map](#1-modular-component-hook--route-map)
2. [Target Context Expression & Explainable Match Engine](#2-target-context-expression--explainable-match-engine)
3. [Data Association Navigator & 1-Hop Graph Highlighting](#3-data-association-navigator--1-hop-graph-highlighting)
4. [Interactive Modals & Enforced DOM Test-IDs](#4-interactive-modals--enforced-dom-test-ids)
5. [Boardroom Mode & Dual-Window `BroadcastChannel` Sync](#5-boardroom-mode--dual-window-broadcastchannel-sync)
6. [Frontend Commands (`pnpm` / `vectra_cli.py`)](#6-frontend-commands-pnpm--vectra_clipy)

---

## 1. Modular Component, Hook & Route Map

| File | Primary Export | Responsibility |
| :--- | :--- | :--- |
| [`src/app/page.tsx`](./src/app/page.tsx) | `VectraAdvisoryWorkspace` | Declarative composition of header, 3 panes, workspace hooks, and modals. |
| [`src/app/present/[sessionId]/page.tsx`](./src/app/present/%5BsessionId%5D/page.tsx) | `BoardroomPresentationPage` | Dual-window `BroadcastChannel` Boardroom Projection & Private Speaker Console (`?role=presenter`). |
| [`src/lib/contextMatcher.ts`](./src/lib/contextMatcher.ts) | `evaluateNodeContextMatch`, `getNodeAssociations` | Multi-facet context expression matcher (Title, Lens Thesis, Claims, Citations, Notes, Edge Rationales, Verticals) & 1-hop association resolver. |
| [`src/lib/graphCanvasHelpers.ts`](./src/lib/graphCanvasHelpers.ts) | `installSpaciousGraphForces`, `paintGraphNode`, `paintGraphLinkLabel` | Elliptical label-aware collision physics, radial centering gravity, and canvas node/link rendering helpers. |
| [`src/lib/copilotFormatting.ts`](./src/lib/copilotFormatting.ts) | `PROMPT_TEMPLATES`, `splitReadableBlocks`, `splitLeadPhrase` | Executive brief paragraph/bullet formatting and suggested advisory prompt templates. |
| [`src/lib/vectraDefaults.ts`](./src/lib/vectraDefaults.ts) | `VERTICAL_LIST`, `LLM_PROVIDER_PRESETS`, `DEFAULT_COLLECTOR_STATUS` | Typed provider presets, vertical list, and offline-resilient initial states. |
| [`src/hooks/useVectraWorkspace.ts`](./src/hooks/useVectraWorkspace.ts) | `useVectraWorkspace` | Graph state, context/relation filtering, weight/note/edge mutations, 1-hop Lasso scoping, Co-Pilot RAG, and `.pptx`/`.md` downloads. |
| [`src/hooks/useVectraRuntimeActions.ts`](./src/hooks/useVectraRuntimeActions.ts) | `useVectraRuntimeActions` | Sovereign Local LLM config, Zero-Trust MCP RPC tester, and Collector Pack scheduler actions. |
| [`src/components/WorkspaceHeader.tsx`](./src/components/WorkspaceHeader.tsx) | `WorkspaceHeader` | Labeled Perspective switcher (`Executive` \| `Architect` \| `Skeptic`), system status pills, and primary actions (`Add Signal`, `Present`, `Slides`). |
| [`src/components/LeftRailSnapView.tsx`](./src/components/LeftRailSnapView.tsx) | `LeftRailSnapView` | `#left-rail-snap-view`: `#target-context-expression-input`, quick-filter pills, industry sector chips, ranked topics feed, and collapsible Pulse Heatmap & KMS Vault drawers. |
| [`src/components/CenterWorkspacePane.tsx`](./src/components/CenterWorkspacePane.tsx) | `CenterWorkspacePane` | Non-wrapping Map/Compare toolbar, plain-English `Show Links` filter pills (`All`, `Enables`, `Case Study`, `Regulates`, `Conflicts`, `Replaces`), and interactive canvas. |
| [`src/components/RightRailInspector.tsx`](./src/components/RightRailInspector.tsx) | `RightRailInspector` | `#right-rail-inspector`: Focused Topic card with labeled Priority Weight slider, `ContextMatchBanner`, and 4 tabs (`Connections`, `Sources`, `Notes`, `AI Brief`). |
| [`src/components/CopilotBriefPanel.tsx`](./src/components/CopilotBriefPanel.tsx) | `CopilotBriefPanel` | `#subgraph-copilot-panel`: 1-click prompt templates, topic scope chips, and sectioned executive brief renderer (Bottom-Line Answer, Key Findings, Risks, 90-Day Roadmap & Grounding). |
| [`src/components/ContextMatchBanner.tsx`](./src/components/ContextMatchBanner.tsx) | `ContextMatchBanner` | `#context-match-rationale-card`: Plain-English relevance & score driver summary explaining *why* the topic matches active filters. |
| [`src/components/AssociationNavigator.tsx`](./src/components/AssociationNavigator.tsx) | `AssociationNavigator` | `#data-association-navigator`: Explores Outgoing & Incoming connections with plain-English direction badges, `Why connected` rationales, 1-click topic jumps, `Brief Group`, and inline link creation. |
| [`src/components/AssociativeGraphCanvas.tsx`](./src/components/AssociativeGraphCanvas.tsx) | `AssociativeGraphCanvas` | `react-force-graph-2d` map with elliptical label-aware collision physics, radial centering gravity, floating zoom/fit controls, and 1-hop neighborhood highlighting. |
| [`src/components/VariantDiffMatrix.tsx`](./src/components/VariantDiffMatrix.tsx) | `VariantDiffMatrix` | `@xyflow/react` 3-stage verification flow + synchronized Vendor vs. Builder vs. Production table. |
| [`src/components/WikilinkNoteEditor.tsx`](./src/components/WikilinkNoteEditor.tsx) | `WikilinkNoteEditor` | `@tiptap/react` + Markdown `[[Wikilink]]` autocomplete editor syncing `associative_edges`. |
| [`src/components/modals/IngestAndCypherModals.tsx`](./src/components/modals/IngestAndCypherModals.tsx) | `IngestAndCypherModals` | `+ Ingest Signal` modal (`/api/signals/ingest`) & `Cypher & Score Math` modal (`/api/graph/cypher`). |
| [`src/components/modals/RuntimeAndGatewayModals.tsx`](./src/components/modals/RuntimeAndGatewayModals.tsx) | `RuntimeAndGatewayModals` | `#local-llm-config-modal` (`/api/llm/config`) & `#mcp-gateway-modal` (`/api/mcp/rpc`). |
| [`src/components/modals/CollectorAndCmdkModals.tsx`](./src/components/modals/CollectorAndCmdkModals.tsx) | `CollectorAndCmdkModals` | `#collector-scheduler-modal` (`/api/collectors/packs` & `/api/collectors/schedule`) + `Cmd+K` palette. |
| [`src/types/vectra.ts`](./src/types/vectra.ts) | `CanonicalNodeItem`, `CollectorPacksStatus`, `PresentationSessionData` | Strict TypeScript contracts aligned with [`../api/schemas.py`](../api/schemas.py). |

---

## 2. Target Context Expression & Explainable Match Engine

- Typing into `#target-context-expression-input` (or clicking presets like `SR 11-7 / Audit`, `KV-Cache Latency`, `Zero-Trust MCP`, `Subscriber Exclusive`) evaluates every node across **7 semantic facets** (`Title`, `Active Lens Thesis`, `Variant Claims`, `Citation Evidence`, `[[Field Note]]`, `Edge Association`, `Vertical & Stage`).
- Both the Left Rail cards and `#context-match-rationale-card` surface the exact matched facet badges, relevance percentage, and verbatim excerpt explaining *why* that node matches the target context expression.

---

## 3. Data Association Navigator & 1-Hop Graph Highlighting

- Clicking `Links (N)` (`#right-tab-associations`) or any `N links` pill on a node card opens [`AssociationNavigator`](./src/components/AssociationNavigator.tsx), grouping edges into **Outgoing Impacts** and **Upstream Drivers & Governance Constraints**, displaying each edge's `consultant_note` rationale and shared verticals, and allowing 1-click hops across connected nodes or `Lasso 1-Hop` scoping into Co-Pilot.
- On [`AssociativeGraphCanvas`](./src/components/AssociativeGraphCanvas.tsx), selecting a node illuminates its 1-hop neighbor ring and incident edges while dimming non-incident links (`0.24` opacity) to eliminate visual hairball clutter.

---

## 4. Interactive Modals & Enforced DOM Test-IDs

Gate 5 in [`../../scripts/review_gates.py`](../../scripts/review_gates.py) verifies all **15** interactive DOM anchors across `src/**/*.tsx`:
- `#open-mcp-gateway-modal-btn` & `#mcp-gateway-modal`
- `#open-local-llm-modal-btn` & `#local-llm-config-modal`
- `#open-collector-scheduler-modal-btn` & `#collector-scheduler-modal`
- `#target-context-expression-input`, `#context-match-rationale-card`, `#right-tab-associations`, `#data-association-navigator`
- `#open-ingest-signal-modal-btn`, `#subgraph-copilot-panel`, `#launch-boardroom-mode-btn`, `#left-rail-snap-view`, `#right-rail-inspector`

---

## 5. Boardroom Mode & Dual-Window `BroadcastChannel` Sync

Launching `#launch-boardroom-mode-btn` opens `/present/[sessionId]`, where **Open Private Speaker Window** (`?role=presenter`) synchronizes slides (`ArrowLeft`/`ArrowRight`) and Variant Lenses instantaneously over `BroadcastChannel("vectra_boardroom_sync")` while keeping `user_private` consultant notes isolated from the client projection window.

---

## 6. Frontend Commands (`pnpm` / `vectra_cli.py`)

```bash
uv run python scripts/vectra_cli.py dev
uv run python scripts/vectra_cli.py review
```
