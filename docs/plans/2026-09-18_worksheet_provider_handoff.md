# Worksheet handoff and provider options — 18/09/2026

## Implemented locally

The existing isolated branch now explains the full handoff in the preview dialog, copy confirmation and sidebar: copy, open Gemini, paste into its message box, attach promised sources, then send. It explicitly says opening Gemini does not transfer the prompt. Copy and open remain separate actions; nothing is submitted automatically.

Replaced the displayed legacy selector image with a cropped capture of the live desktop Gemini menu. The observed account showed Pro and Extended thinking separately. The image contains only the control, with no account details or chat history. Accessible accompanying text gives the steps without relying on the screenshot, dates the example and links to Google's maintained guide. Availability and labels can differ by account and rollout. No Gemini message was sent and no model or account setting was changed.

## Recommended provider design (planned, not implemented)

Keep one provider-neutral worksheet request, then render an explicit destination-specific handoff. Retain the working Gemini Gem as the default initially; add ChatGPT and Claude as opt-in alternatives only after validating the complete output workflow.

1. Add an AI destination selector next to the handoff, with Gemini, ChatGPT and Claude. Preserve all worksheet settings when switching. Display the selected destination on preview/copy/open controls and always retain the manual paste/send step. Never put the teacher prompt into a destination URL.
2. Separate the shared pedagogical/output contract from provider-specific Canvas, upload and search wording. The current request builder explicitly says uploads happen in Gemini, and the renderer returns LaTeX while relying on the existing Gem for further formatting behaviour. Simply adding outbound links would not establish equivalent functionality.
3. Use the verified MyAITeam Business custom GPT capability as the first ChatGPT integration candidate. Keep the provider adapter independent of its distribution surface so the documented future plugin migration does not require rewriting the worksheet compiler. Prepare the actual worksheet instructions separately from the generic capability test; validate output and recipient access before making it a supported destination. Ordinary-chat fallbacks require a deliberately distributable instruction pack.
4. Treat Claude Projects as a convenience for repeat use, not a public hidden-instruction assistant. Consider a supported skill/plugin distribution route separately if it makes installation easier for teachers; verify access and portability before promising it.
5. Exercise identical synthetic teacher requests in each destination: junior maths, senior multi-topic maths, science, English and a custom subject; Search/Provide/Off; absent uploads and unavailable search; worked solutions versus answers only; long brief; copy failure; desktop and narrow-screen layout. Use deterministic coverage for all compiler combinations and a smaller representative output evaluation across providers. Assess subject retention, question count, correctness, syllabus evidence, LaTeX/rendered output, print layout and ability to revise a section. Do not claim provider equivalence from prompt-string tests alone.
6. Prepare the exact distributable instruction pack, destination links, sharing audience and rollback before any external assistant/plugin creation or publication. Roll back a failed provider route by disabling that adapter while keeping Gemini and the shared worksheet request intact.

## Current platform evidence and IP boundary

