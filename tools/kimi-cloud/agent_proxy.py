#!/usr/bin/env python3
"""Staged Linux OpenCode controller. No third-party Python dependencies.

Run --self-test for loopback-only synthetic tests. `launch` requires current
endpoint pricing and gateway support for disabling reasoning. Reservation is
operational enforcement of documented caps, not a promise against provider bugs.
No request/response text, credentials, or reasoning is written to receipts.
"""
from __future__ import annotations

import argparse
import base64
import contextlib
import ctypes
import datetime as dt
from decimal import Decimal, ROUND_FLOOR
import hashlib
import http.client
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import io
import json
import os
from pathlib import Path
import re
import resource
import signal
import socket
import stat
import subprocess
import sys
import tarfile
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request
import uuid

MODEL = "moonshotai/kimi-k3"
ALIAS = "candidate"
ENDPOINT = "inference-net/us"
INPUT_RATE = Decimal("0.000000239")
OUTPUT_RATE = Decimal("0.000011936")
BUDGET = Decimal("0.10")
MAX_REQUESTS = 50
MAX_OUTPUT = 6000
MAX_SECONDS = 25 * 60
MAX_BODY = 240_000
OPENCODE_VERSION = "1.19.3"
OPENCODE_ARCHIVE_SHA512 = "wz+kXi7ZkvLW04hEIocW3RoEznALJ3YGnvNlZdXFarYF0v1jyDyAwpPGZkxb4JZDrw4oy48/LDZ8wCFIQDTxhw=="
API = "https://openrouter.ai/api/v1"
# No provider bug/ignored cap is disguised as an enforced absolute spend limit.
PROVIDER_HARD_CAP_VERIFIED = False


class Stop(Exception):
    """Safe public code only; never attach an upstream body or request text."""


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True,
                      separators=(",", ":"), allow_nan=False).encode("utf-8")


def digest(data):
    return hashlib.sha256(data).hexdigest()


def screen(data, secret=""):
    """Deterministic reject gate; provenance is the separate clean-VM boundary.

    This is NOT a proof of absence of all PII. Only synthetic source plus clean
    tooling output belongs in the VM. No existing application/private files.
    """
    text = data.decode("utf-8", errors="strict")
    if secret and secret in text:
        raise Stop("SECRET_DETECTED")
    patterns = [
        r"sk-or-v1-[A-Za-z0-9_-]+", r"github_pat_[A-Za-z0-9_]+",
        r"gh[pousr]_[A-Za-z0-9]{20,}",
        r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
        r"(?i)bearer\s+[A-Za-z0-9._-]{20,}",
        r"/Users/[^/\s]+", r"(?i)\b(?:passport|medicare|centrelink)\s*(?:number|id)\b",
        r"(?i)\b(?:password|api[_ -]?key|access[_ -]?token)\s*[:=]\s*[\"']?[A-Za-z0-9_+/-]{16,}",
    ]
    if any(re.search(pattern, text) for pattern in patterns):
        raise Stop("SECRET_OR_PRIVATE_DATA")
    for address in re.findall(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", text):
        if address.rsplit("@", 1)[1].lower() not in {"example.com", "example.org", "example.test", "example.invalid"}:
            raise Stop("NON_SYNTHETIC_EMAIL")
    return "synthetic-code-and-clean-tooling"


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise Stop("UPSTREAM_REDIRECT_DENIED")


class Transport:
    def __init__(self, key, base=API, timeout=90):
        self.key, self.base, self.timeout = key, base, timeout
        # Never inherit HTTP_PROXY, custom credential stores or automatic retries.
        self.opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())

    def json(self, path, payload=None, timeout=None):
        headers = {"Accept": "application/json"}
        data = None
        if payload is not None:
            headers.update({"Authorization": "Bearer " + self.key,
                            "Content-Type": "application/json"})
            data = canonical(payload)
        req = urllib.request.Request(self.base + path, data=data, headers=headers)
        # Exactly one HTTP attempt. Errors are intentionally not stringified.
        with self.opener.open(req, timeout=min(timeout, self.timeout) if timeout else self.timeout) as response:
            raw = response.read(8_000_001)
            if len(raw) > 8_000_000:
                raise Stop("UPSTREAM_RESPONSE_TOO_LARGE")
            return json.loads(raw)

    def attest(self, timeout):
        data = self.json("/models/" + MODEL + "/endpoints", timeout=timeout)
        endpoints = data.get("data", {}).get("endpoints", [])
        matches = [row for row in endpoints if row.get("tag") == ENDPOINT]
        if len(matches) != 1:
            raise Stop("ENDPOINT_NOT_UNIQUE")
        row = matches[0]
        price = row.get("pricing", {})
        try:
            if Decimal(str(price.get("prompt"))) != INPUT_RATE or Decimal(str(price.get("completion"))) != OUTPUT_RATE:
                raise Stop("PRICE_CHANGED")
            for name, value in price.items():
                number = Decimal(str(value))
                if not number.is_finite() or number < 0:
                    raise Stop("PRICE_INVALID")
                if name == "input_cache_read":
                    if number > INPUT_RATE:
                        raise Stop("CACHE_PRICE_ABOVE_RESERVATION")
                elif name not in {"prompt", "completion"} and number != 0:
                    raise Stop("UNRESERVED_PRICE_COMPONENT")
        except (ValueError, ArithmeticError, TypeError):
            raise Stop("PRICE_INVALID") from None
        required = {"max_tokens", "tools", "tool_choice", "reasoning", "reasoning_effort"}
        if row.get("status") != 0 or not required.issubset(set(row.get("supported_parameters", []))):
            raise Stop("ENDPOINT_CAPABILITY_CHANGED")
        if int(row.get("max_completion_tokens", 0)) < MAX_OUTPUT:
            raise Stop("ENDPOINT_OUTPUT_LIMIT_CHANGED")
        catalogue = self.json("/models", timeout=timeout)
        models = [model for model in catalogue.get("data", []) if model.get("id") == MODEL]
        if len(models) != 1:
            raise Stop("MODEL_METADATA_UNAVAILABLE")
        reasoning = models[0].get("reasoning", {})
        if reasoning.get("mandatory") is not False or "none" not in reasoning.get("supported_efforts", []):
            raise Stop("GATEWAY_REASONING_DISABLE_UNVERIFIED")
        return {"endpoint": ENDPOINT, "pricing_sha256": digest(canonical(price)),
                "reasoning_sha256": digest(canonical(reasoning)),
                "checked_utc": dt.datetime.now(dt.timezone.utc).isoformat()}


