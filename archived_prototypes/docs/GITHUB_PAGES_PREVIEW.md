# GitHub Pages Preview

There are now two branch-testing workflows:

## 1. Build Frontend Preview Artifact

This runs on candidate branches and pull requests, builds `mait-mvp/frontend/dist`, and uploads it as a workflow artifact.

Use this when you want a safe deployable build without touching the live site.

## 2. Deploy Temporary Pages Preview

This is manual-only. It can deploy any ref to the existing GitHub Pages URL.

Important:

- it temporarily replaces the live frontend
- it does **not** create an isolated preview URL
- re-run the normal `Deploy Frontend to GitHub Pages` workflow from `main` to restore the standard site
