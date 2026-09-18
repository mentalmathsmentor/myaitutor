# Worksheet handoff and provider options — 18/09/2026

## Implemented locally

The existing isolated branch now explains the full handoff in the preview dialog, copy confirmation and sidebar: copy, open Gemini, paste into its message box, attach promised sources, then send. It explicitly says opening Gemini does not transfer the prompt. Copy and open remain separate actions; nothing is submitted automatically.

Replaced the displayed legacy selector image with a cropped capture of the live desktop Gemini menu. The observed account showed Pro and Extended thinking separately. The image contains only the control, with no account details or chat history. Accessible accompanying text gives the steps without relying on the screenshot, dates the example and links to Google's maintained guide. Availability and labels can differ by account and rollout. No Gemini message was sent and no model or account setting was changed.

## Recommended provider design (planned, not implemented)

Keep one provider-neutral worksheet request, then render an explicit destination-specific handoff. Retain the working Gemini Gem as the default initially; add ChatGPT and Claude as opt-in alternatives only after validating the complete output workflow.

1. Add an AI destination selector next to the handoff, with Gemini, ChatGPT and Claude. Preserve all worksheet settings when switching. Display the selected destination on preview/copy/open controls and always retain the manual paste/send step. Never put the teacher prompt into a destination URL.
2. Separate the shared pedagogical/output contract from provider-specific Canvas, upload and search wording. The current request builder explicitly says uploads happen in Gemini, and the renderer returns LaTeX while relying on the existing Gem for further formatting behaviour. Simply adding outbound links would not establish equivalent functionality.
3. Establish a deliberately distributable base instruction pack for ordinary ChatGPT/Claude chats. Keep proprietary assets out until their exposure is explicitly accepted. Evaluate an OpenAI plugin as the reusable branded route after checking the intended users' installation and sharing access. Do not make a new custom GPT the architectural dependency.
4. Treat Claude Projects as a convenience for repeat use, not a public hidden-instruction assistant. Consider a supported skill/plugin distribution route separately if it makes installation easier for teachers; verify access and portability before promising it.
5. Exercise identical synthetic teacher requests in each destination: junior maths, senior multi-topic maths, science, English and a custom subject; Search/Provide/Off; absent uploads and unavailable search; worked solutions versus answers only; long brief; copy failure; desktop and narrow-screen layout. Use deterministic coverage for all compiler combinations and a smaller representative output evaluation across providers. Assess subject retention, question count, correctness, syllabus evidence, LaTeX/rendered output, print layout and ability to revise a section. Do not claim provider equivalence from prompt-string tests alone.
6. Prepare the exact distributable instruction pack, destination links, sharing audience and rollback before any external assistant/plugin creation or publication. Roll back a failed provider route by disabling that adapter while keeping Gemini and the shared worksheet request intact.

## Current platform evidence and IP boundary

- [Google model selection](https://support.google.com/gemini/answer/14517446?hl=en) places the model selector in the composer. [Thinking-level guidance](https://support.google.com/gemini/answer/16275805?hl=en) distinguishes model choice from thinking effort. The local screenshot is evidence of one live account, not universal access.
- [OpenAI sharing guidance](https://help.openai.com/en/articles/8798878) currently says personal accounts cannot create or publish new GPTs; existing GPTs remain available subject to permissions. [The retirement FAQ](https://help.openai.com/en/articles/20001519) describes a transition towards plugins with plan-dependent availability. Check the actual target account before committing to a distribution mechanism.
- [Claude project documentation](https://support.claude.com/en/articles/9519177-how-can-i-create-and-manage-projects) supports project instructions, but shared-project viewers can see those instructions. This does not provide the hidden public assistant behaviour being considered.
- Hidden configuration is not a confidentiality guarantee. [OpenAI's system-prompt-extraction evaluations](https://openai.com/index/openai-anthropic-safety-evaluation/) examine whether hidden prompt contents can be elicited. Engineering inference: treat instructions supplied to a model or distributed to a client as potentially recoverable. Stronger IP protection means keeping valuable deterministic logic/assets behind a controlled service, with a separate architecture, operating-cost and privacy decision; even server-side prompting does not guarantee that a model cannot reveal its instructions.

## Prioritised improvements

From the completed reviewer reports and controller reconciliation:

- Protect drafts against overwrites from another open tab. Offer a conflict choice and preserve both versions rather than silently choosing the last writer.
- Add draft export and deliberate recovery when saving is paused. Preserve unread bytes before reset; offer a usable recovery action in the interface.
- Align deployment checks with PR checks, including a clean lockfile install and browser handoff checks, before publication.
- Evaluate real generated worksheets and improve the readability of scoped topic guidance if users or output tests demonstrate confusion.

Additional product recommendations from this iteration:

- Named, local teacher presets for reusable settings (separate from student/school content).
- Download the generated prompt as a text file, so clipboard restrictions do not block handoff.
- A short source checklist in the handoff reflecting the chosen context mode and promised resources.
- A concise revision prompt builder after generation: adjust difficulty, replace selected questions, or change working space while retaining the rest.

Prioritise draft safety and provider handoff before adding more worksheet toggles. These recommendations are a backlog, not a claim that these features have been implemented or externally reviewed.

## Verification and rollback

Run the existing handoff browser suite in Chrome and WebKit, including clipboard denial/fallback, selectable exact prompt, focus trapping/return, explicit launch, narrow layout and storage-recovery handoff. Build the local preview and inspect the updated guide. This is a wording/image change; the request compiler and stored-draft format are unchanged. Reverting the bounded handoff changes restores the prior UI without a data migration. No push, deployment, GPT/Gem creation, plugin publication or provider generation is included.

Result: production build and the targeted handoff suite passed (30 cases across Chrome and WebKit). The final Playwright record reports `passed` with no failed tests. Inspected the local guide and narrow-screen handoff screenshot. Evidence is retained in the controller workspace under `artifacts/worksheet-handoff/2026-09-18/verification.json`, with source hashes and screenshots. The earlier full compiler test result is historical; this copy/image change was verified with the targeted browser suite.
