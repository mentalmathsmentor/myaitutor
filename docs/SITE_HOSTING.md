# MyAITutor.au — Site Hosting & Recovery Runbook

## What broke (2026-07-09)

`www.myaitutor.au` returned GitHub's **"There isn't a GitHub Pages site here" 404**.

**Root cause: the `mentalmathsmentor/myaitutor` repository was switched to _private_.**

On a GitHub **Free** personal account, GitHub Pages is only served for **public**
repositories. The moment the repo became private, GitHub automatically
**unpublished** the Pages site — no build failed, no code changed.

Evidence:

| Check | Result |
|---|---|
| Repo visibility | `private` |
| Account public repos | `0` |
| Last Pages deploy | 2026-06-30 — **succeeded** |
| Commits to `main` since | **none** |
| `CNAME` file (`www.myaitutor.au`) | present, intact |
| DNS | still points at GitHub (that's why you get GitHub's own 404 page) |

So the pipeline and the code are healthy. This was a **visibility setting**, not a bug.

## Chosen fix: split the site into a dedicated PUBLIC repo

Keep `mentalmathsmentor/myaitutor` **private** (it holds business/vision docs,
investor one-pagers, architecture canon). Publish only the frontend from a
**separate public repo** so Pages will serve it for free.

- **Source of truth stays private:** `mait-mvp/frontend/` in this repo.
- **New public repo** (suggested name `myaitutor-site`) holds a copy of that
  frontend at its **root** and builds/serves it via GitHub Pages.
- A helper script, [`scripts/sync-site-repo.sh`](../scripts/sync-site-repo.sh),
  pushes the current frontend into the public repo whenever you want to ship.

### Safe to publish?

Yes — the frontend source was scanned before this was recommended:
- No API keys, private keys, tokens, or committed `.env` (the real `.env` is gitignored).
- The only external identifiers — the Google OAuth **client ID** and the backend
  URL `https://myaitutor-54iv.onrender.com` — are already embedded in any built
  client, so they are not secrets.

Nothing sensitive from the top-level repo (PDFs, vision docs, investor material)
goes into the public repo — only `mait-mvp/frontend/`.

---

## One-time setup

### 1. Create the public repo
On GitHub → **New repository**:
- Name: `myaitutor-site`
- Visibility: **Public**
- Do **not** add a README/.gitignore (the sync script populates everything).

### 2. Populate it from the private repo
From a local clone of THIS private repo:

```bash
# clone the empty public repo next to this one
git clone git@github.com:mentalmathsmentor/myaitutor-site.git ../myaitutor-site

# copy the frontend in, add the Pages workflow + CNAME, commit & push
scripts/sync-site-repo.sh ../myaitutor-site main
```

This lands, in the public repo: the frontend at root, `.github/workflows/deploy.yml`
(the proven build→Pages pipeline), `.gitignore`, and `CNAME` = `www.myaitutor.au`.
The push triggers the Actions build automatically.

### 3. Enable Pages on the public repo
Public repo → **Settings → Pages**:
- **Source:** _GitHub Actions_ (not "Deploy from a branch").
- Wait for the **Deploy Site to GitHub Pages** workflow (Actions tab) to go green.

### 4. Move the custom domain
1. **Old (private) repo → Settings → Pages:** clear the **Custom domain** field
   and save. This releases the `www.myaitutor.au` claim so the new repo can take it.
   (Pages is already unpublished there, but clearing the domain avoids an
   "already in use" conflict.)
2. **New (public) repo → Settings → Pages → Custom domain:** it should already
   read `www.myaitutor.au` (published from the `CNAME` file). If not, enter it and save.
3. Wait for the green "DNS check successful", then tick **Enforce HTTPS**
   (certificate provisioning can take a few minutes up to ~an hour).

### 5. DNS — most likely NOTHING to change
Because the site stays under the **same GitHub account**, the DNS target does not
change when moving between repos. Verify (don't necessarily change) at your DNS host:

- `www.myaitutor.au` → **CNAME** → `mentalmathsmentor.github.io`
- Apex `myaitutor.au` (if used) → **A** records to GitHub Pages:
  `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
  (and/or the matching AAAA records).
- Any **account-level domain verification** (Settings → Pages → *Verified domains*)
  is per-account and carries over — no need to re-verify.

### 6. Verify it's live
- `https://www.myaitutor.au/` loads the app (hard-refresh to beat cached 404s).
- Deep links work (the `404.html` copy provides SPA fallback).

---

## Ongoing: shipping site updates

The site source stays in this private repo. To publish changes:

```bash
scripts/sync-site-repo.sh ../myaitutor-site main
```

The public repo's Action rebuilds and redeploys. Consider fully automating this
later with a private→public push in CI (needs a deploy token stored as a secret);
the manual script needs no secrets and is enough to get back online now.

---

## Alternatives (not chosen)

- **GitHub Pro (~$4/mo):** enables Pages on the existing private repo — fastest,
  zero restructure, but a paid plan.
- **Cloudflare Pages / Netlify / Vercel:** serve directly from the private repo
  for free with the same custom domain; moves you off GitHub Pages.
- **Make the repo public:** simplest, but exposes all source **and git history**
  (vision docs, investor one-pagers) permanently. Not recommended.
