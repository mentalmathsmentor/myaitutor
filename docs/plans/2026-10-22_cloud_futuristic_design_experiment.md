# Futuristic frontend cloud experiment — 22/10/2026

Status: cloud coding remains blocked before any model request. The latest approved run passed Linux identity, directory, proxy access and browser checks, then stopped at the coding-client version gate. A credential-free diagnostic is staged locally and requires its own public-push approval. Earlier preparation and attempts are documented below.

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

The corrected-attempt approval arrived after its 02:00 Sydney expiry, so that attempt was not launched and no temporary credential was uploaded. The refreshed candidate changes only the approval expiry to 08:00 Sydney on 23/10/2026 (2026-10-22T21:00:00Z), retaining one job and the same US$0.10 operational limit. Public Kimi route, reasoning-disable support and pinned prices were rechecked and unchanged on 22/10/2026. Fresh exact-card approval is required before publication.


## Corrected cloud attempt and isolation repair

The refreshed approved commit bb9afbcfd8d01e56379a8974295a9a2a0b74fa9b ran as GitHub Actions run 39687437687. Runtime preparation and the protected-path check passed; the isolated-agent preflight then stopped with ISOLATION_PREFLIGHT_FAILED. Its usage receipt records zero requests, US$0 known cost and US$0 unsettled reservations. No candidate was generated. The temporary secret was removed and its absence verified. This was a launcher failure, not evidence about Kimi's coding performance.

The installed tool was bubblewrap 0.9.0-1ubuntu0.3. Its official v0.9.0 source rejects changing UID/GID without a user namespace. The staged correction adds the user namespace and drops the host UID/GID to 29071 before each bubblewrap invocation, preserving the UID expected by the host socket-owner check. The previous command stderr was deliberately discarded, so its exact text is not claimed. Source: https://raw.githubusercontent.com/containers/bubblewrap/v0.9.0/bubblewrap.c (inspected directly).

The read-only native helper found an additional double-escaped tab comparison in the Linux identity probe. The correction parses /proc status fields instead; regression tests run the actual child-probe text against valid tabs and reject effective capabilities or missing no-new-privileges. A local GET probe also verifies that identity checks cannot dispatch a model request. The complete mock suite now passes 20 tests. Workflow YAML and all embedded shell blocks parse. These checks do not establish Linux runtime success.

A separate credential-free workflow step now uses only a dummy value and a separate control/workspace path to test host/socket UID, sandbox identity, Chromium DOM startup and exact client version. Preflight-only mode returns before creating a model worker. Only a successful step permits the following real-secret step. Failures identify the phase using fixed public codes; raw agent output remains discarded. Firewall cleanup failures retain the model usage/export receipt before returning failure. A new exact card must approve the changed controller/workflow and one new cloud job; no automatic retry has occurred.

The credential-free phase additionally denies every model POST at the proxy, including otherwise valid requests, and records bounded CLI help/version/man capability probes in its disposable workspace. A negative HTTP test confirms zero dispatch in this mode; the complete mock suite passes 21 tests. These metadata probes do not renew or retry a model attempt.


## Credential-free failure and revised trusted startup

Approved commit 41cd4e0e37743f795b83810e1b752c66c054f938 ran as Actions run 39731714283. The dummy-key phase failed with ISOLATION_IDENTITY_PREFLIGHT_FAILED. The real-model step was skipped, no model request was dispatched and no model cost was incurred. The temporary secret was removed and absence verified. The phase code identifies the failure location; stderr had been discarded, so the underlying Linux error is not established.

The new staged startup avoids unprivileged user-namespace creation. Trusted root bubblewrap creates mount/PID/IPC/UTS boundaries and always invokes trusted setpriv before Python, Node or the coding client. The wrapper briefly holds only SETUID/SETGID/SETPCAP so setpriv can switch to host UID/GID 29071, clear groups and remove inheritable/ambient/bounding capabilities. The worker probe requires zero effective and bounding capabilities and no-new-privileges. No untrusted/model code is allowed to execute before this drop. Existing fresh workspace, hidden controller, root-only provider memory, socket-owner firewall and dummy-only preflight remain. This changes the trusted startup boundary and requires a fresh exact approval.

