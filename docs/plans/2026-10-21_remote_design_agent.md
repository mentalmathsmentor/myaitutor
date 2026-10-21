# Remote design agent preparation — 21/10/2026

Status: **staged; no cloud session or new model request launched**.

## Requested outcome

Darra wants an autonomous coding agent on a computer outside his MacBook: implement a substantial design candidate, run the website, interact with it in a browser, fix defects and repeat. His requested ceiling was up to 50 turns and approximately ten US cents of metered model spend. Those are limits to verify against the selected service, not a claim that a service can provide that workload for that amount. He suggested the official Devin client and offered to sign in to check free access. No subscription purchase or paid plan upgrade is authorised.

The earlier unpublished `runner.py`, workflow and narrow JSON-operation brief are superseded as the proposed execution approach. They have not been launched, pushed or given a cloud secret. Their syntax-only checks do not fulfil the requested browser coding loop.

## Verified preparation

- Local branch: `codex/kimi-cloud-design-20261021`, based on public repository `mentalmathsmentor/myaitutor` remote main at `2d924e8`.
- Existing Desktop launcher resolves to the installed Devin application; it is distinct from the coding-agent client.
- Official agent download manifest: `https://static.devin.ai/cli/current/manifest.json`.
- Downloaded client version: `3000.11.92`, Apple silicon. Reported version: `devin 3000.11.92 (7f4e64980e22)`.
- Archive SHA-256 matched the official manifest: `6047392212ce073ede2724d84246cc04dd47811a1d1e2084eee7252703940ac1`.
- Client extracted under `/private/tmp/devin-cloud-check-20261021/client-3000.11.92/`; existing application, launcher and shell settings were preserved. Version and help checks succeeded. Authentication metadata reported not logged in.
- Opened the official web sign-in page for a graphical human handoff. No credentials were entered, copied or uploaded by the controller.

## Direct-source findings

Checked official sources on 21/10/2026:

1. `https://devin.ai/pricing`: Free has a light coding-agent quota and limited models. Pro is advertised at $20/month and adds Devin Cloud access. The page does not establish this account's entitlement, a free cloud trial, Kimi's exact current version or a 50-turn allowance. Displayed dollars are retained as published; no AUD conversion or billing currency inference is made.
2. `https://docs.devin.ai/cli/cloud.md`: cloud sessions use their own VM, shell, browser and repository clones. CLI cloud sessions automatically connect the local computer for individually approved local tool requests. Prefer the web surface and do not connect Local Hands for this task.
3. `https://docs.devin.ai/cli/models.md`: Kimi is a supported family; current account availability and exact version require the live selector/catalogue. Family support is not proof of the requested model's availability in cloud.
4. `https://docs.devin.ai/cli/reference/commands.md`: documents metadata-only authentication status, available-model listing and version commands. These are distinct from model requests.

## Prepared worker packet

The identity-neutral C.H.O.R.E.S. packet is `tools/kimi-cloud/full-agent-brief.md`. It permits genuine remote build and browser testing, requires evidence and keeps the work in an independent candidate directory. It is prepared only and has not been sent to a model.

## Before launch

After Darra signs in, inspect the account plan, included cloud quota, extra-usage settings and live model selector. Confirm an exact Kimi route rather than substituting another model. If free cloud execution is unavailable, report that specific limitation and stage a separately authorised alternative rather than purchasing Pro or enabling metered usage.

Pin a run card to the exact screened packet and verified route. Include account, model, billing, permitted remote shell/browser/dependency operations, egress and retention, enforceable turn/time/spend stops, acceptance evidence, expiry, stop controls and recovery. A provider's unspecified quota cannot substantiate a guaranteed 50-turn loop. The ten-cent model allowance does not cover an unverified VM fee or subscription. No cloud credential copy, repository connection/push, public preview or deployment is authorised by this staging document.

Verification: review the exact two documentation paths and scan their staged diff for secrets before committing. No runtime test is claimed for these prose-only preparation files. Rollback: revert only the preparation commit; source candidates and existing dirty work remain separate.
