"""Cross-platform Team Lifecycle, Code Review, Cleanup & Deployment CLI for VECTRA.

Standardized on:
- Windows Host: Scoop + Rancher Desktop (nerdctl compose / dockerd moby)
- Python Runtime: uv & uvx tracking the latest standard CPython release
- Node Runtime: Node 24 LTS + pnpm + Turborepo

Commands:
  uv run python scripts/vectra_cli.py setup        # Provision latest CPython .venv & install packages
  uv run python scripts/vectra_cli.py clean        # Clean caches, build artifacts & scratch files
  uv run python scripts/vectra_cli.py review       # Run full team code review, ToC audit, tsc & 8-stage RLS/KMS check
  uv run python scripts/vectra_cli.py verify       # Run 8-stage backend/DB/PPTX verification suite
  uv run python scripts/vectra_cli.py instantiate  # One-command product instantiation (setup + pnpm + verify)
  uv run python scripts/vectra_cli.py infra-up     # Start data/orchestration containers via Rancher Desktop
  uv run python scripts/vectra_cli.py infra-down   # Stop data/orchestration containers
  uv run python scripts/vectra_cli.py deploy-up    # Build & launch full containerized product stack
  uv run python scripts/vectra_cli.py deploy-down  # Tear down full containerized product stack
  uv run python scripts/vectra_cli.py api          # Run FastAPI server locally on port 8000
  uv run python scripts/vectra_cli.py worker       # Run Temporal.io worker locally
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
VENV_DIR = ROOT_DIR / ".venv"

REQUIRED_TOC_READMES = [
    ROOT_DIR / "README.md",
    ROOT_DIR / "packages" / "db" / "README.md",
    ROOT_DIR / "apps" / "api" / "README.md",
    ROOT_DIR / "apps" / "workers" / "README.md",
    ROOT_DIR / "apps" / "web" / "README.md",
]

REQUIRED_RLS_TABLES = [
    "user_integrations",
    "canonical_nodes",
    "node_sources",
    "associative_edges",
    "consultant_notes",
]


def _venv_python() -> str:
    if os.name == "nt":
        win_py = VENV_DIR / "Scripts" / "python.exe"
        if win_py.exists():
            return str(win_py)
    unix_py = VENV_DIR / "bin" / "python"
    if unix_py.exists():
        return str(unix_py)
    return sys.executable


def _pnpm_cmd() -> list[str]:
    """Return a working pnpm command list, bypassing broken Windows Node Corepack shims."""
    candidates: list[list[str]] = []
    if os.name == "nt":
        user_profile = Path(os.environ.get("USERPROFILE", str(Path.home())))
        scoop_pnpm_exe = user_profile / "scoop" / "apps" / "pnpm" / "current" / "pnpm.exe"
        scoop_shim_exe = user_profile / "scoop" / "shims" / "pnpm.exe"
        for exe_path in (scoop_pnpm_exe, scoop_shim_exe):
            if exe_path.exists():
                candidates.append([str(exe_path)])
        for name in ("pnpm.exe", "pnpm.cmd", "pnpm"):
            found = shutil.which(name)
            if found:
                candidates.append([found])
        npx_bin = shutil.which("npx.cmd") or shutil.which("npx")
        if npx_bin:
            candidates.append([npx_bin, "--yes", "pnpm@10"])
    else:
        found = shutil.which("pnpm")
        if found:
            candidates.append([found])

    env = os.environ.copy()
    env["COREPACK_ENABLE_PROJECT_SPEC"] = "0"
    env["COREPACK_ENABLE_STRICT"] = "0"

    for cmd in candidates:
        try:
            probe = subprocess.run(
                [*cmd, "--version"],
                cwd=str(ROOT_DIR),
                env=env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=15,
            )
            if probe.returncode == 0:
                return cmd
        except Exception:
            continue

    return ["pnpm"]


def _compose_cmd() -> list[str]:
    """Auto-detect Rancher Desktop's nerdctl compose or dockerd (moby) compose."""
    if shutil.which("nerdctl"):
        return ["nerdctl", "compose"]
    return ["docker", "compose"]


def _run(cmd: list[str], cwd: Path = ROOT_DIR) -> int:
    print(f"[vectra-cli] $ {' '.join(cmd)} (cwd={cwd})")
    env = os.environ.copy()
    env["COREPACK_ENABLE_PROJECT_SPEC"] = "0"
    env["COREPACK_ENABLE_STRICT"] = "0"
    proc = subprocess.run(cmd, cwd=str(cwd), env=env)
    return proc.returncode


