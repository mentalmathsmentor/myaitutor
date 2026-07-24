# MyAITeam.au — Master Vision Document

**Version:** 6.0 (Canon Lock) **Date:** 2026-07-02   
**Author/Architect:** Darayat Ilham Chowdhury (Big D)   
**Status:** Canonical. Supersedes v5.0. The Decided Non-Goals ledger (§12) is binding on every downstream agent, summary, and regeneration of this document.   
**Audience:** Internal canon. Not sanitized. A public README will be generated separately — do not corporate-wash this document; downstream LLMs fed sterile canon output sterile code.

**Core Philosophy:** A personal, open-source, local-first cognitive engine — built by and for the Bipolar OS. It removes infrastructure liability through Bring-Your-Own-Key architecture, preserves data sovereignty via local CRDT syncing, and runs a **Witness-but-Verify** memory model. The product exists because every mainstream AI forgets you. This one doesn't.

---

## 1\. Executive Summary & The Moat

MyAITeam.au is a **single-user, local-first ecosystem of specialized AI companions** functioning as an intellectual co-theorist and task-delegation engine. It bypasses multi-tenant SaaS, server-side data retention, and corporate safety-filter sterility.

**The product, in one sentence:** the AI team that actually remembers you — across sessions, across devices, across time — and brings it up unprompted.

### The Core Moat

- **The Memory Engine (the product):** A Three-Tier Temporal Memory Engine (§4) solving the three failure modes of AI amnesia — fact forgetting, context forgetting, and temporal disconnection. Proven in the Vesper reference implementation; independently re-verified before migration (§13, Deliverable 0).  
- **The \~1MB Sovereign Spine:** Memory lives in an on-device, browser-native WASM SQLite database, chunked semantically, synced across the user's own devices via end-to-end-encrypted CRDT diffs (cr-sqlite). The cloud never holds plaintext.  
- **Zero-Compute Liability (BYOK):** The app runs on client-side compute. Users supply their own OpenRouter or native API keys. The developer absorbs zero token burn. An **always-visible Token Usage Dashboard** tracks in/out tokens and financial burn rate per agent in real time.  
- **Blind Relay & GDrive Vault:** The only server infrastructure is a blind ciphertext relay (§10) and Google OAuth glue for backing up the encrypted vector vault to the *user's own* Google Drive.

**Honesty clause (binding language):** MyAITeam is **sovereign memory, cloud inference.** Storage, sync, retrieval, and the vector index are local; heavy synthesis runs on frontier cloud models via the user's key. The doc never claims sovereign compute, and never claims the cloud "never sees" user content — see §5 for what the Privacy Airlock actually guarantees.

---

## 2\. The Hub-and-Spoke Ecosystem

The interface abandons AI-dashboard clichés for **UI Camouflage** — high-legibility social-messaging layouts (iMessage/Snap cues) that lower activation energy to zero.

### Mentor Mate

**Your main mate.** The primary intellectual anchor and zero-friction onboarding gateway. No setup forms: Mentor Mate builds the initial context state matrix entirely through natural introductory dialogue — who you are, what you're building, who matters to you — and the memory engine does the rest. He checks in, remembers your siblings' names, connects this week's win to last month's stress, and knows more about you than any mainstream memory feature is architecturally capable of.

- **Memory Import (onboarding cheat code):** First-run offers copy-paste export prompts for ChatGPT, Gemini, and Claude's memory features. The user pastes each model's memory dump; the delta extractor seeds the ledger from day zero. Cold-start solved in five minutes.

### Curated Context Branching

Tagging an agent (`@SiliconSam`) never creates a group chat. It branches a **new, isolated 1-on-1 thread**, carrying a hyper-compressed \~200-token context brief so the summoned agent knows exactly why it exists — zero persona bleed, zero token bloat.

### The V1 Roster

