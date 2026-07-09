#!/usr/bin/env bash
#
# sync-site-repo.sh — Publish the (private) frontend into the PUBLIC site repo.
#
# Architecture: the source of truth stays in THIS private repo under
# mait-mvp/frontend. The public repo (e.g. mentalmathsmentor/myaitutor-site)
# receives a copy of that frontend at its ROOT and builds/serves it via
# GitHub Pages. Run this whenever you want to push the current frontend live.
#
# Usage:
#   scripts/sync-site-repo.sh <path-to-local-clone-of-public-repo> [git-branch]
#
# Example:
#   git clone git@github.com:mentalmathsmentor/myaitutor-site.git ../myaitutor-site
#   scripts/sync-site-repo.sh ../myaitutor-site main
#
# It copies the frontend, drops in the Pages workflow + .gitignore on first run,
# guarantees the CNAME file is present, then commits and pushes.

set -euo pipefail

TARGET="${1:?Usage: sync-site-repo.sh <path-to-public-repo-clone> [branch]}"
BRANCH="${2:-main}"

# Resolve paths relative to this script so it works from anywhere.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SRC="$REPO_ROOT/mait-mvp/frontend"
TEMPLATE="$REPO_ROOT/docs/site-repo-template"

[ -d "$SRC" ]    || { echo "ERROR: frontend not found at $SRC" >&2; exit 1; }
[ -d "$TARGET" ] || { echo "ERROR: target repo path '$TARGET' does not exist. Clone the public repo first." >&2; exit 1; }
[ -d "$TARGET/.git" ] || { echo "ERROR: '$TARGET' is not a git repository." >&2; exit 1; }
command -v rsync >/dev/null 2>&1 || { echo "ERROR: rsync is required." >&2; exit 1; }

echo "==> Syncing frontend  $SRC  ->  $TARGET  (branch: $BRANCH)"

# Mirror the frontend into the public repo root, excluding build junk and secrets.
# --delete keeps the public repo clean of files removed from the source, while
# protecting the public repo's own git/workflow/CNAME metadata.
rsync -a --delete \
  --exclude '.git/' \
  --exclude 'node_modules/' \
  --exclude 'dist/' \
  --exclude '.env' \
  --exclude '.env.*' \
  --exclude 'vite.config.js.timestamp-*' \
  --exclude '.github/' \
  --exclude 'CNAME' \
  "$SRC"/ "$TARGET"/

# First-run scaffolding (won't clobber if you've customised them).
mkdir -p "$TARGET/.github/workflows"
[ -f "$TARGET/.github/workflows/deploy.yml" ] || cp "$TEMPLATE/deploy.yml" "$TARGET/.github/workflows/deploy.yml"
[ -f "$TARGET/.gitignore" ] || cp "$TEMPLATE/gitignore.txt" "$TARGET/.gitignore"

# The custom domain MUST be published with the site. Source of truth: the
# frontend's public/CNAME. Guarantee it lands at the public repo root too.
CNAME_SRC="$SRC/public/CNAME"
[ -f "$CNAME_SRC" ] || { echo "ERROR: $CNAME_SRC missing." >&2; exit 1; }
cp "$CNAME_SRC" "$TARGET/CNAME"

echo "==> Committing and pushing"
git -C "$TARGET" add -A
if git -C "$TARGET" diff --cached --quiet; then
  echo "==> No changes to publish. Done."
  exit 0
fi
git -C "$TARGET" commit -m "chore: sync site from private repo ($(date -u +%Y-%m-%dT%H:%MZ))"
git -C "$TARGET" push -u origin "$BRANCH"

echo "==> Done. GitHub Actions in the public repo will build and deploy to Pages."
