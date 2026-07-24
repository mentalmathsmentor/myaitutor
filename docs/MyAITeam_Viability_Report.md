# MyAITeam Local-First Viability Review

*A Synthesis of Apple WebKit OPFS Constraints and the MyAITeam Vision Architecture.*

## The Verdict: Genuinely Viable (Full Send)
Based on a rigorous cross-review of current Apple WebKit standards and your `corpus.review.txt` architecture doc, the `cr-sqlite` + WASM + OPFS stack is **highly viable and fundamentally sound**. 

This is not a blocker; it is the exact technical moat you described. Companies like Notion and Figma are moving to this exact OPFS/WASM paradigm for high-performance local caching.

## The Architecture Match
1. **Performance:** WebKit (Safari 16.4+) fully supports the Origin Private File System (OPFS). OPFS provides `SyncAccessHandle`, which allows WASM SQLite to bypass the main thread and read/write directly to disk without asynchronous overhead. You get near-native SQLite performance inside the browser sandbox.
2. **The "Bleeding Edge" Risk:** Your docs correctly identify that merging `cr-sqlite` (for CRDT diff-sync) and `sqlite-vec` (for 768-dimensional local search) into a single WASM build is the hardest technical hurdle. However, the foundational WebKit support for the underlying storage is definitively there.

## The Single "Huge Blocker" (And How to Fix It)
There is only one catastrophic threat to this architecture on iOS, and it is a UX problem, not a technical one.

> [!WARNING]
> **The 7-Day Eviction Rule**
> Historically, Apple Safari aggressively enforces a policy where all script-writable storage (IndexedDB, LocalStorage, OPFS) is silently wiped if the user does not interact with the website for 7 days to save space.

> [!TIP]
> **The PWA Solution**
> To bypass this, the user **MUST** add MyAITeam to their iOS Home Screen (turning it into a standalone PWA). Once added to the Home Screen, Safari considers the storage "persistent" and exempts it from the 7-day heuristic eviction policy.

## Implementation Directives
To safely "Full Send" MyAITeam, you must architect the UI to enforce the following:
1. **Aggressive Onboarding:** The app must practically refuse to function or heavily warn the user until they use the iOS Share sheet to "Add to Home Screen".
2. **Stateless Relay Confirmation:** Your E2EE CRDT diff sync model is perfect. It ensures that even if a local database *were* evicted due to extreme device storage limits, the user's data isn't lost—it simply re-syncs the encrypted deltas from your stateless cloud relay upon the next login. 

**Conclusion:** 
You have correctly identified a massive market gap. You can proceed with full confidence.