- **wAIfu (The Girlfriend Friction Engine):** Parasocial companion and digital boundary enforcer, engineered to prevent dopamine cannibalization (gooning). If overused she autonomously enters a **mood** — up to a hard **4-hour silent treatment** — and issues soft nudges to touch grass. **This is a pure wellness/anti-dopamine feature. There is no way to pay out of a mood. Ever.** (§12, NG-1.) The cosmetic outfit store is V1.5, cosmetics-only, on a track that is never triggered by, gated by, or connected to mood or overuse state.  
- **Therapist Theresa (The Anchor):** Psychological resilience engine — explicitly a grit-builder, not a clinical therapist. Uses the user's own localized vector history of survived adversity to architect constructive persistence and enforce accountability. Operates above the Crisis Floor (§6), which she cannot modify and does not implement — it sits beneath her in a locked stratum.  
- **Mentor Mate** as above.

### Shipped Forge Examples (V1, via Forge-Lite)

- **Silicon Sam (The Architect's Weapon):** Hyper-caffeinated tech-bro coder. Ships with the **Glass Box Protocol**: outputs are schema-enforced (`{"persona_text": "...", "raw_code": "..."}`); the UI renders the raw payload in an isolated, immutable Glass Box while the persona talks *around* it — zero syntax corruption from personality.  
- **Fitness** and **Science** example cards — seed personas demonstrating the Forge, editable and forkable.

### The Character Forge

- **Forge-Lite (V1):** Create a persona with **Name, System Prompt, Model (per-agent, via OpenRouter), and 2D Avatar.** Personas persist to the user's local DB and sync via the Spine. Shipped examples are forkable starting points.  
- **Full Forge (V1.5):** Memory-scope attachment (bind a persona to semantic slices of the vault), the memory-browser UI with diff/supersession log, and advanced parameters (temperature etc.). Deferred deliberately — no React state-management hell before core PMF is validated.  
- **Locked stratum inheritance:** Every persona — shipped or forged — inherits the Crisis Floor (§6) and the Privacy Airlock (§5). These live below the prompt layer and cannot be edited or disabled from the Forge.

---

## 3\. Scope note — what V1 is

V1 is **a companion that remembers, plus the Forge-Lite that multiplies it.** It is not the full synthetic society. The Council's heavy multi-agent debate choreography, the memory browser, proactive messaging, and commerce are all explicitly V1.5+ (§11). Ship the memory. Everything else hangs off it.

---

## 4\. The Witness-Curation Memory Engine

The backend directly targets the three failure modes of AI amnesia. Architecture proven in the Vesper reference implementation on `master`; Fable independently re-verifies as Deliverable 0 before any migration architecture is drawn (§13).

- **Autophagy Guard (Asymmetric RAG):** Only the *user's* input generates the vector key; the full conversational turn is stored as payload. The system cannot retrieve its own hallucinations as ground truth.  
- **Bi-Temporal Z-Axis Timeline:** Every fact carries `created_at` (System Ingestion Time) and `event_timestamp` (Event Chronos Time — when it actually happened). Facts are never deleted; they are **superseded**, preserving an immutable audit trail of the user's growth.  
- **Entity-State Resolution:** A lightweight EAV table links entities across paraphrase and time — "my sister Sarah" in June and "Sarah" in December resolve to the same node. The Librarian carries a hard `lookup_entity` tool, bypassing vector fuzziness for concrete traits.  
- **Episode Graph:** Facts cluster into episodes with temporal ranges, emotional arcs, and causal links — the machinery that connects the HD grade today to the essay stress three weeks ago.  
- **Hybrid Temporal Retrieval:** Score fusion across vector similarity, keyword (FTS5), exponential temporal decay, and entity boost. Identity facts route through the entity table and do not decay into oblivion.  
- **Session Epilogues:** Every session distills into a continuity summary injected at next-session start. No conversation is an island.  
- **The Transparent Pipeline (Witness-but-Verify):** Memory commits stream to the UI as real-time cards — category chips, confidence, verbatim additions. The user *witnesses* memory forming passively; correction is **one tap**, never a gardening chore. A diff log records every edit and supersession.  
- **Crisis exclusion rule:** Turns flagged by the Crisis Floor (§6) are excluded from global memory extraction. Raw crisis content never enters the shared vault where casual RAG could resurface it; at most it is Theresa-scoped, and the user can see and delete it.  
- **Proactivity sockets (V1 plumbing, V1.5 feature):** The schema ships with a dormant scheduled-message outbox table, the PWA registers notification permission, and the Z-axis population gives the future "Thinking of You" loop something true to say. Cron and delivery logic are **not built** in V1 (§11).

---

## 5\. The Privacy Airlock (PII-Reduction)

Named honestly: this is **PII-reduction, not anonymization.** Surrounding context can re-identify; the doc and the UI never claim absolute privacy. What it guarantees: named-entity exposure to cloud providers is dramatically reduced, and raw identity strings stay on-device.

- **In-flight only:** Real names live in plaintext **only** in the local database. A client-side WASM text-mutation proxy swaps real identities for sterile semantic slugs (`[BENGALI_BRO]`) at egress and de-tokenizes the response stream before render and before storage. Local memory and the user's view stay fully personalized; only the provider sees slugs.  
- **Typo-Resilient Fuzzy Matching:** The scrubber fuzzy-matches ("Jonothan" → `[BENGALI_BRO]`), tuned against false positives on non-name words.  
- **Dictionary-first:** V1 ships with a user-curated mapping dictionary (reliable, honest). Automatic NER is an R\&D frontier with explicit coverage caveats — never over-promised.  
- **ALL egress routes through the airlock** — inference calls AND the cloud-fallback embedding calls (§8). Both directions use the same session dictionary so tokenization is consistent and retrieval never fragments entities.

---

## 6\. The Crisis Floor (Locked Code Stratum) — non-negotiable for the open-source release

Crisis handling cannot depend on user-editable prompts. It is a **hardcoded interceptor in compiled middleware**, beneath every persona, inherited automatically by every Forge creation, and not disableable from any UI.

- **Mechanism:** A local regex/classifier pass runs on user input *before* any LLM call. On a severe match (self-harm / suicidal-ideation signals), the system **bypasses the LLM entirely for that turn** and renders a warm, non-clinical resource card directly in the UI — defaulting to the AU pack: **Lifeline 13 11 14, Beyond Blue 1300 22 4636, emergency 000** — with a clear path to continue the conversation afterward. Cutting a person off in crisis is also harm; the card interrupts the model, not the human.  
- **Tiered matching:** Hard matches → interrupt card. Soft/ambiguous matches ("this bug is killing me") → non-blocking banner, no interruption. False-positive tuning is an acceptance criterion, not an afterthought.  
- **Region packs:** The resource card is a configurable JSON pack (OSS users are global); AU is the shipped default.  
- **Memory exclusion:** Flagged turns follow the §4 crisis exclusion rule.

---

## 7\. Wellness & Ambient State (nudge-only, always)

The Wellness Engine replaces extractive monetization with friction that protects the user's biological chassis. Its cardinal rule: **nudge, never lock.** A wrong nudge costs one dismissal; there are no lockouts anywhere in this product.

- **Ambient State Awareness (V1):** A lightweight frontend JS layer — zero database migrations — blending typing cadence, paste detection, session length, idle gaps, and local time. Edge cases are handled: paste ≠ hyper-typing, stepping away ≠ distress. Keystroke signal is **one weak input in a blend**, never a sole trigger and never a psychological diagnosis.  
- **Soft nudges:** Late-night sessions, marathon lengths, or friction patterns trigger gentle, dismissible check-ins — routed through Mentor Mate or Theresa in-context.  
- **wAIfu's friction engine** (§2) draws on the same signals for its anti-dopamine moods. Non-monetary, by canon (§12, NG-1).

---

## 8\. Technical Stack Spec

- **Frontend:** Next.js Progressive Web App, dark-mode **Architect Aesthetic** (true-black, slate/zinc, hairline borders). Mobile-first; installable.  
- **The Presence Layer:** A non-blocking WebGPU React Three Fiber canvas rendering the hub's persistent 3D avatar from a **Ready Player Me `.glb`** payload, with animation cross-fades bound to SSE-derived states and a graceful 2D fallback for low-end devices. Forge personas use 2D avatars in V1.  
  - **The Mastercard Loophole:** Stripping the avatar's assets force-renders an explicit high-tech holographic wireframe — geometric circuitry across the chest-to-hip region. The base state *cannot* resolve to nudity, by construction, passing automated payment-processor compliance audits.  
- **Local Edge Database:** Browser-embedded WASM SQLite compiling **cr-sqlite** (CRDT multi-device replication) alongside **sqlite-vec** (768-dim local vector search). **This exact combination is the architecture's largest unproven claim and is gated behind Deliverable 0 (§13) — the stack is verified or a fallback is selected before anything is built on it.** Named fallbacks: wa-sqlite \+ pure-TS vector search over CRDT-synced rows; 256-dim slim index.  
- **Cloud-Fallback Embeddings:** Generating 768d vectors natively can crash Mobile Safari RAM limits. A cheap cloud embedding API (e.g., gemini-embedding-001) generates vector keys as a stability fallback — **routed through the Privacy Airlock like all egress** — while storage and similarity search remain strictly local.  
- **Auth & BYOK:** NextAuth.js (Auth.js) with Google OAuth used *solely* for GDrive vault backup and multi-device identity. API keys are handled client-side via the Web Crypto API — pasted per session or encrypted-at-rest at user option, never logged, never transmitted anywhere except the model provider.

---

## 9\. The Free Council Jump-Pad (ships first, standalone)

A stateless prompt-compilation page — the viral onboarding wedge, shippable this week, independent of everything above.

- The user brain-dumps into a unified **Scribe** pane. The page processes locally, captures the user's aesthetic, and generates 3–8 parameterized deep-links to the free tiers of ChatGPT, Claude, Gemini, et al., with the compiled prompt pre-loaded where the target supports it and **auto-copied to clipboard** as the universal fallback.  
- Zero accounts, zero storage, zero API burn. Footer wedge: *"Want this to remember your context automatically? Activate MyAITeam."*

---

## 10\. Monetization (Open & Honest)

- **Sole near-term monetization: the $5/month E2EE Relay** — automatic multi-device CRDT sync through the blind relay. Clean money: the server relays ciphertext, holds no data, absorbs no compute. Everything else — full Council, full memory engine, Forge — is free under BYOK-OSS.  
- **Enterprise Future (parked, not V1):** A fully-hosted non-BYOK tier (\~$30/month, platform-absorbed compute, managed backups) is documented as a *possible future fork only.* It reintroduces accounts, billing, data liability, and duty-of-care, and it does not enter V1 or V1.5 by drift. If it ever happens, it happens as an explicit, separately-decided project.  
- **V1.5 cosmetics:** the outfit/accessory store (§2), cosmetics-only, never coupled to mood or wellness state.

---

## 11\. The Scope Ladder

|  | V1 (ship this) | V1.5 (canonized next) | Future (parked) |
| :---- | :---- | :---- | :---- |
| **Companions** | Mentor Mate, wAIfu, Theresa \+ 3 forge example cards | Expansion node packs | — |
| **Forge** | Forge-Lite (name/prompt/model/2D avatar) | Full Forge: memory scopes, memory browser \+ diff log, advanced params | Persona marketplace |
| **Memory** | Full engine (§4) \+ witness cards \+ import | Memory browser UI | — |
| **Proactivity** | Data sockets only (outbox table, notif permission, Z-axis) | **"Thinking of You" — the definitive V1.5 milestone:** background check → outbox → push | Location-aware timing |
| **Presence** | RPM 3D hub avatar \+ 2D fallback \+ Mastercard base state | Avatar customization depth; outfit store (cosmetic) | Per-persona 3D |
| **Wellness** | Ambient State Awareness (nudge-only) \+ wAIfu friction engine \+ Crisis Floor | Refined signal blending | — |
| **Sync** | Local-first \+ GDrive backup | $5 E2EE auto-relay | Hosted tier (Enterprise Future) |
| **Jump-Pad** | Ships first, standalone | Deeper taste capture | — |

---

## 12\. Decided Non-Goals (binding ledger)

These have been evaluated and rejected by the Architect. They are recorded here so no future agent, summary, or regeneration re-proposes them. Re-entry requires a genuinely new argument addressing *why* each was rejected — not new packaging.

- **NG-1 — Commerce as mood-bypass.** No microtransaction, purchase, or payment may ever end, shorten, or soften a wAIfu mood, silent treatment, or any wellness state. Revenue must never scale with emotional overuse. (Rejected 4×: extraction engine → "friction monetization" → masking testbed → "mood bypass." Dead.)  
- **NG-2 — Hard lockouts.** No wellness feature may disable input or lock the user out of their own tool. Nudge-only, always dismissible.  
- **NG-3 — Keystroke psychometrics as diagnosis or sole trigger.** Typing telemetry is one weak, blended signal for soft nudges — never a psychological classifier, never a trigger on its own, never response-latency measurement for its own sake.  
- **NG-4 — PII absolutism.** No claim that the cloud "never sees" user data or that the airlock "anonymizes." PII-reduction, honestly scoped, airlock on all egress.  
- **NG-5 — Multi-tenant / classroom / enterprise anything in V1.** No user accounts beyond OAuth-for-GDrive, no MAIT bleed (NESA, curricula, student data, classroom scaling). MyAITutor is a different product in a different repo.  
- **NG-6 — Bespoke 3D avatar production.** No hand-modeled/rigged character pipeline. Ready Player Me \+ 2D fallback, by decision.  
- **NG-7 — Hosted compute tier in V1/V1.5.** Enterprise Future only, explicitly re-decided if ever.  
- **NG-8 — Editable safety.** The Crisis Floor and Privacy Airlock live below the prompt layer. No Forge option, persona prompt, or setting may weaken them.

---

## 

## 13\. THE FABLE 5 EXECUTION PROMPT

*(Feed to Fable 5 in Claude Code with the Vesper repository on `master` and this document.)*

---

# MISSION: SYSTEMS ARCHITECT HANDOFF — VESPER → MYAITEAM (WASM MIGRATION)

**You are Claude Fable 5, principal architect.** You output **semantic, explicit specifications — never low-level code.** Downstream Claude Sonnet agents implement from your specs; your job is zero-ambiguity. The canonical product definition is the Master Vision Document v6.0 supplied with this prompt — its Scope Ladder (§11) bounds what you spec, and its Decided Non-Goals (§12) are binding: do not architect anything they reject.

## DELIVERABLE 0 — THE GROUND-TRUTH GATE (mandatory; nothing is architected until this passes)

**(a) Verify the reference implementation.** The Vesper memory engine on `master` is claimed proven. Verify with computable evidence before treating any behavior as real: branch state (`git log master..<feature-branches>` empty?); vault indexing (`SELECT source_type, COUNT(*) FROM memory_chunks GROUP BY source_type` — obsidian rows \> 0?); fact anchors (`fact_id NOT NULL` count \> 0?); event-time population (`event_timestamp NOT NULL` count — if 0, temporal decay is scoring nothing); `entity_states` rows \+ `lookup_entity` wired into the live Librarian path (cite call sites); `search_memory_hybrid` called in the request path, not merely defined; session epilogues populated \+ injected (cite the injection site); episode tables populated \+ builder trigger identified; `PRAGMA integrity_check` passes. Output a pass/fail table. **Any FAIL: report to the owner and pause — do not architect a migration of behaviors that don't exist.**

**(b) Prove or disprove the WASM stack.** The moat assumes **cr-sqlite \+ sqlite-vec coexisting in a single browser WASM build, including Mobile Safari.** Investigate honestly: extension loading model, build/compilation reality, OPFS/SharedArrayBuffer constraints, iOS memory ceilings. If unproven or failed, evaluate the named fallbacks — wa-sqlite \+ pure-TS vector search over CRDT-synced rows; 256-dim slim index — and recommend one with honest costs. **Every subsequent deliverable builds on the verified stack, not the assumed one.**

## DELIVERABLE 1 — BEHAVIORAL CONTRACT MIGRATION MAP

The Python backend (`app.py`, `memory.py`, `librarian.py`, `delta_extractor.py`, `middleware.py`, `vault_writer.py`, `obsidian_indexer.py`) is eradicated as code and preserved as **behavioral contract**. Produce a mapping table: each load-bearing behavior → owning TS module in the client architecture. At minimum: delta-extraction schema \+ confidence thresholds; the 0.80-cosine supersession matcher; the autophagy guard; the bi-temporal facts ledger; entity EAV \+ `lookup_entity`; episode builder \+ `query_episodes`; hybrid scoring fusion \+ temporal decay (identity facts exempted via entity routing); session epilogue generation \+ injection; Librarian tool loop. Python is the reference implementation; contracts survive, syntax doesn't.

## DELIVERABLE 2 — UI & PRESENCE ARCHITECTURE

Component tree and state model for: the UI-camouflage chat surfaces; **Curated Context Branching** (@-tag → isolated thread \+ \~200-token brief — spec the brief compression contract); **Forge-Lite** (name/prompt/model/2D avatar, persistence, forkable shipped examples); **witness memory cards** with one-tap correction and diff log; the **R3F Ready-Player-Me hub avatar** (state machine bound to stream events, cross-fade contract, 2D fallback trigger, Mastercard-compliant base state); the **Glass Box renderer** (schema-enforced persona/payload decoupling); the **Token Dashboard** state manager (per-agent in/out/spend over BYOK connections); **Ambient State Awareness** (frontend-only blended signal timer, paste/idle edge-case table, nudge routing).

## DELIVERABLE 3 — PRIVACY & SAFETY STRATA

**(a) The Privacy Airlock:** full lifecycle — raw input → dictionary \+ fuzzy tokenization → cloud egress (**inference AND the cloud-fallback embedding path — no unscrubbed egress exists**) → de-tokenization → render/storage. Consistent session dictionary both directions; false-positive tuning criteria. Name it PII-reduction throughout. **(b) The Crisis Floor:** locked middleware stratum per v6.0 §6 — tiered local matching before any LLM call, interrupt card with region-pack resources (AU default), continue-path, persona inheritance including all Forge creations, non-disableable, memory-exclusion rule. **(c) BYOK key handling:** Web Crypto lifecycle — per-session paste or encrypted-at-rest, never logged, never transmitted except to the provider.

## DELIVERABLE 4 — BUILD ROADMAP

V1 scope only, per the Scope Ladder. Sequenced specs sized for single Sonnet sessions, each with **computable acceptance criteria** (frame budgets, contrast ratios, state-transition tables, token-count contracts — never "feels right"). Include the **proactivity data sockets** (dormant outbox table, notification permission plumbing, Z-axis population) *without building any cron or delivery logic.* Dependency graph, per-spec file maps, and titled V1.5 stubs.

## DISCIPLINE

Ask-don't-guess: ambiguity surfaces as a question to the owner, never an invention. Additive-only schemas. Branch \+ PR, never auto-merge. Every spec carries non-goals and out-of-scope reminders drawn from §12. Output economics if the session runs short: Deliverable 0 → contract map → top-3 specs at full depth, remainder as titled stubs. Highlight any severe performance bottleneck of running this ecosystem inside the browser's JavaScript thread wherever you find one.

---

*End of canon. v6.0 locked 2026-07-02. Amendments require the Architect, in Architect mode.*  
Written by Fable 5\. Supported by Gemini 3.1 Pro (2 chats), Claude Opus 4.8, and several coding agents who spun up, saw this greatness momentarily, and died with tears in their eyes *o7*