Trusted setup failures now return at most 4096 bytes of classified stderr and a fixed phase/exit code; unsafe text is withheld. Raw model-worker output is still discarded. Regression tests include capability-bound rejection and secret-shaped diagnostic withholding. All 22 local tests, Python/YAML parsing and workflow shell syntax checks passed. A read-only native helper found no concrete source blocker; no successful Linux execution is claimed. Sources inspected directly: https://man7.org/linux/man-pages/man1/setpriv.1.html and https://raw.githubusercontent.com/containers/bubblewrap/v0.9.0/bubblewrap.c .

The new one-job approval candidate expires at 08:00 Sydney on 24/10/2026 (2026-10-23T21:00:00Z), keeping the US$0.10 total Kimi operational budget, no Fable call, no retries and no deployment. The longer approval window does not renew counters or allow repeated jobs. Live identity, credit, route, price and all source pins must be checked again before launch.


## Diagnosed private-directory startup failure

Approved commit 4cc80d58168db363951394378fcbea40a846f7ef ran as Actions run 39743189813. The dummy-key phase returned the screened error: bwrap: Can't chdir to /workspace: Permission denied. The real-model step was skipped, no Kimi request was sent, no model cost was incurred and the temporary secret was removed with absence verified.

Bubblewrap v0.9.0 drops its unwanted capabilities before its own chdir. The workspace remains mode 0700 owned by worker UID 29071, so the root setup payload without DAC override cannot enter it before setpriv changes identity. The staged correction keeps bubblewrap in the accessible namespace root, performs the same setpriv drop, then uses GNU env --chdir=/workspace to enter the private directory as the worker. PWD is set to match; the identity probe also requires the actual working directory to be /workspace. The private directory permission is not relaxed. The private tmpfs /tmp is explicitly mode 1777 for browser/package temporary files; no host temporary-directory permissions are changed.

Official source checks confirmed bubblewrap's operation order and --chmod interface, plus GNU coreutils 9.4 env --chdir support. The 22 local tests pass, including direct child-probe rejection of a wrong working directory. Python/YAML parsing, both controller hash pins and all workflow shell syntax checks passed. These remain local/source checks, not a successful Linux execution claim. This new exact commit still requires separate publication/one-job approval. Sources: https://raw.githubusercontent.com/containers/bubblewrap/v0.9.0/bubblewrap.c and https://raw.githubusercontent.com/coreutils/coreutils/v9.4/src/env.c .

## Client version gate and credential-free diagnostic

Approved commit 763377981113ed136cda61c787697e782bcf462f ran as [Actions run 39761420730](https://github.com/mentalmathsmentor/myaitutor/actions/runs/39761420730). The exact isolation identity, private working-directory, host socket ownership and browser DOM probes passed before the controller stopped with OPENCODE_VERSION_MISMATCH. This code means either a nonzero client exit or unexpected version stdout; the old receipt did not retain either stream, so the underlying cause is still unknown. The real-model step was skipped. This attempt made zero Kimi coding requests and incurred zero model cost. The temporary environment secret was removed and its absence verified. No cloud coding candidate exists.

The staged workflow is now diagnostic-only: no job environment, secret reference, real-key step, Keychain access or model-worker execution. Only the fixed synthetic dummy value is supplied. Preflight no longer calls the provider catalogue, and its local proxy rejects every model POST. The official pinned OpenCode 1.19.3 archive, namespace, privilege drop, exact-version gate and browser checks remain unchanged. The diagnostic reports the version command's exit status and classified stdout/stderr, each limited to 8192 bytes. On failure it may also report screened 8192-byte tails from at most two CLI-metadata log files, each at most 262144 bytes. Only metadata commands have run at that point; raw model-worker logs remain excluded. Unsafe output is withheld, with a digest and byte count retained.

The single standard public Ubuntu 24.04 job has a ten-minute hard timeout and an inner cutoff seven minutes after preparation starts, bounded by 08:00 Sydney on 24/10/2026. It uses read-only repository permissions and no artifact/cache uploads. Under [GitHub's standard public-runner billing policy](https://docs.github.com/en/billing/concepts/product-billing/github-actions), the job has no runner-minute charge; model calls and model spend are both capped at zero. No purchase, top-up, Fable call, retry or deployment is included. Code and classified metadata enter public repository/job logs and cannot be recalled from copies.

All 23 local mock HTTP, request-gate, archive and classification tests passed; Python/YAML and embedded Bash syntax checks passed. These checks do not establish that OpenCode starts successfully on Linux. Diagnostic acceptance is a concrete classified version/error observation, even if the version gate still fails. One exact public feature-branch push and one resulting diagnostic job need fresh approval; any future coding run is separate.
