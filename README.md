# VECTRA — Enterprise AI Intelligence & Advisory OS

**VECTRA** is a full-stack, multi-tenant enterprise AI intelligence and decision-support web application engineered for **Erik**. It bridges deep technical architecture (`p99` latency, KV-cache topology, hybrid GraphRAG) and C-Suite strategy (audited ROI, regulatory exposure, capital allocation).

All project management and deployment commands are **100% cross-platform** (native Windows PowerShell, macOS, and Linux) using **`uv` / `uvx`**, **`pnpm`**, and **`docker compose`**—with zero dependency on `Makefile` or OS-specific shell scripts.

---

## Table of Contents
1. [Sub-Package Documentation Index](#1-sub-package-documentation-index)
2. [Native Windows Setup & Prerequisites](#2-native-windows-setup--prerequisites)
3. [Cross-Platform Command Reference (`uv`, `uvx`, `pnpm`, `docker compose`)](#3-cross-platform-command-reference-uv-uvx-pnpm-docker-compose)
4. [Monorepo Directory Structure](#4-monorepo-directory-structure)
5. [Core Architectural Pillars](#5-core-architectural-pillars)
6. [End-to-End Verification Workflow](#6-end-to-end-verification-workflow)

---

## 1. Sub-Package Documentation Index

Each package in the monorepo contains a dedicated `README.md` with its own Table of Contents for both human architects and AI agents:

| Package / App | Path | Primary Responsibility | Documentation |
| :--- | :--- | :--- | :--- |
| **`vectra-db`** | [`packages/db`](./packages/db) | PostgreSQL 17 (`pgvector` + `Apache AGE`), Multi-Tenant RLS Policies, `AES-256-GCM` KMS Envelope Vault, Canonical Scoring, Alembic Migrations | [`packages/db/README.md`](./packages/db/README.md) |
| **`vectra-api`** | [`apps/api`](./apps/api) | FastAPI REST & Webhook Gateway, `instructor` Subgraph Co-Pilot RAG, Bidirectional `[[Wikilink]]` Edge Sync, `python-pptx` Executive Deck Generator | [`apps/api/README.md`](./apps/api/README.md) |
| **`vectra-workers`** | [`apps/workers`](./apps/workers) | Temporal.io Workflows & Activities, In-Memory KMS Token Decryption, X OAuth 2.0 PKCE Rotation, Public F500/SEC/NIST Collectors, Cosine Clustering (`> 0.84`) | [`apps/workers/README.md`](./apps/workers/README.md) |
| **`@vectra/web`** | [`apps/web`](./apps/web) | Next.js 15 + React 19 3-Pane Progressive Disclosure UI, `react-force-graph-2d` Canvas, `@xyflow/react` Variant Diff Matrix, `@tiptap/react` `[[Wikilink]]` Editor, Boardroom Mode | [`apps/web/README.md`](./apps/web/README.md) |
| **Architecture, Plan & Deployment** | [`/`](./) | System ERD, Implementation State, Team Code Review Gates, and Rancher Desktop Deployment Architecture | [`ARCHITECTURE_AND_ERD.md`](./ARCHITECTURE_AND_ERD.md) • [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) • [`DEPLOYMENT_AND_REVIEW_ARCHITECTURE.md`](./DEPLOYMENT_AND_REVIEW_ARCHITECTURE.md) |

---

## 2. Native Windows Setup & Prerequisites (Scoop + Rancher Desktop)

All Windows host tooling is standardized on **Scoop** and **Rancher Desktop** (which provides its own container engine and CLI shims under `%USERPROFILE%\.rd\bin`):

```powershell
# 1. Remove standalone Scoop docker shims if installed so Rancher Desktop's CLI takes precedence
scoop uninstall docker docker-compose 2>$null

# 2. Ensure Scoop buckets are enabled & install the core toolchain + Rancher Desktop
scoop bucket add main
scoop bucket add extras
scoop install main/git main/gh main/uv main/nodejs-lts main/pnpm extras/rancher-desktop

# 3. Update all Scoop packages to latest
scoop update *

# 4. Install and upgrade to the latest standard CPython via uv
uv python install
uv python upgrade

# 5. Verify Scoop shims + Rancher Desktop CLI
Get-Command git, gh, uv, uvx, node, pnpm, nerdctl, docker -ErrorAction SilentlyContinue | Select-Object Name, Version, Source
uv python list --only-installed
```

> **Note:** Do not install `main/docker` or `main/docker-compose` from Scoop, as **Rancher Desktop** bundles its own `docker` and `nerdctl` CLIs matching its active container engine (`dockerd (moby)` or `containerd`).

---

## 3. Cross-Platform Command Reference (`uv`, `uvx`, `pnpm`, Rancher Desktop)

All commands below work identically in **Windows PowerShell**, **macOS**, and **Linux**:

### 3.1 One-Command Product Instantiation, Code Review & Clean-Up (`D:\projects\vectra`)
```powershell
# Ensure target directory exists and navigate to D:\projects\vectra
New-Item -ItemType Directory -Force -Path D:\projects\vectra | Out-Null
Set-Location D:\projects\vectra

# Zero-to-Verified Product Instantiation (copies .env, provisions latest CPython .venv, installs deps, runs 5-gate review)
uv run python scripts/vectra_cli.py instantiate   # or: pnpm instantiate

# Run 5-Gate Team Code Review & Audit (ToC READMEs, Postgres 17 RLS DDL, CPython compile, TypeScript tsc, 8-stage E2E suite)
uv run python scripts/vectra_cli.py review        # or: pnpm review

# Clean transient build caches, bytecode, and scratch files (add --reset-db to also reset local SQLite)
uv run python scripts/vectra_cli.py clean         # or: pnpm clean
```

### 3.2 Standardized Container Deployment (Rancher Desktop — `nerdctl compose` or `docker compose`)
```powershell
# Start Data & Orchestration Infrastructure Only (Postgres 17 + pgvector + AGE, Redis 7, Temporal Server + UI)
uv run python scripts/vectra_cli.py infra-up      # or: pnpm infra:up
uv run python scripts/vectra_cli.py infra-down    # or: pnpm infra:down

# Build & Launch Full 7-Container Product Stack (Postgres 17 + Redis + Temporal + API + Worker + Next.js Web)
uv run python scripts/vectra_cli.py deploy-up     # or: pnpm deploy:up
uv run python scripts/vectra_cli.py deploy-down   # or: pnpm deploy:down
```

### 3.2 Python Backend, Database & Workers (`uv` & `uvx`)
```powershell
# Initialize cross-platform .venv and install editable packages (packages/db, apps/api, apps/workers)
uv run python scripts/vectra_cli.py setup

# Run the 8-stage end-to-end verification suite (RLS, KMS Vault, Clustering, Wikilinks, Co-Pilot, .pptx)
uv run python scripts/vectra_cli.py verify

# Start FastAPI server on http://localhost:8000 (or via uvx uvicorn)
uv run python scripts/vectra_cli.py api

# Start Temporal.io Worker fleet
uv run python scripts/vectra_cli.py worker

# Run ad-hoc tools with uvx (zero global pollution)
uvx ruff check packages/db apps/api apps/workers
uvx --from alembic alembic -c packages/db/alembic.ini heads
```

### 3.3 Frontend & Turborepo Orchestration (`pnpm`)
```powershell
# Install workspace Node dependencies
pnpm install

# Start Next.js 15 Advisory UI on http://localhost:3000
pnpm --filter @vectra/web dev

# Build production bundle
pnpm --filter @vectra/web build
```

---

## 4. Monorepo Directory Structure

```text
vectra/
├── apps/
│   ├── api/                        # FastAPI service, Subgraph Co-Pilot, python-pptx generator
│   │   ├── main.py
│   │   ├── pptx_generator.py
│   │   ├── pyproject.toml
│   │   └── README.md
│   ├── web/                        # Next.js 15 App Router (React 19, Tailwind, ForceGraph, XYFlow, TipTap)
│   │   ├── src/
│   │   │   ├── app/                # 3-Pane Workspace (page.tsx) & Boardroom Mode (/present/[sessionId])
│   │   │   ├── components/         # AssociativeGraphCanvas, VariantDiffMatrix, WikilinkNoteEditor
│   │   │   └── types/              # Shared TypeScript interfaces
│   │   ├── package.json
│   │   └── README.md
│   └── workers/                    # Temporal.io Python workers & multi-tier collectors
│       ├── worker.py
│       ├── pyproject.toml
│       └── README.md
├── packages/
│   └── db/                         # SQLAlchemy 2.0 Async, Postgres 17 RLS + AGE DDL, KMS Vault, Seed
│       ├── alembic/
│       ├── sql/init_extensions_and_rls.sql
│       ├── vectra_db/
│       ├── verify_vectra_stack.py
│       ├── pyproject.toml
│       └── README.md
├── scripts/
│   └── vectra_cli.py               # Cross-platform Python task runner (replaces Makefile)
├── docker-compose.yml              # Postgres 17 (pgvector + AGE), Temporal, Redis
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── ARCHITECTURE_AND_ERD.md
├── IMPLEMENTATION_PLAN.md
└── README.md
```

---

## 5. Core Architectural Pillars

1. **Multi-Tenant Row-Level Security (RLS) & KMS Envelope Vault**:
   - Every table enforces tenant isolation (`global`, `org_private`, `user_private`).
   - User-private sources (`subscriber_licensed` excerpts from *Stratechery*, *The Pragmatic Engineer*, *Latent Space*, *Import AI*, and private X Bookmarks) attach seamlessly to global Canonical Nodes inside Erik's RLS view without leaking to other tenants.
2. **Real-Time Composite Signal Scoring**:
   - $\text{Composite\_Score} = (\sum (\text{Source\_Authority} \times \text{Recency\_Decay}) + \text{Graph\_Centrality}) \times \text{Consultant\_Weight}$.
3. **3-Pane Progressive Disclosure & Boardroom Instantiation**:
   - Left Rail: Industry Vertical Switcher, Executive Pulse Heatmap, Persistent Variant Lens (`C-Suite` | `CTO` | `Contrarian`), and Auth Vault Drawer.
   - Center Canvas: `react-force-graph-2d` Associative Graph + `@xyflow/react` Variant Diff Matrix.
   - Right Rail: Verbatim Citation Inspector, TipTap `[[Wikilink]]` Field Notes, and Subgraph Co-Pilot with one-click `.pptx` generation.

---

## 6. End-to-End Verification Workflow

Run the automated verification suite anytime via `uv`:

```powershell
uv run python scripts/vectra_cli.py verify
```

This validates:
1. Multi-Tenant Row-Level Security (`RLS`) isolation across `canonical_nodes` and `node_sources`
2. `AES-256-GCM` Envelope Credential Vault encryption & in-memory worker decryption
3. Dynamic `Composite_Score` recalculation on Consultant Weight changes (`0.5x–5.0x`)
4. Obsidian `[[Wikilink]]` parsing and automatic `associative_edges` upsertion
5. Inbound Newsletter Webhook (`intel+erik@ingest.vectra.ai`) semantic clustering (`cosine > 0.84`)
6. Subgraph Co-Pilot structured RAG synthesis
7. `python-pptx` 5-slide widescreen `.pptx` presentation generation
8. Public Enterprise Collectors (F500 Blogs, SEC 8-K, NIST/EU AI Act) & Apache AGE OpenCypher query generation