class BudgetProxy:
    def __init__(self, transport, deadline=None, receipt=None):
        self.transport = transport
        self.deadline = deadline or time.monotonic() + MAX_SECONDS
        self.receipt = Path(receipt) if receipt else None
        self.lock = threading.Lock()
        self.attempts = []
        self.charged = Decimal(0)
        self.held = Decimal(0)
        self.stopped = None
        self.last_attestation = None

    def snapshot(self):
        return {"model": MODEL, "endpoint": ENDPOINT, "billing": "OpenRouter paid",
                "budget_usd": str(BUDGET), "known_cost_usd": str(self.charged),
                "unsettled_reservations_usd": str(self.held),
                "committed_or_reserved_usd": str(self.charged + self.held),
                "request_count": len(self.attempts), "max_requests": MAX_REQUESTS,
                "retry_count": 0, "stopped": self.stopped,
                "hard_provider_cap_verified": PROVIDER_HARD_CAP_VERIFIED,
                "reservation_basis": "serialized-byte input bound plus protocol allowance; documented max_tokens with reasoning disabled",
                "material_risk": "Provider ignored caps or billing bugs may exceed a reservation; actual known overage is recorded and stops dispatch.",
                "attestation": self.last_attestation, "attempts": self.attempts}

    def persist(self):
        if self.receipt:
            temporary = self.receipt.with_suffix(".pending")
            with open(temporary, "w", encoding="utf-8") as handle:
                json.dump(self.snapshot(), handle, indent=2, allow_nan=False)
                handle.flush()
                os.fsync(handle.fileno())
            os.chmod(temporary, 0o600)
            os.replace(temporary, self.receipt)

    def stop(self, code):
        self.stopped = code
        self.persist()
        raise Stop(code)

    def request(self, raw):
        # Serial model dispatch and settlement: no concurrent budget oversubscription.
        with self.lock:
            if self.stopped:
                raise Stop(self.stopped)
            if time.monotonic() >= self.deadline:
                self.stop("DEADLINE")
            if len(self.attempts) >= MAX_REQUESTS:
                self.stop("REQUEST_LIMIT")
            entry = {"attempt": len(self.attempts) + 1,
                     "received_sha256": digest(raw), "state": "received"}
            self.attempts.append(entry)
            reserve = Decimal(0)
            dispatched = False
            try:
                if any(previous is not entry and previous.get("received_sha256") == entry["received_sha256"]
                       for previous in self.attempts):
                    raise Stop("DUPLICATE_REQUEST_RETRY_DENIED")
                if len(raw) > MAX_BODY:
                    raise Stop("REQUEST_TOO_LARGE")
                incoming = json.loads(raw)
                classification = screen(canonical(incoming), self.transport.key)
                payload, streaming = self.prepare(incoming)
                entry["classification"] = classification
                # Bound from the ENTIRE serialized outbound request, including schemas,
                # history, function arguments and tool results. Extra per-object framing
                # allowance is deliberately conservative, NOT a verified tokenizer proof.
                bound = len(canonical(payload)) + 8192 + 2048 * (
                    len(payload["messages"]) + len(payload.get("tools", [])))
                available = BUDGET - self.charged - self.held - bound * INPUT_RATE
                maximum = min(MAX_OUTPUT, int((available / OUTPUT_RATE).to_integral_value(rounding=ROUND_FLOOR)))
                if maximum < 64:
                    raise Stop("BUDGET_EXHAUSTED")
                requested = incoming.get("max_tokens", incoming.get("max_completion_tokens", MAX_OUTPUT))
                if not isinstance(requested, int) or isinstance(requested, bool) or requested < 1:
                    raise Stop("INVALID_OUTPUT_LIMIT")
                maximum = min(maximum, requested)
                payload["max_tokens"] = maximum
                serialized = canonical(payload)
                classification = screen(serialized, self.transport.key)
                if any(previous is not entry and previous.get("outbound_sha256") == digest(serialized) for previous in self.attempts):
                    raise Stop("DUPLICATE_REQUEST_RETRY_DENIED")
                # Recheck that replacing the numeric limit did not grow past the bound.
                if len(serialized) + 8192 > bound:
                    raise Stop("INPUT_BOUND_INVALID")
                reserve = bound * INPUT_RATE + maximum * OUTPUT_RATE
                entry.update({"outbound_sha256": digest(serialized),
                              "outbound_bytes": len(serialized), "input_token_bound": bound,
                              "max_output_tokens": maximum, "reserved_usd": str(reserve)})
                self.last_attestation = self.transport.attest(min(15, max(.1, self.deadline - time.monotonic())))
                if time.monotonic() >= self.deadline:
                    raise Stop("DEADLINE")
                # Durable reserve happens BEFORE any billable network operation.
                self.held += reserve
                entry["state"] = "reserved"
                self.persist()
                dispatched = True
                response = self.transport.json("/chat/completions", payload,
                                               timeout=min(90, self.deadline - time.monotonic()))
                # Record actual known cost even if usage/route subsequently violates a bound.
                usage = response.get("usage", {})
                cost = Decimal(str(usage.get("cost")))
                if not cost.is_finite() or cost < 0:
                    raise Stop("UNKNOWN_COST")
                self.held -= reserve
                self.charged += cost
                entry.update({"state": "settled", "actual_cost_usd": str(cost),
                              "prompt_tokens": usage.get("prompt_tokens"),
                              "completion_tokens": usage.get("completion_tokens")})
                reserve = Decimal(0)
                p, c = usage.get("prompt_tokens"), usage.get("completion_tokens")
                if (not isinstance(p, int) or isinstance(p, bool) or p < 0 or
                        not isinstance(c, int) or isinstance(c, bool) or c < 0):
                    raise Stop("INVALID_USAGE")
                if self.charged > BUDGET or cost > Decimal(entry["reserved_usd"]):
                    raise Stop("ACTUAL_OVERAGE")
                if p > bound or c > maximum:
                    raise Stop("TOKEN_BOUND_EXCEEDED")
                if usage.get("completion_tokens_details", {}).get("reasoning_tokens", 0) != 0:
                    raise Stop("REASONING_DISABLE_NOT_HONOURED")
                if response.get("model") != MODEL or response.get("provider") != "InferenceNet":
                    raise Stop("UPSTREAM_IDENTITY_MISMATCH")
                result = self.public_response(response, payload)
                self.persist()
                return result, streaming
            except Exception as exc:
                code = str(exc) if isinstance(exc, Stop) else "UPSTREAM_OR_PROTOCOL_FAILURE"
                entry["state"] = "unknown_reserved" if dispatched and reserve else "stopped"
                entry["error_code"] = code
                # Unknown timeout/error cost NEVER releases the reservation. No retry.
                self.stopped = code
                self.persist()
                raise Stop(code) from None

    @staticmethod
    def prepare(incoming):
        if not isinstance(incoming, dict) or incoming.get("model") != ALIAS:
            raise Stop("MODEL_DENIED")
        allowed = {"model", "messages", "tools", "tool_choice", "stream", "stream_options",
                   "max_tokens", "max_completion_tokens", "temperature", "top_p", "stop",
                   "seed", "presence_penalty", "frequency_penalty"}
        if set(incoming) - allowed:
            raise Stop("REQUEST_OPTION_DENIED")
        messages = incoming.get("messages")
        if not isinstance(messages, list) or not messages or len(messages) > 200:
            raise Stop("INVALID_MESSAGES")
        for message in messages:
            if not isinstance(message, dict) or message.get("role") not in {"system", "user", "assistant", "tool", "developer"}:
                raise Stop("INVALID_MESSAGE")
            if set(message) - {"role", "content", "name", "tool_calls", "tool_call_id"}:
                raise Stop("MESSAGE_OPTION_DENIED")
            content = message.get("content")
            if content is not None and not isinstance(content, str):
                # Text-only lists are normalized; images/audio/URLs are not admitted.
                if not isinstance(content, list) or any(not isinstance(x, dict) or set(x) != {"type", "text"} or x["type"] != "text" or not isinstance(x["text"], str) for x in content):
                    raise Stop("NON_TEXT_INPUT_DENIED")
                message["content"] = "\n".join(x["text"] for x in content)
        tools = incoming.get("tools", [])
        if not isinstance(tools, list) or len(tools) > 64:
            raise Stop("INVALID_TOOLS")
        for tool in tools:
            if not isinstance(tool, dict) or tool.get("type") != "function" or set(tool) != {"type", "function"}:
                raise Stop("SERVER_TOOL_DENIED")
            function = tool.get("function", {})
            if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_-]{0,63}", function.get("name", "")):
                raise Stop("INVALID_TOOL_NAME")
        payload = {k: v for k, v in incoming.items() if k not in {"model", "stream", "stream_options", "max_tokens", "max_completion_tokens"}}
        payload.update({"model": MODEL, "stream": False, "max_tokens": MAX_OUTPUT,
                        "provider": {"only": [ENDPOINT], "allow_fallbacks": False,
                                     "data_collection": "deny",
                                     "require_parameters": True,
                                     "max_price": {"prompt": float(INPUT_RATE * 1_000_000),
                                                   "completion": float(OUTPUT_RATE * 1_000_000)}},
                        "reasoning": {"enabled": False, "exclude": True},
                        "reasoning_effort": "none", "usage": {"include": True}})
        return payload, incoming.get("stream") is True

    @staticmethod
    def public_response(response, payload):
        choices = response.get("choices")
        if not isinstance(choices, list) or len(choices) != 1:
            raise Stop("INVALID_CHOICES")
        choice = choices[0]
        message = choice.get("message", {})
        content, calls = message.get("content"), message.get("tool_calls", [])
        if content is not None and not isinstance(content, str):
            raise Stop("INVALID_RESPONSE_CONTENT")
        allowed_names = {tool["function"]["name"] for tool in payload.get("tools", [])}
        clean_calls = []
        for call in calls:
            function = call.get("function", {})
            if (call.get("type") != "function" or not isinstance(call.get("id"), str) or
                    function.get("name") not in allowed_names or not isinstance(function.get("arguments"), str)):
                raise Stop("INVALID_NATIVE_TOOL_CALL")
            clean_calls.append({"id": call["id"], "type": "function",
                                "function": {"name": function["name"], "arguments": function["arguments"]}})
        finish = choice.get("finish_reason")
        if finish not in {"stop", "length", "tool_calls"}:
            raise Stop("UNSUPPORTED_FINISH_REASON")
        if not content and not clean_calls:
            raise Stop("EMPTY_VISIBLE_OUTPUT")
        clean = {"role": "assistant", "content": content}
        if clean_calls:
            clean["tool_calls"] = clean_calls
        usage = response["usage"]
        return {"id": "chatcmpl-" + uuid.uuid4().hex, "object": "chat.completion",
                "created": int(time.time()), "model": ALIAS,
                "choices": [{"index": 0, "message": clean, "finish_reason": finish}],
                "usage": {"prompt_tokens": usage["prompt_tokens"],
                          "completion_tokens": usage["completion_tokens"],
                          "total_tokens": usage["prompt_tokens"] + usage["completion_tokens"]}}


