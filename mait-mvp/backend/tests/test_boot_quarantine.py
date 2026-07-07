"""
Boot-time quarantine guard (Canon §2: FAISS + sentence-transformers are DEAD
for the tutor path).

Importing app.main must not load faiss or sentence_transformers — the legacy
student surface pays for them lazily at first use, never at boot. Runs in a
subprocess so a clean interpreter is used regardless of what other tests have
already imported.
"""
import os
import subprocess
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]

CHECK_SCRIPT = """
import sys
import app.main  # noqa: F401 — boot the app module graph

banned = [m for m in ("faiss", "sentence_transformers") if m in sys.modules]
if banned:
    raise SystemExit(f"BANNED MODULES LOADED AT BOOT: {banned}")
print("BOOT_CLEAN")
"""


def test_app_boot_does_not_import_faiss_or_sentence_transformers():
    env = dict(os.environ)
    env.setdefault(
        "DATABASE_URL",
        "postgresql+asyncpg://mait:mait_dev_password@localhost:5432/mait_dev",
    )
    result = subprocess.run(
        [sys.executable, "-c", CHECK_SCRIPT],
        cwd=BACKEND_DIR,
        env=env,
        capture_output=True,
        text=True,
        timeout=120,
    )
    assert result.returncode == 0, (
        f"boot check failed\nstdout: {result.stdout}\nstderr: {result.stderr}"
    )
    assert "BOOT_CLEAN" in result.stdout