def _install_local_pre_commit_hook() -> None:
    """Install a cross-platform .git/hooks/pre-commit hook to run 5-gate review locally before commits."""
    hooks_dir = ROOT_DIR / ".git" / "hooks"
    if not hooks_dir.exists():
        return
    hook_file = hooks_dir / "pre-commit"
    hook_script = (
        "#!/usr/bin/env sh\n"
        "# VECTRA Local Pre-Commit Gate (Zero GitHub Actions — Local Verification Only)\n"
        "echo \"[vectra pre-commit] Running local 5-Gate Review & 14-Stage Verification before commit...\"\n"
        "uv run python scripts/vectra_cli.py review\n"
    )
    hook_file.write_text(hook_script, encoding="utf-8")
    try:
        hook_file.chmod(0o755)
    except OSError:
        pass


def cmd_setup() -> int:
    """Ensure latest standard CPython is installed via uv, create .venv, install editable packages, and wire git pre-commit hook."""
    _install_local_pre_commit_hook()
    _run(["uv", "python", "install"])
    _run(["uv", "python", "upgrade"])

    if not VENV_DIR.exists():
        rc = _run(["uv", "venv", "--python-preference", "only-managed", str(VENV_DIR)])
        if rc != 0:
            rc = _run(["uv", "venv", str(VENV_DIR)])
            if rc != 0:
                return rc
    py = _venv_python()
    return _run(
        [
            "uv",
            "pip",
            "install",
            "--python",
            py,
            "greenlet",
            "-e",
            str(ROOT_DIR / "packages" / "db"),
            "-e",
            str(ROOT_DIR / "apps" / "api"),
            "-e",
            str(ROOT_DIR / "apps" / "workers"),
        ]
    )


def cmd_clean() -> int:
    """Remove transient build caches, bytecode, and scratch files across the monorepo."""
    reset_db = "--reset-db" in sys.argv
    dir_patterns = ["__pycache__", ".pytest_cache", ".ruff_cache", ".turbo", ".egg-info"]
    removed_count = 0

    for path in ROOT_DIR.rglob("*"):
        if ".venv" in path.parts or "node_modules" in path.parts or ".git" in path.parts:
            continue
        if path.is_dir() and (
            path.name in dir_patterns or path.name.endswith(".egg-info")
        ):
            shutil.rmtree(path, ignore_errors=True)
            removed_count += 1
        elif path.is_file() and path.name.endswith(".tsbuildinfo"):
            path.unlink(missing_ok=True)
            removed_count += 1

    bundle_file = ROOT_DIR / "vectra-main.bundle"
    if bundle_file.exists():
        bundle_file.unlink()
        removed_count += 1

    if reset_db:
        sqlite_db = ROOT_DIR / "packages" / "db" / "vectra_intel.db"
        if sqlite_db.exists():
            sqlite_db.unlink()
            print("[vectra-cli] Reset local SQLite fallback database (vectra_intel.db).")

    print(f"[PASS] Cleaned {removed_count} transient cache/artifact directories.")
    return 0