def sse_frames(response):
    """Native OpenAI chat streaming format, including incremental JSON arguments."""
    common = {k: response[k] for k in ("id", "created", "model")}
    common["object"] = "chat.completion.chunk"

    def chunk(delta, finish=None):
        return b"data: " + canonical({**common, "choices": [{"index": 0, "delta": delta, "finish_reason": finish}]}) + b"\n\n"

    yield chunk({"role": "assistant", "content": ""})
    message = response["choices"][0]["message"]
    content = message.get("content") or ""
    for offset in range(0, len(content), 512):
        yield chunk({"content": content[offset:offset + 512]})
    for index, call in enumerate(message.get("tool_calls", [])):
        function = call["function"]
        yield chunk({"tool_calls": [{"index": index, "id": call["id"], "type": "function",
                                     "function": {"name": function["name"], "arguments": ""}}]})
        arguments = function["arguments"]
        for offset in range(0, len(arguments), 256):
            yield chunk({"tool_calls": [{"index": index, "function": {"arguments": arguments[offset:offset + 256]}}]})
    yield chunk({}, response["choices"][0]["finish_reason"])
    yield b"data: " + canonical({**common, "choices": [], "usage": response["usage"]}) + b"\n\n"
    yield b"data: [DONE]\n\n"


class SafeHTTPServer(ThreadingHTTPServer):
    def handle_error(self, _request, _client_address):
        # Base server tracebacks are never public logs. A local protocol fault
        # stops further dispatch; existing reservations remain in the receipt.
        controller = getattr(self, "controller", None)
        if controller is not None:
            controller.stopped = "LOCAL_HTTP_FAILURE"


class ProxyHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *_args):
        pass

    def parse_request(self):
        if not super().parse_request():
            return False
        expected = getattr(self.server, "allowed_uid", None)
        if expected is not None:
            # TCP has no SO_PEERCRED. Match the established loopback peer socket
            # in Linux procfs as a second check behind the owner firewall rule.
            def address(value):
                return socket.inet_aton(value[0])[::-1].hex().upper() + f":{value[1]:04X}"
            peer = address(self.connection.getpeername())
            local = address(self.connection.getsockname())
            try:
                rows = Path("/proc/net/tcp").read_text().splitlines()[1:]
                owners = [int(fields[7]) for row in rows if
                          len(fields := row.split()) > 7 and fields[1] == peer and
                          fields[2] == local and fields[3] == "01"]
                if owners != [expected]:
                    self.error("PEER_UID_DENIED", 403)
                    return False
            except (OSError, ValueError):
                self.error("PEER_UID_UNVERIFIABLE", 403)
                return False
        return True

    def error(self, code, status=400):
        body = canonical({"error": {"message": code, "type": "controller_stop", "code": code}})
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Connection", "close")
        self.end_headers()
        self.wfile.write(body)
        self.close_connection = True

    def do_POST(self):
        try:
            if self.path != "/v1/chat/completions":
                return self.error("ENDPOINT_DENIED", 404)
            if self.headers.get("Transfer-Encoding") or not self.headers.get("Content-Length", "").isdigit():
                return self.error("CONTENT_LENGTH_REQUIRED", 411)
            size = int(self.headers["Content-Length"])
            if size < 1 or size > MAX_BODY:
                return self.error("REQUEST_SIZE_DENIED", 413)
            self.connection.settimeout(95)
            raw = self.rfile.read(size)
            if len(raw) != size:
                return self.error("INCOMPLETE_REQUEST")
            response, streaming = self.server.controller.request(raw)
            body = b"".join(sse_frames(response)) if streaming else canonical(response)
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream" if streaming else "application/json")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Connection", "close")
            self.end_headers()
            self.wfile.write(body)
            self.close_connection = True
        except Stop as exc:
            self.error(str(exc), 400)
        except (BrokenPipeError, ConnectionResetError, TimeoutError):
            # Cost is already settled/reserved before response delivery. Never replay.
            self.close_connection = True

    def do_GET(self):
        self.error("ENDPOINT_DENIED", 404)

    do_PUT = do_GET
    do_DELETE = do_GET
    do_PATCH = do_GET
    do_OPTIONS = do_GET
    do_HEAD = do_GET


def trusted(path, executable=False):
    path = Path(path)
    if not path.is_absolute() or path.resolve() != path:
        raise Stop("TRUSTED_PATH_NOT_CANONICAL")
    for item in (path, *path.parents):
        info = item.stat()
        if info.st_uid != 0 or info.st_mode & 0o022:
            raise Stop("CONTROLLER_PATH_NOT_ROOT_PROTECTED")
    if executable and not os.access(path, os.X_OK):
        raise Stop("RUNTIME_NOT_EXECUTABLE")
    return path


def command(args, failure="ISOLATION_PREFLIGHT_FAILED", **kwargs):
    result = subprocess.run(args, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                            stderr=subprocess.DEVNULL, check=False, **kwargs)
    if result.returncode:
        raise Stop(failure)


def emit_bundle(workspace, key):
    """Only screened synthetic source and PNG screenshots, never agent/session logs."""
    workspace = Path(workspace).resolve()
    candidate = workspace / "design-candidate"
    if candidate.exists() or candidate.is_symlink():
        if candidate.is_symlink() or not candidate.is_dir() or candidate.resolve().parent != workspace:
            raise Stop("EXPORT_ROOT_INVALID")
        workspace = candidate
    allowed_roots = {"src", "public", "screenshots", "tests"}
    allowed_top_extensions = {".html", ".css", ".js", ".jsx", ".ts", ".tsx", ".mjs", ".svg"}
    allowed_names = {"index.html", "package.json", "package-lock.json", "README.md", "VERIFICATION.md",
                     "vite.config.js", "vite.config.ts", "vite.config.mjs",
                     "tsconfig.json", "playwright.config.js", "playwright.config.ts"}
    output = io.BytesIO()
    total = count = 0
    with tarfile.open(fileobj=output, mode="w:gz") as archive:
        for path in sorted(Path(workspace).rglob("*")):
            relative = path.relative_to(workspace)
            if any(part.startswith(".") or part in {"node_modules", "dist", "test-results", "playwright-report"} for part in relative.parts):
                continue
            if path.is_symlink() or not path.is_file():
                continue
            if (relative.parts[0] not in allowed_roots and str(relative) not in allowed_names and
                    not (len(relative.parts) == 1 and path.suffix.lower() in allowed_top_extensions)):
                continue
            info = path.stat()
            if not stat.S_ISREG(info.st_mode) or info.st_size > 2_000_000:
                raise Stop("EXPORT_FILE_LIMIT")
            raw = path.read_bytes()
            if path.suffix.lower() == ".png" and relative.parts[0] == "screenshots":
                if not raw.startswith(b"\x89PNG\r\n\x1a\n"):
                    raise Stop("EXPORT_IMAGE_INVALID")
            else:
                screen(raw, key)
            total += len(raw)
            count += 1
            if total > 6_000_000 or count > 100:
                raise Stop("EXPORT_TOTAL_LIMIT")
            entry = tarfile.TarInfo(str(relative))
            entry.size = len(raw)
            entry.mode = 0o644
            entry.mtime = 0
            archive.addfile(entry, io.BytesIO(raw))
    if count == 0:
        raise Stop("EXPORT_EMPTY")
    raw = output.getvalue()
    if len(raw) > 3_000_000:
        raise Stop("EXPORT_LOG_LIMIT")
    print(json.dumps({"kind": "candidate_archive", "format": "tar.gz+base64",
                      "files": count, "sha256": digest(raw), "bytes": len(raw)}), flush=True)
    print("CANDIDATE_ARCHIVE_BEGIN", flush=True)
    encoded = base64.b64encode(raw).decode("ascii")
    for index in range(0, len(encoded), 4096):
        print(encoded[index:index + 4096], flush=True)
    print("CANDIDATE_ARCHIVE_END", flush=True)


