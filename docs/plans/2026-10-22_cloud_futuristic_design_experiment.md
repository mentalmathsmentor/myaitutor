# Futuristic frontend cloud experiment — 22/10/2026

Status: prepared locally, awaiting exact launch approval. No model or cloud job has been started by this preparation.

## Outcome

Create an independent MyAITutor website candidate with a striking visual direction, useful transitions and working teacher, planning and learner interactions. A real coding agent must run the application and browser tests in a disposable cloud VM. Source and screenshots return for controller review; nothing is integrated into the existing application or deployed.

## Routes

- Coding: OpenCode 1.19.3 on a standard GitHub-hosted Ubuntu 24.04 VM, routing `moonshotai/kimi-k3` only through OpenRouter endpoint `inference-net/us`. At most 50 HTTP attempts, a US$0.10 operational model budget, no provider retries or model fallback. Reasoning is disabled through the gateway and must be supported by live metadata.
- Independent direction check: one tool-free `anthropic/claude-fable-5.1` request through OpenRouter endpoint `anthropic`. At most 8,192 input tokens and 4,000 total output tokens; reserve US$0.30. This is a proposed design specification, not a claim that the model inspected or implemented the coding candidate.
- Public standard GitHub runners have no minute charge under the current official billing policy. The workflow uses job logs to return a screened source/screenshot bundle and does not upload Actions artifacts or caches. No subscription, top-up, public site or production deployment is requested.

The local approval card pins the exact commit, both screened briefs, request/controller hashes, cloud secret destination, expiry, spending and stop controls. It is held outside this public branch because account and approval receipts are local controller material.

## Worker and controller boundary

The root controller keeps the provider credential out of the coding worker's environment and writable files. The worker has a fresh Linux UID and mount/PID namespace, dropped capabilities, no new privileges, an empty environment and only a synthetic workspace plus read-only runtime/configuration mounts. It has editor and scoped shell capabilities for development and browser testing, with no access to the Mac, personal home, original checkout, repository credentials or privileged controller files.

The proxy admits only the pinned model and endpoint, checks live prices and reasoning controls, screens and hashes the complete outbound request, reserves before dispatch and serialises model requests. A failed or unknown-cost request retains its reservation and stops; a known overage is recorded and stops. These are operational controls around documented provider behaviour, not a guarantee against a provider billing fault.

The cloud job lasts at most 25 minutes including dependency setup. The controller's cutoff is set during setup to the earlier of 22 minutes from that point or the approved absolute expiry, leaving cleanup headroom. The exact isolated namespace must pass UID/capability checks, Node/browser startup and client-version checks before a billable model request.

## Inputs and evidence

`tools/kimi-cloud/full-agent-brief.md` is the coding packet; `tools/kimi-cloud/design-direction-brief.md` is the separate direction packet. Both contain synthetic product-design context only. The coding route uses browser DOM checks and captures screenshots; image pixels are not passed to that model. The controller performs visual review of returned images.

Local checks passed: 18 mock HTTP/archive tests, Python parsing, Bash syntax, workflow YAML parsing, deterministic packet hashes and PII screening. An independent native source review accepted the prepared runner and the bounded final browser-preflight change. Initial review found and corrected an exporter that skipped the requested candidate folder and a failure path that could suppress the public usage receipt.

Linux execution, namespace containment, actual package/runtime compatibility and browser rendering remain unverified until the approved cloud run. Any missing capability or failed preflight stops rather than silently changing route, permissions or model.

## Recovery

Keep unrelated dirty work and the existing frontend candidate unchanged. Push only the reviewed feature-branch commit after exact approval; it does not trigger the main-branch website deployment. Permit cancellation of only the resulting job. Remove the newly created temporary environment secret after the job, retain its execution record, and import only screened returned candidate files for local review. Reverting the preparation commit removes the new experiment files; model spend and already transmitted public material are irreversible.


## First cloud attempt and staged correction

The approved feature commit b447b1ba0b757e19b33da9a7cc454fc4236a1fab ran as GitHub Actions run 39613525657. Public runtime setup succeeded, then the root-protected-path preflight stopped with CONTROLLER_PATH_NOT_ROOT_PROTECTED before credential consumption, endpoint attestation or model dispatch. No coding candidate was produced. The temporary environment secret was removed and its absence verified. No workflow rerun or second push has been made.

The official runner image build script makes /opt recursively mode 777. The existing workflow protected its new child folders but omitted this ancestor. The staged correction explicitly restores root ownership and removes group/other write permission on /opt in the disposable VM before creating any controller runtime. The controller's protection check remains unchanged. Source: https://raw.githubusercontent.com/actions/runner-images/main/images/ubuntu/scripts/build/configure-system.sh (inspected directly on 22/10/2026 Australia/Sydney).

The separate Fable direction call returned a visible proposal called The Rail for US$0.20993, with 993 input and 4000 total completion tokens, including 385 reasoning tokens excluded from the saved visible output. The response reached its token ceiling and ends during its memorable-details section; the requested final acceptance plan is incomplete. This is a partial specification, not a generated or tested website. No additional Fable request is proposed in the correction.

Publishing the corrected feature commit and starting one new Kimi-only cloud attempt requires approval of a replacement exact run card. The first card explicitly prohibited retries and second pushes; its approval is not transferred.