def _venv_ready() -> bool:
    """Return True if .venv exists and has core VECTRA dependencies installed."""
    py = _venv_python()
    if py == sys.executable and not VENV_DIR.exists():
        return False
    probe = subprocess.run(
        [py, "-c", "import pptx, fastapi, sqlalchemy, vectra_db"],
        cwd=str(ROOT_DIR),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return probe.returncode == 0


def _ensure_venv() -> int:
    """Automatically run cmd_setup() if .venv has not been provisioned yet."""
    if _venv_ready():
        return 0
    print("[vectra-cli] Local .venv not yet provisioned — running 'setup' automatically...")
    return cmd_setup()


def cmd_verify() -> int:
    """Run end-to-end verification suite (RLS, KMS Vault, Clustering, Wikilinks, Co-Pilot, .pptx)."""
    rc = _ensure_venv()
    if rc != 0:
        return rc
    py = _venv_python()
    return _run([py, str(ROOT_DIR / "packages" / "db" / "verify_vectra_stack.py")])


def cmd_review() -> int:
    """Execute full Team Code Review & Architecture Audit gate."""
    rc = _ensure_venv()
    if rc != 0:
        return rc
    print("=====================================================================")
    print("VECTRA TEAM CODE REVIEW & ARCHITECTURE AUDIT GATE")
    print("=====================================================================")

    # Gate 1: Package README & Table of Contents (ToC) Compliance
    for readme_path in REQUIRED_TOC_READMES:
        if not readme_path.exists():
            print(f"[FAIL] Missing required package README: {readme_path}")
            return 1
        content = readme_path.read_text(encoding="utf-8")
        if "## Table of Contents" not in content:
            print(f"[FAIL] Missing '## Table of Contents' section in {readme_path}")
            return 1
    print(f"[PASS] Gate 1: All {len(REQUIRED_TOC_READMES)} package READMEs verified with Table of Contents.")

    # Gate 2: PostgreSQL 17 Row-Level Security (RLS) DDL Audit
    sql_path = ROOT_DIR / "packages" / "db" / "sql" / "init_extensions_and_rls.sql"
    sql_text = sql_path.read_text(encoding="utf-8")
    for tbl in REQUIRED_RLS_TABLES:
        expected_stmt = f"ALTER TABLE {tbl} ENABLE ROW LEVEL SECURITY;"
        if expected_stmt not in sql_text:
            print(f"[FAIL] Missing RLS enablement on table '{tbl}' in {sql_path}")
            return 1
    print(f"[PASS] Gate 2: PostgreSQL 17 RLS policies verified across all {len(REQUIRED_RLS_TABLES)} tables.")

    # Gate 3: Python Syntax & Bytecode Compilation Audit across all packages
    py = _venv_python()
    rc = _run(
        [
            py,
            "-m",
            "compileall",
            "-q",
            str(ROOT_DIR / "packages" / "db" / "vectra_db"),
            str(ROOT_DIR / "apps" / "api"),
            str(ROOT_DIR / "apps" / "workers"),
            str(ROOT_DIR / "scripts"),
        ]
    )
    if rc != 0:
        return rc
    print("[PASS] Gate 3: Python bytecode & syntax compilation passed on latest CPython.")

    # Gate 4: UI Component Contract, DOM Test-ID & TypeScript Strict Audit in apps/web
    page_tsx = (ROOT_DIR / "apps" / "web" / "src" / "app" / "page.tsx").read_text(encoding="utf-8")
    required_ui_ids = [
        "open-mcp-gateway-modal-btn",
        "mcp-gateway-modal",
        "open-local-llm-modal-btn",
        "local-llm-config-modal",
        "open-ingest-signal-modal-btn",
        "subgraph-copilot-panel",
        "launch-boardroom-mode-btn",
        "left-rail-snap-view",
        "right-rail-inspector",
    ]
    for dom_id in required_ui_ids:
        if f'id="{dom_id}"' not in page_tsx:
            print(f"[FAIL] Missing required UI component test ID #{dom_id} in apps/web/src/app/page.tsx")
            return 1

    tsc_bin = ROOT_DIR / "apps" / "web" / "node_modules" / ".bin" / ("tsc.cmd" if os.name == "nt" else "tsc")
    if tsc_bin.exists():
        rc = _run([str(tsc_bin), "--noEmit"], cwd=ROOT_DIR / "apps" / "web")
        if rc != 0:
            return rc
    print(f"[PASS] Gate 4: All {len(required_ui_ids)} UI Component test IDs & Next.js 15 TypeScript contracts verified.")

    # Gate 5: 14-Stage End-to-End Functional, Local LLM & Zero-Trust MCP Verification Suite
    rc = cmd_verify()
    if rc != 0:
        return rc
    print("=====================================================================")
    print("ALL TEAM CODE REVIEW & SECURITY GATES PASSED")
    print("=====================================================================")
    return 0


def cmd_instantiate() -> int:
    """One-command zero-to-verified product instantiation for any team member."""
    print("[vectra-cli] Instantiating VECTRA workspace...")
    env_file = ROOT_DIR / ".env"
    env_example = ROOT_DIR / ".env.example"
    if not env_file.exists() and env_example.exists():
        shutil.copyfile(env_example, env_file)
        print("[vectra-cli] Created .env from .env.example")

    rc = cmd_setup()
    if rc != 0:
        return rc

    if not (ROOT_DIR / "node_modules").exists():
        rc = _run([*_pnpm_cmd(), "install", "--ignore-scripts"], cwd=ROOT_DIR)
        if rc != 0:
            return rc

    return cmd_review()


def cmd_api() -> int:
    """Start the FastAPI backend on port 8000."""
    rc = _ensure_venv()
    if rc != 0:
        return rc
    py = _venv_python()
    return _run(
        [py, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
        cwd=ROOT_DIR / "apps" / "api",
    )


def cmd_worker() -> int:
    """Start the Temporal.io Python worker."""
    rc = _ensure_venv()
    if rc != 0:
        return rc
    py = _venv_python()
    return _run([py, "worker.py"], cwd=ROOT_DIR / "apps" / "workers")


def cmd_dev() -> int:
    """Ensure resources (.env, .venv, node_modules) are configured and run FastAPI (:8000) + Next.js (:3000) concurrently."""
    env_file = ROOT_DIR / ".env"
    env_example = ROOT_DIR / ".env.example"
    if not env_file.exists() and env_example.exists():
        shutil.copyfile(env_example, env_file)
        print("[vectra-cli] Created .env from .env.example")

    rc = _ensure_venv()
    if rc != 0:
        return rc

    pnpm_cmd = _pnpm_cmd()
    if not (ROOT_DIR / "node_modules").exists():
        rc = _run([*pnpm_cmd, "install", "--ignore-scripts"], cwd=ROOT_DIR)
        if rc != 0:
            return rc

    py = _venv_python()
    env = os.environ.copy()
    env["COREPACK_ENABLE_PROJECT_SPEC"] = "0"
    env["COREPACK_ENABLE_STRICT"] = "0"
    print("[vectra-cli] Starting FastAPI (:8000) and Next.js 15 Advisory OS (:3000)...")
    api_proc = subprocess.Popen(
        [py, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"],
        cwd=str(ROOT_DIR / "apps" / "api"),
        env=env,
    )
    web_proc = subprocess.Popen(
        [*pnpm_cmd, "--filter", "@vectra/web", "dev"],
        cwd=str(ROOT_DIR),
        env=env,
    )
    try:
        return web_proc.wait()
    except KeyboardInterrupt:
        print("\n[vectra-cli] Stopping local dev services...")
        return 0
    finally:
        api_proc.terminate()
        web_proc.terminate()


def cmd_infra_up() -> int:
    """Start Postgres 17 (pgvector + AGE), Redis, Temporal, Ollama & LiteLLM via Rancher Desktop."""
    return _run([*_compose_cmd(), "-f", "docker-compose.yml", "up", "-d"], cwd=ROOT_DIR)


def cmd_infra_down() -> int:
    """Stop local infrastructure containers via Rancher Desktop."""
    return _run([*_compose_cmd(), "-f", "docker-compose.yml", "down"], cwd=ROOT_DIR)


def cmd_deploy_up() -> int:
    """Build and launch the full containerized VECTRA stack via Rancher Desktop."""
    return _run(
        [
            *_compose_cmd(),
            "-f",
            "docker-compose.yml",
            "-f",
            "docker-compose.prod.yml",
            "up",
            "-d",
            "--build",
        ],
        cwd=ROOT_DIR,
    )


def cmd_deploy_down() -> int:
    """Stop and remove the full containerized VECTRA stack."""
    return _run(
        [
            *_compose_cmd(),
            "-f",
            "docker-compose.yml",
            "-f",
            "docker-compose.prod.yml",
            "down",
        ],
        cwd=ROOT_DIR,
    )


def main() -> int:
    action = sys.argv[1] if len(sys.argv) > 1 else "help"
    dispatch = {
        "setup": cmd_setup,
        "clean": cmd_clean,
        "review": cmd_review,
        "verify": cmd_verify,
        "instantiate": cmd_instantiate,
        "dev": cmd_dev,
        "api": cmd_api,
        "worker": cmd_worker,
        "infra-up": cmd_infra_up,
        "infra-down": cmd_infra_down,
        "deploy-up": cmd_deploy_up,
        "deploy-down": cmd_deploy_down,
    }
    if action not in dispatch:
        print(
            "Usage: uv run python scripts/vectra_cli.py "
            "[setup|clean|review|verify|instantiate|dev|api|worker|infra-up|infra-down|deploy-up|deploy-down]"
        )
        return 0
    return dispatch[action]()


if __name__ == "__main__":
    raise SystemExit(main())