def launch(args):
    if sys.platform != "linux" or os.geteuid() != 0:
        raise Stop("FRESH_LINUX_ROOT_REQUIRED")
    env = dict(os.environ)
    try:
        expiry = dt.datetime.fromisoformat(env.get("RUN_EXPIRES_UTC", "").replace("Z", "+00:00"))
    except ValueError:
        raise Stop("ABSOLUTE_UTC_EXPIRY_REQUIRED") from None
    if expiry.tzinfo is None or expiry.utcoffset() != dt.timedelta(0):
        raise Stop("ABSOLUTE_UTC_EXPIRY_REQUIRED")
    remaining = min(MAX_SECONDS, expiry.timestamp() - time.time())
    if remaining <= 0:
        raise Stop("APPROVAL_EXPIRED")
    launch_deadline = time.monotonic() + remaining
    control = trusted(args.control)
    binary = trusted(args.opencode, executable=True)
    brief_path = trusted(args.brief)
    browser_tools = trusted(args.browser_tools)
    browsers = trusted(args.browsers)
    node_runtime = trusted(args.node_runtime)
    trusted(node_runtime / "bin" / "node", executable=True)
    trusted(Path(__file__).resolve())
    if digest(binary.read_bytes()) != env.get("OPENCODE_BINARY_SHA256"):
        raise Stop("OPENCODE_BINARY_HASH_MISMATCH")
    brief = brief_path.read_bytes()
    screen(brief)
    if digest(brief) != env.get("APPROVED_PAYLOAD_SHA256"):
        raise Stop("PAYLOAD_HASH_MISMATCH")
    if digest(Path(__file__).read_bytes()) != env.get("APPROVED_PROXY_SHA256"):
        raise Stop("PROXY_HASH_MISMATCH")
    key = env.pop("OPENROUTER_KIMI_DESIGN", "")
    if not key:
        raise Stop("KEY_UNAVAILABLE")
    # The only long-lived credential holder is this trusted root process.
    os.environ.clear()
    env.clear()
    if ctypes.CDLL(None).prctl(4, 0, 0, 0, 0) != 0:  # PR_SET_DUMPABLE=0
        raise Stop("PROCESS_PRIVACY_UNAVAILABLE")
    if ctypes.CDLL(None).prctl(38, 1, 0, 0, 0) != 0:  # PR_SET_NO_NEW_PRIVS=1
        raise Stop("NO_NEW_PRIVILEGES_UNAVAILABLE")
    os.setgroups([])
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    workspace = Path(args.workspace)
    if not workspace.is_absolute() or workspace.exists():
        raise Stop("FRESH_WORKSPACE_REQUIRED")
    uid = 29071
    # No persistent login account, groups, sudo, SSH, or Git credential setup.
    try:
        import pwd
        pwd.getpwuid(uid)
        raise Stop("WORKER_UID_ALREADY_EXISTS")
    except KeyError:
        pass
    workspace.mkdir(mode=0o700, parents=False)
    os.chown(workspace, uid, uid)
    home = control / "worker-home"
    home.mkdir(mode=0o700)
    os.chown(home, uid, uid)
    # UID is not a sufficient file boundary. A mount/PID namespace hides the
    # host checkout, runner home, process environment and every controller file.
    namespace = ["/usr/bin/bwrap", "--unshare-user", "--unshare-pid", "--unshare-ipc", "--unshare-uts",
                 "--die-with-parent", "--new-session", "--clearenv", "--cap-drop", "ALL",
                 "--uid", str(uid), "--gid", str(uid),
                 "--ro-bind", "/usr", "/usr", "--ro-bind", "/bin", "/bin",
                 "--ro-bind", "/lib", "/lib", "--proc", "/proc", "--dev", "/dev",
                 "--tmpfs", "/tmp", "--dir", "/etc", "--dir", "/opt",
                 "--ro-bind", "/etc/resolv.conf", "/etc/resolv.conf",
                 "--ro-bind", "/etc/hosts", "/etc/hosts",
                 "--ro-bind", "/etc/ssl", "/etc/ssl",
                 "--bind", str(workspace), "/workspace",
                 "--bind", str(home), "/home/agent",
                 "--ro-bind", str(binary), "/opt/opencode",
                 "--ro-bind", str(node_runtime), "/opt/node",
                 "--ro-bind", str(browser_tools), "/opt/kimi-browser-tools",
                 "--ro-bind", str(browsers), "/opt/browsers"]
    if Path("/lib64").exists():
        namespace += ["--ro-bind", "/lib64", "/lib64"]
    # Drop the host identity before bwrap creates its user namespace. Otherwise
    # mapping root to the sandbox UID leaves sockets owned by host root and
    # defeats the host-UID peer check. subprocess applies these in its C child.
    worker_identity = {"user": uid, "group": uid, "extra_groups": []}
    passwd = control / "passwd"
    passwd.write_text(f"agent:x:{uid}:{uid}:Synthetic coding worker:/home/agent:/bin/bash\n")
    passwd.chmod(0o444)
    namespace += ["--ro-bind", str(passwd), "/etc/passwd"]
    worker_env = {"PATH": "/opt/node/bin:/usr/local/bin:/usr/bin:/bin", "HOME": "/home/agent",
                  "LANG": "C.UTF-8", "TERM": "dumb", "SHELL": "/bin/bash",
                  "NODE_PATH": "/opt/kimi-browser-tools/node_modules",
                  "PLAYWRIGHT_BROWSERS_PATH": "/opt/browsers",
                  "OPENCODE_CONFIG": "/etc/opencode.json", "OPENCODE_PURE": "1",
                  "OPENCODE_DISABLE_PROJECT_CONFIG": "1", "OPENCODE_DISABLE_MODELS_FETCH": "1",
                  "OPENCODE_DISABLE_AUTOUPDATE": "1", "OPENCODE_DISABLE_AUTOCOMPACT": "1",
                  "GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": "/dev/null",
                  "GIT_TERMINAL_PROMPT": "0", "CI": "1"}
    for name, value in worker_env.items():
        namespace += ["--setenv", name, value]
    namespace += ["--chdir", "/workspace"]
    # Native shell/editor access in the synthetic VM; other tool types denied.
    permission = {"*": "deny", "read": {"*": "allow", "*.env*": "deny"},
                  "edit": "allow", "glob": "allow", "grep": "allow",
                  "shell": {"*": "deny", **{prefix: "allow" for prefix in
                    ["pwd", "ls *", "rg *", "find *", "cat *", "mkdir *", "npm *",
                     "npx *", "node *", "python3 *", "printf *", "cd *", "test *", "sleep *"]}},
                  "task": "deny", "webfetch": "deny", "websearch": "deny",
                  "external_directory": "deny", "doom_loop": "deny"}
    controller = BudgetProxy(Transport(key), launch_deadline,
                             control / "usage-receipt.json")
    controller.last_attestation = controller.transport.attest(min(15, remaining))
    server = SafeHTTPServer(("127.0.0.1", 0), ProxyHandler)
    server.daemon_threads = True
    server.controller = controller
    server.allowed_uid = uid
    port = server.server_address[1]
    config = {"$schema": "https://opencode.ai/config.json", "model": "bounded/candidate",
              "small_model": "bounded/candidate", "default_agent": "build",
              "enabled_providers": ["bounded"], "autoupdate": False,
              "share": "disabled", "snapshot": False, "plugin": [],
              "lsp": False, "formatter": False, "compaction": {"auto": False},
              "permission": permission,
              "agent": {"title": {"disable": True}, "summary": {"disable": True},
                        "compaction": {"disable": True}, "explore": {"disable": True},
                        "general": {"disable": True}, "build": {"steps": MAX_REQUESTS}},
              "provider": {"bounded": {"npm": "@ai-sdk/openai-compatible", "name": "Bounded local route",
                  "options": {"baseURL": f"http://127.0.0.1:{port}/v1", "apiKey": "local-proxy-no-secret",
                              "timeout": 95000, "headerTimeout": 95000},
                  "models": {ALIAS: {"name": "Design worker", "tool_call": True,
                                     "limit": {"context": 200000, "output": MAX_OUTPUT}}}}}}
    config_path = control / "opencode.json"
    config_path.write_bytes(canonical(config))
    config_path.chmod(0o444)
    namespace += ["--ro-bind", str(config_path), "/etc/opencode.json"]
    # Reject access to the proxy from every UID except the isolated worker.
    firewall = ["/usr/sbin/iptables", "-w", "-A", "OUTPUT", "-p", "tcp", "-d", "127.0.0.1",
                "--dport", str(port), "-m", "owner", "!", "--uid-owner", str(uid), "-j", "REJECT"]
    command(firewall, failure="PROXY_OWNER_FIREWALL_PREFLIGHT_FAILED")
    threading.Thread(target=server.serve_forever, daemon=True).start()
    worker = None
    try:
        # Verify UID, no capabilities and absence of the controller environment
        # from inside the exact same namespace before invoking the coding agent.
        probe = "import os; assert os.geteuid()==29071; assert not os.getgroups(); assert not os.path.exists('/root'); assert not os.path.exists('/opt/control'); assert 'OPENROUTER_KIMI_DESIGN' not in os.environ; status=dict(line.split(':',1) for line in open('/proc/self/status').read().splitlines()); assert int(status['CapEff'].strip(),16)==0; assert status['NoNewPrivs'].strip()=='1'; print('ISOLATION_OK')"
        command(namespace + ["/usr/bin/python3", "-c", probe],
                failure="ISOLATION_IDENTITY_PREFLIGHT_FAILED", **worker_identity)
        # GET is always denied without calling the model. Its exact 404 proves
        # the worker also passes the host socket-owner check and firewall.
        peer_probe = ("import urllib.request,urllib.error,json; "
                      "opener=urllib.request.build_opener(urllib.request.ProxyHandler({})); "
                      "\ntry: opener.open('http://127.0.0.1:" + str(port) + "/identity-probe',timeout=5)"
                      "\nexcept urllib.error.HTTPError as e: "
                      "assert e.code==404 and json.load(e)['error']['code']=='ENDPOINT_DENIED'"
                      "\nelse: raise AssertionError('unexpected probe success')")
        command(namespace + ["/usr/bin/python3", "-c", peer_probe], timeout=8,
                failure="HOST_SOCKET_OWNER_PREFLIGHT_FAILED", **worker_identity)
        browser_probe = "const {chromium}=require('playwright'); (async()=>{const b=await chromium.launch({headless:true});const p=await b.newPage();await p.setContent('<h1>Browser ready</h1>');if(await p.locator('h1').innerText()!=='Browser ready')throw Error('probe');await b.close();})().catch(()=>process.exit(1));"
        command(namespace + ["/opt/node/bin/node", "-e", browser_probe], timeout=45,
                failure="BROWSER_STARTUP_PREFLIGHT_FAILED", **worker_identity)
        version = subprocess.run(namespace + ["/opt/opencode", "--version"],
                                 capture_output=True, timeout=20, **worker_identity)
        if version.returncode or version.stdout.decode().strip() != OPENCODE_VERSION:
            raise Stop("OPENCODE_VERSION_MISMATCH")
        if time.monotonic() >= launch_deadline:
            raise Stop("APPROVAL_EXPIRED")
        if args.preflight_only:
            print(json.dumps({"kind": "isolation_preflight_ok", "host_uid": uid,
                              "sandbox_uid": uid, "browser_dom": "pass",
                              "client_version": OPENCODE_VERSION,
                              "model_requests": 0}), flush=True)
            return
        # Root-only raw output is drained and discarded, never logged or archived.
        worker = subprocess.Popen(namespace + ["/opt/opencode", "run", "--format", "json",
                                  "--model", "bounded/candidate", "--agent", "build", brief.decode()],
                                  stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                                  stderr=subprocess.DEVNULL, env={}, start_new_session=True,
                                  **worker_identity)
        while worker.poll() is None:
            if time.monotonic() >= controller.deadline or controller.stopped:
                os.killpg(worker.pid, signal.SIGTERM)
                try:
                    worker.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    os.killpg(worker.pid, signal.SIGKILL)
                    worker.wait()
                break
            time.sleep(.2)
        controller.persist()
    finally:
        if worker and worker.poll() is None:
            os.killpg(worker.pid, signal.SIGKILL)
            worker.wait()
        server.shutdown()
        server.server_close()
        delete_firewall = firewall[:]
        delete_firewall[2] = "-D"
        cleanup_failure = None
        try:
            command(delete_firewall, failure="PROXY_OWNER_FIREWALL_CLEANUP_FAILED")
        except Stop as exc:
            cleanup_failure = str(exc)
            controller.stopped = controller.stopped or cleanup_failure
        controller.persist()
        # Preserve compliant partial source even when budget/deadline stops work.
        try:
            if not args.preflight_only:
                emit_bundle(workspace, key)
        except Stop as exc:
            print(json.dumps({"kind": "export_blocked", "code": str(exc)}), flush=True)
        except Exception:
            print(json.dumps({"kind": "export_blocked", "code": "EXPORT_SCREEN_OR_IO_FAILURE"}), flush=True)
        finally:
            if not args.preflight_only:
                print(json.dumps({"kind": "usage_receipt", "receipt": controller.snapshot()}), flush=True)
        if cleanup_failure:
            raise Stop(cleanup_failure)


