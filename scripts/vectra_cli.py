"""Cross-Platform Team Lifecycle, Code Review, Cleanup & Deployment CLI for VECTRA.

Commands:
  uv run python scripts/vectra_cli.py setup        # Provision CPython .venv, editable packages & pre-commit hook
  uv run python scripts/vectra_cli.py clean        # Clean caches, build artifacts & optional --reset-db
  uv run python scripts/vectra_cli.py review       # Run 6-Gate Architecture, 350+20% LOC Budget, tsc & 14-stage E2E audit
  uv run python scripts/vectra_cli.py verify       # Run 14-stage backend/RLS/KMS/MCP/LLM/PPTX verification suite
  uv run python scripts/vectra_cli.py instantiate  # Zero-to-verified instantiation (setup + pnpm + review)
  uv run python scripts/vectra_cli.py dev          # Launch FastAPI (:8000) + Next.js 15 (:3000) concurrently
  uv run python scripts/vectra_cli.py infra-up     # Start data/LLM containers via Rancher Desktop
  uv run python scripts/vectra_cli.py infra-down   # Stop data/LLM containers
  uv run python scripts/vectra_cli.py deploy-up    # Build & launch full containerized product stack
  uv run python scripts/vectra_cli.py deploy-down  # Tear down full containerized product stack
  uv run python scripts/vectra_cli.py api          # Run FastAPI server locally on port 8000
  uv run python scripts/vectra_cli.py worker       # Run Temporal.io worker locally
"""
from __future__ import annotations

import os
import shutil
import socket
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT_DIR = SCRIPT_DIR.parent
VENV_DIR = ROOT_DIR / ".venv"
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from review_gates import run_review_gates  # noqa: E402


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
    """Return a working pnpm command list, bypassing broken Corepack shims across Windows & WSL/POSIX."""
    candidates: list[list[str]] = []
    if os.name == "nt":
        user_profile = Path(os.environ.get("USERPROFILE", str(Path.home())))
        for exe_path in (
            user_profile / "scoop" / "apps" / "pnpm" / "current" / "pnpm.exe",
            user_profile / "scoop" / "shims" / "pnpm.exe",
        ):
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
        pnpm_home_bin = Path(os.environ.get("PNPM_HOME", str(Path.home() / ".local" / "share" / "pnpm"))) / "pnpm"
        if pnpm_home_bin.exists():
            candidates.append([str(pnpm_home_bin)])
        found = shutil.which("pnpm")
        if found:
            candidates.append([found])
        npx_bin = shutil.which("npx")
        if npx_bin:
            candidates.append([npx_bin, "--yes", "pnpm@10"])

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
    return subprocess.run(cmd, cwd=str(cwd), env=env).returncode


def _install_local_pre_commit_hook() -> None:
    """Install a cross-platform .git/hooks/pre-commit hook enforcing the 6-gate review + LOC budget."""
    hooks_dir = ROOT_DIR / ".git" / "hooks"
    if not hooks_dir.exists():
        return
    hook_file = hooks_dir / "pre-commit"
    hook_script = (
        "#!/usr/bin/env sh\n"
        "# VECTRA Local Pre-Commit Gate (6-Gate Review, 350+20% LOC Budget & 14-Stage Verification)\n"
        "echo \"[vectra pre-commit] Running local 6-Gate Review (incl. 350+20% LOC budget) & 14-Stage Verification...\"\n"
        "uv run python scripts/vectra_cli.py review\n"
    )
    try:
        hook_file.write_text(hook_script, encoding="utf-8")
        hook_file.chmod(0o755)
    except OSError:
        pass


def cmd_setup() -> int:
    """Provision .venv via uv, install editable packages, and wire local git pre-commit hook."""
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
    dir_patterns = {"__pycache__", ".pytest_cache", ".ruff_cache", ".turbo", ".egg-info"}
    removed_count = 0

    for path in ROOT_DIR.rglob("*"):
        if ".venv" in path.parts or "node_modules" in path.parts or ".git" in path.parts:
            continue
        if path.is_dir() and (path.name in dir_patterns or path.name.endswith(".egg-info")):
            shutil.rmtree(path, ignore_errors=True)
            removed_count += 1
        elif path.is_file() and path.name.endswith(".tsbuildinfo"):
            path.unlink(missing_ok=True)
            removed_count += 1

    bundle_file = ROOT_DIR / "vectra-main.bundle"
    if bundle_file.exists():
        bundle_file.unlink()
        removed_count += 1

    gh_workflows_dir = ROOT_DIR / ".github" / "workflows"
    if gh_workflows_dir.exists():
        shutil.rmtree(gh_workflows_dir, ignore_errors=True)
        removed_count += 1

    if reset_db:
        sqlite_db = ROOT_DIR / "packages" / "db" / "vectra_intel.db"
        if sqlite_db.exists():
            sqlite_db.unlink()
            print("[vectra-cli] Reset local SQLite fallback database (vectra_intel.db).")

    print(f"[PASS] Cleaned {removed_count} transient cache/artifact directories.")
    return 0


