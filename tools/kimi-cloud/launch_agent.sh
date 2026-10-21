#!/usr/bin/env bash
# Staged only. Workflow installs the exact verified OpenCode Linux archive,
# browser tooling and browser binaries before this launcher is approved to run.
# No sudo, broad permission flags, background service or credential echo here.
set -euo pipefail
umask 077
if [[ "$(uname -s)" != "Linux" || "${EUID}" != "0" ]]; then
  printf '%s\n' '{"status":"blocked","code":"FRESH_LINUX_ROOT_REQUIRED"}'
  exit 2
fi
: "${RUN_EXPIRES_UTC:?Absolute launch approval expiry is required}"
: "${APPROVED_PAYLOAD_SHA256:?Approved synthetic brief hash is required}"
: "${APPROVED_PROXY_SHA256:?Approved controller hash is required}"
: "${APPROVED_LAUNCHER_SHA256:?Approved launcher hash is required}"
: "${OPENCODE_BINARY_SHA256:?Verified extracted binary hash is required}"
controller_directory="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
actual_launcher_hash="$(sha256sum -- "${BASH_SOURCE[0]}" | cut -d ' ' -f 1)"
if [[ "${actual_launcher_hash}" != "${APPROVED_LAUNCHER_SHA256}" ]]; then
  printf '%s\n' '{"status":"blocked","code":"LAUNCHER_HASH_MISMATCH"}'
  exit 2
fi
for required_program in /usr/bin/python3 /usr/bin/bwrap /usr/sbin/iptables; do
  if [[ ! -x "${required_program}" ]]; then
    printf '%s\n' '{"status":"blocked","code":"LINUX_ISOLATION_DEPENDENCY_MISSING"}'
    exit 2
  fi
done
# exec replaces the root shell; only the trusted Python controller consumes the
# environment credential. The coding worker gets a new explicit empty env.
exec /usr/bin/python3 -B "${controller_directory}/agent_proxy.py" launch "$@"