class SyntheticTests(unittest.TestCase):
    """All upstream HTTP is synthetic loopback. Never reads a real credential."""
    @classmethod
    def setUpClass(cls):
        cls.calls = []
        cls.mode = "normal"

        class Mock(BaseHTTPRequestHandler):
            def log_message(self, *_):
                pass

            def do_GET(self):
                if self.path == "/models":
                    self.respond({"data": [{"id": MODEL, "reasoning": {"mandatory": cls.mode == "mandatory", "supported_efforts": ["none", "low"]}}]})
                    return
                row = {"tag": ENDPOINT, "status": 0, "max_completion_tokens": MAX_OUTPUT,
                       "supported_parameters": ["max_tokens", "tools", "tool_choice", "reasoning", "reasoning_effort"],
                       "pricing": {"prompt": str(INPUT_RATE), "completion": str(OUTPUT_RATE),
                                   "input_cache_read": "0.00000021", "discount": 0}}
                if cls.mode == "price":
                    row["pricing"]["prompt"] = "99"
                self.respond({"data": {"endpoints": [row]}})

            def do_POST(self):
                payload = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
                cls.calls.append(payload)
                if cls.mode == "timeout":
                    time.sleep(.15)
                message = {"role": "assistant", "content": "synthetic result", "reasoning": "NOT_FOR_RETURN"}
                finish = "stop"
                if cls.mode == "tools":
                    message = {"role": "assistant", "content": None, "tool_calls": [
                        {"id": "call_1", "type": "function", "function": {"name": "shell", "arguments": json.dumps({"command": "node -e \"console.log(1)\"", "description": "synthetic " * 60})}},
                        {"id": "call_2", "type": "function", "function": {"name": "read", "arguments": '{"filePath":"/workspace/index.html"}'}}]}
                    finish = "tool_calls"
                usage = {"prompt_tokens": 100, "completion_tokens": 40, "cost": .0005}
                if cls.mode == "unknown":
                    usage.pop("cost")
                if cls.mode == "overage":
                    usage["cost"] = .2
                if cls.mode == "reasoning":
                    usage["completion_tokens_details"] = {"reasoning_tokens": 1}
                self.respond({"model": MODEL, "provider": "InferenceNet", "usage": usage,
                              "choices": [{"message": message, "finish_reason": finish}]})

            def respond(self, value):
                raw = canonical(value)
                try:
                    self.send_response(200)
                    self.send_header("Content-Length", str(len(raw)))
                    self.end_headers()
                    self.wfile.write(raw)
                except (BrokenPipeError, ConnectionResetError):
                    pass

        cls.mock = SafeHTTPServer(("127.0.0.1", 0), Mock)
        cls.mock.daemon_threads = True
        threading.Thread(target=cls.mock.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.mock.shutdown()
        cls.mock.server_close()

    def setUp(self):
        type(self).mode = "normal"
        type(self).calls.clear()
        self.controller = BudgetProxy(Transport("synthetic-key", f"http://127.0.0.1:{self.mock.server_address[1]}", .05))
        self.body = {"model": ALIAS, "messages": [{"role": "user", "content": "Build a synthetic page."}], "stream": True}

    def request(self):
        return self.controller.request(canonical(self.body))

    def test_normal_settlement_and_no_reasoning(self):
        response, streaming = self.request()
        self.assertTrue(streaming)
        self.assertEqual(self.controller.charged, Decimal("0.0005"))
        self.assertEqual(self.controller.held, 0)
        self.assertNotIn("NOT_FOR_RETURN", b"".join(sse_frames(response)).decode())
        self.assertEqual(self.calls[0]["provider"]["only"], [ENDPOINT])
        self.assertFalse(self.calls[0]["provider"]["allow_fallbacks"])
        self.assertEqual(self.calls[0]["provider"]["data_collection"], "deny")

    def test_native_tool_sse_roundtrip(self):
        type(self).mode = "tools"
        self.body["tools"] = [{"type": "function", "function": {"name": name, "parameters": {"type": "object"}}} for name in ("shell", "read")]
        response, _ = self.request()
        events = [json.loads(frame[6:]) for frame in b"".join(sse_frames(response)).decode().split("\n\n") if frame.startswith("data: {")]
        accumulated = {0: "", 1: ""}
        for event in events:
            for choice in event["choices"]:
                for call in choice["delta"].get("tool_calls", []):
                    accumulated[call["index"]] += call["function"].get("arguments", "")
        self.assertEqual(json.loads(accumulated[0])["command"], 'node -e "console.log(1)"')
        self.assertEqual(json.loads(accumulated[1])["filePath"], "/workspace/index.html")
        self.assertEqual(events[-2]["choices"][0]["finish_reason"], "tool_calls")

    def test_model_and_option_rejection(self):
        self.body["model"] = "other/model"
        with self.assertRaisesRegex(Stop, "MODEL_DENIED"):
            self.request()
        self.assertEqual(self.calls, [])

    def test_budget_exhaustion(self):
        self.controller.charged = Decimal(".099")
        with self.assertRaisesRegex(Stop, "BUDGET_EXHAUSTED"):
            self.request()
        self.assertEqual(self.calls, [])

    def test_output_shrinks_to_remaining(self):
        self.controller.charged = Decimal(".05")
        self.request()
        self.assertLess(self.calls[0]["max_tokens"], MAX_OUTPUT)
        self.assertLessEqual(Decimal(self.controller.attempts[0]["reserved_usd"]) + Decimal(".05"), BUDGET)

    def test_identity_probe_get_never_dispatches_model(self):
        server = SafeHTTPServer(("127.0.0.1", 0), ProxyHandler)
        server.controller = self.controller
        threading.Thread(target=server.serve_forever, daemon=True).start()
        try:
            client = http.client.HTTPConnection("127.0.0.1", server.server_address[1], timeout=3)
            client.request("GET", "/identity-probe")
            response = client.getresponse()
            self.assertEqual(response.status, 404)
            self.assertEqual(json.loads(response.read())["error"]["code"], "ENDPOINT_DENIED")
            self.assertEqual(self.calls, [])
            self.assertEqual(self.controller.attempts, [])
            client.close()
        finally:
            server.shutdown()
            server.server_close()

    def test_actual_child_identity_probe_parses_kernel_tabs(self):
        import ast
        from unittest.mock import patch
        tree = ast.parse(Path(__file__).read_text())
        function = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == "launch")
        assignment = next(node for node in ast.walk(function) if isinstance(node, ast.Assign)
                          and any(isinstance(target, ast.Name) and target.id == "probe" for target in node.targets))
        child_code = ast.literal_eval(assignment.value)
        def run_probe(caps, no_new_privs):
            status = f"Name:\tpython3\nCapEff:\t{caps}\nNoNewPrivs:\t{no_new_privs}\n"
            with patch("os.geteuid", return_value=29071), patch("os.getgroups", return_value=[]), \
                 patch("os.path.exists", return_value=False), patch.dict(os.environ, {}, clear=True), \
                 patch("builtins.open", return_value=io.StringIO(status)), contextlib.redirect_stdout(io.StringIO()):
                exec(child_code, {})
        run_probe("0000000000000000", "1")
        with self.assertRaises(AssertionError):
            run_probe("0000000000000001", "1")
        with self.assertRaises(AssertionError):
            run_probe("0000000000000000", "0")

    def test_duplicate_request_cannot_evade_guard_when_budget_shrinks(self):
        self.controller.charged = Decimal(".05")
        self.request()
        with self.assertRaisesRegex(Stop, "DUPLICATE_REQUEST_RETRY_DENIED"):
            self.request()
        self.assertEqual(len(self.calls), 1)

    def test_timeout_keeps_reservation_and_zero_retries(self):
        type(self).mode = "timeout"
        with self.assertRaises(Stop):
            self.request()
        self.assertGreater(self.controller.held, 0)
        self.assertEqual(self.controller.attempts[0]["state"], "unknown_reserved")
        with self.assertRaises(Stop):
            self.request()
        self.assertEqual(len(self.calls), 1)

    def test_unknown_cost_is_not_free(self):
        type(self).mode = "unknown"
        with self.assertRaises(Stop):
            self.request()
        self.assertGreater(self.controller.held, 0)

    def test_actual_overage_is_recorded(self):
        type(self).mode = "overage"
        with self.assertRaisesRegex(Stop, "ACTUAL_OVERAGE"):
            self.request()
        self.assertEqual(self.controller.charged, Decimal("0.2"))
        self.assertEqual(self.controller.held, 0)

    def test_price_change_blocks_dispatch(self):
        type(self).mode = "price"
        with self.assertRaisesRegex(Stop, "PRICE_CHANGED"):
            self.request()
        self.assertEqual(self.calls, [])

    def test_mandatory_reasoning_blocks_dispatch(self):
        type(self).mode = "mandatory"
        with self.assertRaisesRegex(Stop, "GATEWAY_REASONING_DISABLE_UNVERIFIED"):
            self.request()
        self.assertEqual(self.calls, [])

    def test_nonzero_reasoning_stops_with_actual_cost(self):
        type(self).mode = "reasoning"
        with self.assertRaisesRegex(Stop, "REASONING_DISABLE_NOT_HONOURED"):
            self.request()
        self.assertEqual(self.controller.charged, Decimal(".0005"))

    def test_identical_request_is_not_retried(self):
        self.request()
        with self.assertRaisesRegex(Stop, "DUPLICATE_REQUEST_RETRY_DENIED"):
            self.request()
        self.assertEqual(len(self.calls), 1)

    def test_nested_candidate_export_contains_real_deliverables(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory) / "design-candidate"
            (base / "screenshots").mkdir(parents=True)
            for name, content in {"index.html": "<h1>Synthetic candidate</h1>",
                                  "styles.css": "body { color: navy; }", "app.js": "console.log(1);",
                                  "VERIFICATION.md": "Synthetic build and browser receipt."}.items():
                (base / name).write_text(content)
            (base / "screenshots" / "desktop.png").write_bytes(b"\x89PNG\r\n\x1a\n" + b"synthetic fixture")
            (base / "node_modules").mkdir()
            (base / "node_modules" / "ignored.js").write_text("excluded dependency")
            captured = io.StringIO()
            with contextlib.redirect_stdout(captured):
                emit_bundle(directory, "synthetic-key")
            lines = captured.getvalue().splitlines()
            raw = base64.b64decode("".join(lines[2:-1]))
            self.assertEqual(digest(raw), json.loads(lines[0])["sha256"])
            with tarfile.open(fileobj=io.BytesIO(raw), mode="r:gz") as archive:
                self.assertEqual(set(archive.getnames()), {"index.html", "styles.css", "app.js", "VERIFICATION.md", "screenshots/desktop.png"})

    def test_empty_export_and_symlink_candidate_fail_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(Stop, "EXPORT_EMPTY"):
                emit_bundle(directory, "synthetic-key")
            (Path(directory) / "design-candidate").symlink_to(Path(directory), target_is_directory=True)
            with self.assertRaisesRegex(Stop, "EXPORT_ROOT_INVALID"):
                emit_bundle(directory, "synthetic-key")

    def test_deadline_and_request_limit(self):
        self.controller.deadline = time.monotonic() - 1
        with self.assertRaisesRegex(Stop, "DEADLINE"):
            self.request()
        self.controller = BudgetProxy(self.controller.transport)
        self.controller.attempts = [{"attempt": i} for i in range(MAX_REQUESTS)]
        with self.assertRaisesRegex(Stop, "REQUEST_LIMIT"):
            self.request()
        self.assertEqual(self.calls, [])

    def test_complete_request_secret_guard(self):
        self.body["messages"].append({"role": "tool", "tool_call_id": "sample", "content": "synthetic-key"})
        with self.assertRaisesRegex(Stop, "SECRET_DETECTED"):
            self.request()
        self.assertEqual(self.calls, [])

    def test_http_endpoints_and_stream(self):
        server = SafeHTTPServer(("127.0.0.1", 0), ProxyHandler)
        server.controller = self.controller
        threading.Thread(target=server.serve_forever, daemon=True).start()
        try:
            client = http.client.HTTPConnection("127.0.0.1", server.server_address[1], timeout=3)
            client.request("GET", "/v1/models")
            self.assertEqual(client.getresponse().status, 404)
            client.close()
            client = http.client.HTTPConnection("127.0.0.1", server.server_address[1], timeout=3)
            client.request("POST", "/v1/chat/completions", canonical(self.body), {"Content-Type": "application/json"})
            result = client.getresponse()
            self.assertEqual(result.status, 200)
            self.assertEqual(result.getheader("Content-Type"), "text/event-stream")
            self.assertTrue(result.read().endswith(b"data: [DONE]\n\n"))
            client.close()
        finally:
            server.shutdown()
            server.server_close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test", action="store_true")
    sub = parser.add_subparsers(dest="action")
    run = sub.add_parser("launch", help="Linux cloud launch; exact hashes/expiry and live metadata required")
    run.add_argument("--preflight-only", action="store_true",
                     help="Test isolation, browser DOM and client version without starting a model worker")
    for name in ("workspace", "brief", "control", "opencode", "browser-tools", "browsers", "node-runtime"):
        run.add_argument("--" + name, required=True)
    args = parser.parse_args()
    if args.self_test:
        suite = unittest.defaultTestLoader.loadTestsFromTestCase(SyntheticTests)
        result = unittest.TextTestRunner(verbosity=2).run(suite)
        return 0 if result.wasSuccessful() else 1
    if args.action == "launch":
        try:
            launch(args)
        except Stop as exc:
            print(json.dumps({"status": "blocked", "code": str(exc)}), flush=True)
            return 2
        except Exception:
            print(json.dumps({"status": "blocked", "code": "CONTROLLER_PREFLIGHT_OR_RUNTIME_FAILURE"}), flush=True)
            return 2
    else:
        parser.print_help()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
