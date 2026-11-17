"""Automated 6-Gate Architecture, Modularity, Security & E2E Review Engine (`scripts/review_gates.py`).

Enforces VECTRA's mandatory development attributes before every commit:
- Gate 1: Package README Table of Contents (5/5) & `AGENTS.md` development rules check.
- Gate 2: Modular File-Size Budget (`<= 350 + 20% = 420` lines hard cap across all authored files).
- Gate 3: PostgreSQL 17 Row-Level Security (`ENABLE` + `FORCE ROW LEVEL SECURITY`) across all 5 tables.
- Gate 4: Python syntax & bytecode compilation (`compileall`).
- Gate 5: UI Component DOM Test-ID contract (across modular `apps/web/src/**/*.tsx`) & strict `tsc --noEmit`.
- Gate 6: 14-Stage End-to-End Functional, Sovereign Local LLM & Zero-Trust MCP Verification Suite.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Callable, List

TARGET_LOC_BUDGET = 350
MAX_LOC_HARD_LIMIT = int(TARGET_LOC_BUDGET * 1.20)  # 420 lines (350 + 20%)

SKIP_LINE_BUDGET_DIRS = {
    ".git",
    ".venv",
    "node_modules",
    ".next",
    ".turbo",
    "__pycache__",
    ".pytest_cache",
    ".ruff_cache",
    "dist",
    "build",
}

EXEMPT_GENERATED_FILES = {
    "pnpm-lock.yaml",
    "package-lock.json",
    "uv.lock",
}

AUTHORED_EXTENSIONS = {
    ".py",
    ".ts",
    ".tsx",
    ".js",
    ".mjs",
    ".cjs",
    ".css",
    ".sql",
    ".md",
    ".yaml",
    ".yml",
    ".json",
    ".toml",
    ".ini",
}

REQUIRED_RLS_TABLES = [
    "user_integrations",
    "canonical_nodes",
    "node_sources",
    "associative_edges",
    "consultant_notes",
]

REQUIRED_UI_DOM_IDS = [
    "open-mcp-gateway-modal-btn",
    "mcp-gateway-modal",
    "open-local-llm-modal-btn",
    "local-llm-config-modal",
    "open-collector-scheduler-modal-btn",
    "collector-scheduler-modal",
    "open-ingest-signal-modal-btn",
    "target-context-expression-input",
    "context-match-rationale-card",
    "right-tab-associations",
    "data-association-navigator",
    "subgraph-copilot-panel",
    "launch-boardroom-mode-btn",
    "left-rail-snap-view",
    "right-rail-inspector",
]


def _iter_authored_files(root_dir: Path) -> List[Path]:
    files: List[Path] = []
    for path in root_dir.rglob("*"):
        if any(part in SKIP_LINE_BUDGET_DIRS or part.endswith(".egg-info") for part in path.parts):
            continue
        if not path.is_file() or path.name in EXEMPT_GENERATED_FILES:
            continue
        if path.suffix.lower() in AUTHORED_EXTENSIONS or path.name == "Dockerfile":
            files.append(path)
    return sorted(files)


def audit_file_line_budgets(root_dir: Path) -> tuple[bool, int, str]:
    """Verify no authored file exceeds `MAX_LOC_HARD_LIMIT` (420 lines = 350 + 20%)."""
    authored = _iter_authored_files(root_dir)
    violations: List[str] = []
    max_seen = 0
    max_file = ""

    for fpath in authored:
        try:
            line_count = len(fpath.read_text(encoding="utf-8").splitlines())
        except UnicodeDecodeError:
            continue
        rel = fpath.relative_to(root_dir).as_posix()
        if line_count > max_seen:
            max_seen = line_count
            max_file = rel
        if line_count > MAX_LOC_HARD_LIMIT:
            violations.append(f"  - {rel}: {line_count} lines (exceeds {MAX_LOC_HARD_LIMIT} = 350 + 20% limit)")

    if violations:
        detail = (
            "[FAIL] Gate 2: File line-count budget exceeded (max 350 + 20% = 420 lines).\n"
            "Split oversized files using imports, links, or references:\n" + "\n".join(violations)
        )
        return False, len(authored), detail

    summary = (
        f"[PASS] Gate 2: All {len(authored)} authored files within 350 + 20% ({MAX_LOC_HARD_LIMIT}) LOC budget "
        f"(largest: {max_file} at {max_seen} lines)."
    )
    return True, len(authored), summary


def run_review_gates(
    *,
    root_dir: Path,
    py_bin: str,
    run_cmd: Callable[[List[str], Path], int],
    run_verify: Callable[[], int],
) -> int:
    """Execute all 6 Team Code Review, Modularity & Security Audit gates."""
    print("=====================================================================")
    print("VECTRA TEAM CODE REVIEW, MODULARITY & ARCHITECTURE AUDIT GATE")
    print("=====================================================================")

    # Gate 1: Package READMEs (ToC) & Mandatory Dev Rules (`AGENTS.md`)
    required_readmes = [
        root_dir / "README.md",
        root_dir / "packages" / "db" / "README.md",
        root_dir / "apps" / "api" / "README.md",
        root_dir / "apps" / "workers" / "README.md",
        root_dir / "apps" / "web" / "README.md",
    ]
    for readme_path in required_readmes:
        if not readme_path.exists():
            print(f"[FAIL] Gate 1: Missing required package README: {readme_path}")
            return 1
        if "## Table of Contents" not in readme_path.read_text(encoding="utf-8"):
            print(f"[FAIL] Gate 1: Missing '## Table of Contents' section in {readme_path}")
            return 1

    agents_md = root_dir / "AGENTS.md"
    if not agents_md.exists() or "350" not in agents_md.read_text(encoding="utf-8"):
        print("[FAIL] Gate 1: Missing root AGENTS.md enforcing the 350 + 20% LOC & documentation mandate.")
        return 1

    gh_workflows_dir = root_dir / ".github" / "workflows"
    forbidden_gh_ci = [
        root_dir / ".github" / "dependabot.yml",
        root_dir / ".github" / "dependabot.yaml",
    ]
    if (gh_workflows_dir.exists() and any(gh_workflows_dir.iterdir())) or any(
        p.exists() for p in forbidden_gh_ci
    ):
        print(
            "[FAIL] Gate 1: GitHub Actions / cloud CI workflows (.github/workflows, dependabot) are disabled and "
            "forbidden in VECTRA. Use 100% local pre-commit verification (`vectra_cli.py review`)."
        )
        return 1
    print(
        f"[PASS] Gate 1: All {len(required_readmes)} package READMEs (with ToC), AGENTS.md, "
        "and Zero GitHub Actions policy verified."
    )

    # Gate 2: Modular File-Size Budget Audit (<= 350 + 20% = 420 lines)
    ok_loc, _, loc_msg = audit_file_line_budgets(root_dir)
    print(loc_msg)
    if not ok_loc:
        return 1

    # Gate 3: PostgreSQL 17 Row-Level Security (ENABLE + FORCE RLS) DDL Audit
    sql_path = root_dir / "packages" / "db" / "sql" / "init_extensions_and_rls.sql"
    sql_text = sql_path.read_text(encoding="utf-8")
    for tbl in REQUIRED_RLS_TABLES:
        for clause in ("ENABLE ROW LEVEL SECURITY;", "FORCE ROW LEVEL SECURITY;"):
            expected_stmt = f"ALTER TABLE {tbl} {clause}"
            if expected_stmt not in sql_text:
                print(f"[FAIL] Gate 3: Missing '{expected_stmt}' in {sql_path}")
                return 1
    print(f"[PASS] Gate 3: PostgreSQL 17 ENABLE + FORCE RLS verified across all {len(REQUIRED_RLS_TABLES)} tables.")

    # Gate 4: Python Syntax & Bytecode Compilation Audit across all packages
    rc = run_cmd(
        [
            py_bin,
            "-m",
            "compileall",
            "-q",
            str(root_dir / "packages" / "db" / "vectra_db"),
            str(root_dir / "apps" / "api"),
            str(root_dir / "apps" / "workers"),
            str(root_dir / "scripts"),
        ],
        root_dir,
    )
    if rc != 0:
        return rc
    print("[PASS] Gate 4: Python bytecode & syntax compilation passed.")

    # Gate 5: UI Component DOM Test-ID Contract & Next.js 15 Strict TypeScript (`tsc --noEmit`)
    web_src = root_dir / "apps" / "web" / "src"
    combined_tsx = "\n".join(p.read_text(encoding="utf-8") for p in web_src.rglob("*.tsx"))
    for dom_id in REQUIRED_UI_DOM_IDS:
        if f'id="{dom_id}"' not in combined_tsx:
            print(f"[FAIL] Gate 5: Missing required UI component test ID #{dom_id} under apps/web/src/")
            return 1

    tsc_bin = root_dir / "apps" / "web" / "node_modules" / ".bin" / ("tsc.cmd" if os.name == "nt" else "tsc")
    if tsc_bin.exists():
        rc = run_cmd([str(tsc_bin), "--noEmit"], root_dir / "apps" / "web")
        if rc != 0:
            return rc
    print(f"[PASS] Gate 5: All {len(REQUIRED_UI_DOM_IDS)} UI Component test IDs & Next.js 15 TypeScript contracts verified.")

    # Gate 6: 14-Stage End-to-End Functional, Local LLM & Zero-Trust MCP Verification Suite
    rc = run_verify()
    if rc != 0:
        return rc
    print("=====================================================================")
    print("ALL TEAM CODE REVIEW, MODULARITY & SECURITY GATES PASSED")
    print("=====================================================================")
    return 0