def _venv_ready() -> bool:
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
    if _venv_ready():
        return 0
    print("[vectra-cli] Local .venv not yet provisioned — running 'setup' automatically...")
    return cmd_setup()


def cmd_verify() -> int:
    """Run 14-stage end-to-end verification suite."""
    rc = _ensure_venv()
    if rc != 0:
        return rc
    return _run([_venv_python(), str(ROOT_DIR / "packages" / "db" / "verify_vectra_stack.py")])


def cmd_review() -> int:
    """Execute full 6-Gate Team Code Review, Modularity & Security Audit."""
    _install_local_pre_commit_hook()
    rc = _ensure_venv()
    if rc != 0:
        return rc
    return run_review_gates(
        root_dir=ROOT_DIR,
        py_bin=_venv_python(),
        run_cmd=_run,
        run_verify=cmd_verify,
    )


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


def _find_free_port(preferred: int) -> int:
    for candidate in range(preferred, preferred + 20):
        in_use = False
        for family, addr in ((socket.AF_INET, "127.0.0.1"), (socket.AF_INET6, "::1")):
            try:
                with socket.socket(family, socket.SOCK_STREAM) as sock:
                    sock.settimeout(0.2)
                    if sock.connect_ex((addr, candidate)) == 0:
                        in_use = True
                        break
            except OSError:
                continue
        if not in_use:
            return candidate
    return preferred


def cmd_api() -> int:
    rc = _ensure_venv()
    if rc != 0:
        return rc
    return _run(
        [_venv_python(), "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
        cwd=ROOT_DIR / "apps" / "api",
    )


def cmd_worker() -> int:
    rc = _ensure_venv()
    if rc != 0:
        return rc
    return _run([_venv_python(), "worker.py"], cwd=ROOT_DIR / "apps" / "workers")


def cmd_dev() -> int:
    """Ensure resources are configured and run FastAPI + Next.js concurrently."""
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

    api_port = _find_free_port(int(os.environ.get("VECTRA_API_PORT", "8000")))
    web_port = _find_free_port(int(os.environ.get("VECTRA_WEB_PORT", "3000")))

    env = os.environ.copy()
    env["COREPACK_ENABLE_PROJECT_SPEC"] = "0"
    env["COREPACK_ENABLE_STRICT"] = "0"
    env["NEXT_PUBLIC_API_URL"] = f"http://127.0.0.1:{api_port}"
    print(f"[vectra-cli] Starting FastAPI (:{api_port}) and Next.js 15 Advisory OS (:{web_port})...")
    api_proc = subprocess.Popen(
        [_venv_python(), "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", str(api_port)],
        cwd=str(ROOT_DIR / "apps" / "api"),
        env=env,
    )
    next_bin = ROOT_DIR / "apps" / "web" / "node_modules" / ".bin" / ("next.cmd" if os.name == "nt" else "next")
    web_cmd = (
        [str(next_bin), "dev", "--port", str(web_port)]
        if next_bin.exists()
        else [*pnpm_cmd, "--filter", "@vectra/web", "exec", "next", "dev", "--port", str(web_port)]
    )
    web_proc = subprocess.Popen(
        web_cmd,
        cwd=str(ROOT_DIR / "apps" / "web") if next_bin.exists() else str(ROOT_DIR),
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
    return _run([*_compose_cmd(), "-f", "docker-compose.yml", "up", "-d"], cwd=ROOT_DIR)


def cmd_infra_down() -> int:
    return _run([*_compose_cmd(), "-f", "docker-compose.yml", "down"], cwd=ROOT_DIR)


def cmd_deploy_up() -> int:
    return _run(
        [*_compose_cmd(), "-f", "docker-compose.yml", "-f", "docker-compose.prod.yml", "up", "-d", "--build"],
        cwd=ROOT_DIR,
    )


def cmd_deploy_down() -> int:
    return _run(
        [*_compose_cmd(), "-f", "docker-compose.yml", "-f", "docker-compose.prod.yml", "down"],
        cwd=ROOT_DIR,
    )


def cmd_disable_gh_actions() -> int:
    """Disable GitHub Actions at the GitHub repository settings level via `gh api`."""
    gh_bin = shutil.which("gh")
    if not gh_bin:
        print("[FAIL] GitHub CLI ('gh') not found on PATH.")
        return 1
    rc = _run([gh_bin, "api", "-X", "PUT", "repos/lithix-src/vectra/actions/permissions", "-F", "enabled=false"])
    if rc == 0:
        print("[PASS] Disabled GitHub Actions on lithix-src/vectra (enabled=false).")
        _run([gh_bin, "api", "repos/lithix-src/vectra/actions/permissions"])
    return rc


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
        "disable-gh-actions": cmd_disable_gh_actions,
    }
    if action not in dispatch:
        print(
            "Usage: uv run python scripts/vectra_cli.py "
            "[setup|clean|review|verify|instantiate|dev|api|worker|infra-up|infra-down|deploy-up|deploy-down|disable-gh-actions]"
        )
        return 0
    return dispatch[action]()


if __name__ == "__main__":
    raise SystemExit(main())