- [Google model selection](https://support.google.com/gemini/answer/14517446?hl=en) places the model selector in the composer. [Thinking-level guidance](https://support.google.com/gemini/answer/16275805?hl=en) distinguishes model choice from thinking effort. The local screenshot is evidence of one live account, not universal access.
- [OpenAI sharing guidance](https://help.openai.com/en/articles/8798878) distinguishes personal accounts from Business, Enterprise and Edu workspaces, where creation and sharing depend on permissions. Browser testing confirmed the requested work account opens MyAITeam Business and successfully creates a private GPT. Public-link and GPT Store choices were present, but public publication and recipient access were not tested. Use Can chat permissions for recipients; Can view settings exposes configuration and duplication. [The retirement FAQ](https://help.openai.com/en/articles/20001519) describes a future transition towards plugins with account-dependent availability; that roadmap does not negate the successful current Business-seat test.
- [Claude project documentation](https://support.claude.com/en/articles/9519177-how-can-i-create-and-manage-projects) supports project instructions, but shared-project viewers can see those instructions. This does not provide the hidden public assistant behaviour being considered.
- Hidden configuration is not a confidentiality guarantee. [OpenAI's system-prompt-extraction evaluations](https://openai.com/index/openai-anthropic-safety-evaluation/) examine whether hidden prompt contents can be elicited. Engineering inference: treat instructions supplied to a model or distributed to a client as potentially recoverable. Stronger IP protection means keeping valuable deterministic logic/assets behind a controlled service, with a separate architecture, operating-cost and privacy decision; even server-side prompting does not guarantee that a model cannot reveal its instructions.

## Private GPT capability test and Claude alternatives

Browser verification on 18/09/2026 used the work account explicitly requested by the user and its MyAITeam Business workspace. The editor accepted name, description and custom instructions, autosaved a draft, and completed Create followed by Update with Invite-only selected and only the owner listed. The success dialog confirmed GPT Updated and Invite-only; the saved GPT page then opened. Public-link, workspace and GPT Store options were inspected without selecting them. No model response was requested, no production worksheet instructions or files were uploaded, and no public access was enabled.

The retained [private capability check](https://chatgpt.com/g/g-6aac8a7dcd2081919510abff25a3abba-myaitutor-private-capability-check) is named MyAITutor — private capability check. Its description labels it as a private creation test rather than the production assistant. Its complete generic instructions are:

> This is a private configuration test for MyAITutor. Ask the user which subject they want to practise. No worksheet generation instructions or proprietary material are included.

This proves private configuration and creation, not worksheet quality, model availability for external users, successful public publication, or resistance to prompt extraction. The actual MyAITutor assistant still needs a reviewed instruction pack and representative output tests before distribution.

Claude research found these materially different options:

- **Claude Projects:** shared viewers can inspect project instructions. Does not meet the requested hidden-configuration requirement. [Project permissions](https://support.claude.com/en/articles/9519177-how-can-i-create-and-manage-projects).
- **Claude AI-powered Artifacts:** not a confirmed replacement. Legacy published chat artifacts allow code copying; prompts embedded in that code are exposed. The newer artifact sharing documentation also excludes artifacts that ask Claude questions from anyone-with-link sharing. Do not promise a public hidden-instruction assistant on this basis. [Artifact sharing](https://support.claude.com/en/articles/9547008-publish-and-share-artifacts).
- **Claude organisation instructions:** owners and above can view/edit them, so ordinary members do not have configuration access. However, they apply organisation-wide rather than providing a separate externally shareable worksheet bot. [Organisation instructions](https://support.claude.com/en/articles/14546867-set-organization-instructions).
- **Poe prompt bot backed by Claude:** the closest documented no-code candidate. Poe explicitly offers a prompt-visibility control for the bot profile and shareable prompt bots. Keep prompt visibility disabled if evaluating this route. Users consume Poe points; this does not use their Claude subscription allowance. Current Claude base-model eligibility, pricing, worksheet output and recipient visibility still need live testing. No Poe bot or account was created and no Poe model was invoked. [Prompt-bot creation](https://creator.poe.com/docs/prompt-bots/how-to-create-a-prompt-bot), [Poe models and points](https://help.poe.com/hc/en-us/articles/19944206309524-Poe-FAQs).

Recommendation: implement and evaluate the Business custom GPT route first. Keep native Claude as an explicitly transparent copy/paste fallback, or separately evaluate Poe if hiding configuration is required. Hiding the configuration UI limits casual copying; it is not a guarantee against eliciting instructions through conversation.

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

Run the existing handoff browser suite in Chrome and WebKit, including clipboard denial/fallback, selectable exact prompt, focus trapping/return, explicit launch, narrow layout and storage-recovery handoff. Build the local preview and inspect the updated guide. This is a wording/image change; the request compiler and stored-draft format are unchanged. Reverting the bounded handoff changes restores the prior UI without a data migration. The initial handoff implementation did not include external assistant creation. The subsequent user-requested private GPT capability test is recorded separately above. No push, deployment, public publication or provider generation was performed.

Result: production build and the targeted handoff suite passed (30 cases across Chrome and WebKit). The final Playwright record reports `passed` with no failed tests. Inspected the local guide and narrow-screen handoff screenshot. Evidence is retained in the controller workspace under `artifacts/worksheet-handoff/2026-09-18/verification.json`, with source hashes and screenshots. The earlier full compiler test result is historical; this copy/image change was verified with the targeted browser suite.
