# MERGE PROMPT — MAIT Production ↔ Kimi Redesign

> **You are a senior frontend engineer.** Your job is to merge two codebases for MAIT (MyAITutor), an AI tutoring platform for NSW HSC students. The **CURRENT** production codebase has all working logic. The **KIMI** redesign is a design prototype with better aesthetics but incomplete functionality. Your goal is to bring Kimi's visual polish and new content into the production codebase **without breaking any existing functionality**.

---

## 1. Context

**MAIT** is live at `myaitutor.au`. It is a React + Vite app with:
- A FastAPI backend (Gemini API, FAISS RAG, SQLite)
- A worksheet generator that assembles LaTeX prompts → copies to clipboard → opens Gemini
- NESA syllabus dot-points embedded for topic selection
- Past papers page with THSC Online and First Education links
- AI resources page (copy-paste prompt library)
- WebLLM demo mode (runs AI locally in-browser)
- Google auth + access code auth
- Keystroke psychometrics, privacy PII scanning, fatigue tracking

**Production codebase** (`CURRENT`):
```
mait-mvp/frontend/src/
├── App.jsx                    (1591 lines — routing, auth, chat, WebLLM, all state)
├── WorksheetGenerator.jsx     (834 lines — 3-step wizard, LaTeX prompt, clipboard+Gemini flow)
├── LandingPage.jsx            (521 lines — hero, features, syllabi links, waitlist, visit counter)
├── NewLandingPage.jsx         (79 lines — Kimi-designed landing page shell, imports sections/)
├── PastPapers.jsx             (602 lines — THSC/NESA catalogue, sidebar exam timer)
├── AIResources.jsx            (476 lines — prompt library with tabs)
├── components/
│   ├── NavBar.jsx             (136 lines — current production navbar)
│   └── Navigation.jsx         (194 lines — Kimi-styled navbar, framer-motion)
├── sections/                  (Kimi landing sections, already partially integrated)
│   ├── Hero.jsx, ProblemSection.jsx, SolutionSection.jsx
│   ├── AGEDemo.jsx, Features.jsx, Architecture.jsx, Footer.jsx
├── hooks/useAuth.js           (115 lines — Google login, access code, migration)
├── utils/privacy.js           (28 lines — PII regex scanner)
├── utils/cn.js                (7 lines — clsx + tailwind-merge)
├── services/modelService.js   (WebLLM + cloud streaming service)
├── data/syllabus_data.json, stage_subjects.json
└── index.css                  (production design system)
```

**Kimi redesign** (`KIMI`):
```
Kimi UX Recon & Analysis - redesign/app/src/
├── App.tsx                    (129 lines — landing + worksheet-studio, AnimatePresence)
├── components/Navigation.tsx  (179 lines — Kimi nav with scroll-to-section)
├── sections/
│   ├── Hero.tsx               (379 lines — terminal preview, typing effect, stats)
│   ├── ProblemSection.tsx     (215 lines — Three-Front Crisis cards)
│   ├── SolutionSection.tsx    (286 lines — Tri-Brain architecture, data flow viz)
│   ├── AGEDemo.tsx            (298 lines — 4hrs→45sec comparison, 3-step process, PDF preview)
│   ├── Features.tsx           (297 lines — 3 pillar tabs with interactive visuals)
│   ├── Architecture.tsx       (363 lines — Tech Stack / Privacy / Pedagogy tabs)
│   ├── WorksheetStudio.tsx    (770 lines — 4-step wizard, Configuration Summary sidebar)
│   └── Footer.tsx             (241 lines — CTA, link columns, architect credit)
├── components/ui/             (50+ shadcn components — Button, Slider, Switch, etc.)
└── index.css                  (433 lines — cosmic theme, glassmorph, neon effects)
```

---

## 2. Comprehensive Diff Report

### 2.1 — ADDITIONS (Kimi introduces, Production lacks)

| # | Feature | Kimi Source | Notes |
|---|---------|-------------|-------|
| A1 | **4-step Worksheet Wizard** | `WorksheetStudio.tsx` | Steps: Curriculum → Topics → Pedagogy → Output. Production has 3 steps (Year/Subject → Topics → Config). Kimi adds a dedicated "Pedagogy" step with "Pedagogical Arsenal" drills. |
| A2 | **Configuration Summary Sidebar** | `WorksheetStudio.tsx` lines 620–681 | Sticky sidebar showing live summary of Year, Subject, Topics count, Questions, Difficulty, Drills count, Answer Key toggle, Marking Guide toggle, and "Estimated Generation: 30–45 seconds" card. |
| A3 | **Landing page: ProblemSection** | `ProblemSection.tsx` | "Three-Front Crisis" — 3 problem cards (Teacher workload, Data sovereignty, Digital fatigue) with animated stats bars and additional pain points. |
| A4 | **Landing page: SolutionSection** | `SolutionSection.tsx` | "The MAIT Architecture" — 3 solution cards (Privacy Airlock, Keystroke Psychometrics, A.G.E. Pipeline) + Tri-Brain Stack diagram with 4 architecture layers and data flow visualization. |
| A5 | **Landing page: AGEDemo section** | `AGEDemo.tsx` | "4 Hours to 45 Seconds" — time comparison bars (320x faster), 3-step process overview, and PDF preview mockup showing a rendered worksheet. |
| A6 | **Landing page: Features section** | `Features.tsx` | 3 interactive pillar tabs (Knowledge Engine, Avatar System, Wellness Engine) with feature-specific visuals + 6 additional capability cards. |
| A7 | **Landing page: Architecture section** | `Architecture.tsx` | 3 tabs (Tech Stack, Privacy, Pedagogy) with detailed technical breakdowns, privacy alert example, and Bloom's Taxonomy integration. |
| A8 | **Terminal preview in Hero** | `Hero.tsx` lines 220–336 | Animated terminal showing `$ mait --init worksheet-generator` with progressive status messages, parameter display, and "Worksheet generated in 0.42s!". |
| A9 | **Hero typing effect** | `Hero.tsx` lines 18–42 | Typewriter animation: "No wukkas, mate. Let's crack this together." in a chat bubble preview. |
| A10 | **Hero stats row** | `Hero.tsx` lines 44–48, 189–210 | 3 stats cards: "4hrs → 45sec", "100% NESA Aligned", "Tri-Brain Architecture". |
| A11 | **Footer with link columns** | `Footer.tsx` | Product / Resources / Company link columns, social icons, CTA card ("Ready to Transform Your Teaching Workflow?"), architect credit. |
| A12 | **Animated loading screen** | `App.tsx` lines 36–83 | Logo pulsing with orbiting dots and "Initializing MAIT..." text. |
| A13 | **Kimi CSS enhancements** | `index.css` | `glass-card-strong`, `cosmic-gradient-animated`, `neon-glow-purple/cyan`, `neon-text-purple/cyan`, `terminal-window/header/dot/content`, `btn-cosmic/btn-glass`, `section-divider`, `feature-card` hover, `floating-orb`, `shimmer`, `stagger-*` delays, `custom-scrollbar` (purple-themed). |
| A14 | **Framer-motion page transitions** | `App.tsx`, `Navigation.tsx` | `AnimatePresence` with fade/slide transitions between landing and worksheet-studio. Nav slides in from top. |
| A15 | **"Pedagogical Arsenal" drills** | `WorksheetStudio.tsx` lines 130–137 | 6 drill types: Spot the Error, Parameter Shift, Limit Case Analysis, Proof-Style Questions, Contextual Word Problems, Multi-Step Synthesis. Production has only 3 (Spot Error, Parameter Shift, Limit Case). |
| A16 | **Knowledge Source selector** | `WorksheetStudio.tsx` lines 451–490 | Radio group: Built-in AI Knowledge / Custom Syllabus / Live Web Search. Production has `syllabusSource` but with different options (ai/upload/nesa). |
| A17 | **Difficulty slider (1–5)** | `WorksheetStudio.tsx` lines 529–551 | Color-coded slider with Foundation/Standard/Advanced labels. Production uses a 1–5 number input. |

### 2.2 — OMISSIONS (Production has, Kimi drops)

> [!CAUTION]
> These items are **critical** — Kimi lacks all of these. They must NOT be removed during the merge.

| # | Feature | Production Source | Impact |
|---|---------|-------------------|--------|
| O1 | **Clipboard-copy → Gemini redirect flow** | `WorksheetGenerator.jsx` `handleGenerate()` | The actual working flow: `navigator.clipboard.writeText(prompt)` → progress timer → `window.open(geminiUrl)`. Kimi's `handleGenerate()` is a 1.5s setTimeout that just shows a modal. **Must preserve production logic.** |
| O2 | **Full LaTeX prompt assembly** | `WorksheetGenerator.jsx` `generatePrompt()` | 200+ line function building production-quality LaTeX with preamble, header, working space (`dynamicSpacing`), `multicols`, marks allocation, syllabus context injection, textbook reminders, footer, and the specific "reminder" text. Kimi's version is a simplified template string ~35 lines. **Must preserve production logic.** |
| O3 | **Embedded syllabus data** | `syllabus_data.json`, `stage_subjects.json` | Real NESA dot-points for all subjects/stages. Kimi has hardcoded 6 topic categories with ~18 items. **Must use production data.** |
| O4 | **localStorage state persistence** | `WorksheetGenerator.jsx` | Persists wizard state: `mait_ws_stage`, `mait_ws_subject`, `mait_ws_pts_*`, `mait_ws_questions`, `mait_ws_difficulty`, etc. Kimi uses only `useState`. **Must preserve localStorage persistence.** |
| O5 | **Routing system** | `App.jsx` `getPageFromPath()`, `navigateTo()` | Clean URLs via `window.history.pushState` + `popstate` listener. Pages: `landing`, `resources`, `worksheets`, `pastpapers`, `app`, `demo`, `privacy`. Kimi uses `setCurrentSection` with only 2 states. **Must preserve production routing.** |
| O6 | **Authentication** | `useAuth.js`, `App.jsx` | Google Login + access code fallback, `localStorage` persistence, data migration for new Google users. Kimi has zero auth. **Must preserve.** |
| O7 | **Chat interface** | `App.jsx` | Full chat with message history, streaming responses, Markdown rendering, code highlighting, topic sidebar, study timer, HUD toolbar. **Must preserve.** |
| O8 | **WebLLM demo mode** | `App.jsx`, `modelService.js` | Local-first AI: WebGPU check → model download → streaming chat. Includes small/large model choice, download progress, idle timer. **Must preserve.** |
| O9 | **Past Papers page** | `PastPapers.jsx` | THSC Online + First Education cards, NESA URL builder with year expansion, sidebar exam timer (countdown/countup with ring, presets, custom time, warning states). **Must preserve.** |
| O10 | **AI Resources page** | `AIResources.jsx` | 3-tab prompt library (Students/Teachers/Everyone) with expandable cards and copy buttons. **Must preserve.** |
| O11 | **NavBar with all pages** | `NavBar.jsx` | Links to Home, AI Resources, Worksheets, Past Papers, Free Demo + auth state display. **Must preserve all page links.** |
| O12 | **Keystroke psychometrics** | `useKeystrokeTracker` hook | Tracks typing cadence, delete-retype cycles, hesitation. **Must preserve.** |
| O13 | **Privacy PII scanner** | `utils/privacy.js` | Regex for mobile, email, credit card detection. **Must preserve.** |
| O14 | **Visit counter** | `LandingPage.jsx` lines 121–132 | `POST /visit` → displays "You are the Nth visitor". **Must preserve.** |
| O15 | **Waitlist/subscribe form** | `LandingPage.jsx` `WaitlistForm` | `POST /subscribe` with email. **Must preserve.** |
| O16 | **Feedback form in WorksheetGenerator** | `WorksheetGenerator.jsx` | `POST /api/feedback` with name/email/rating/message fields. **Must preserve.** |
| O17 | **Exam timer in Past Papers** | `PastPapers.jsx` `ExamTimer` | SVG ring, countdown/countup modes, presets, custom time, danger/warning states. **Must preserve.** |
| O18 | **Math particles** | `LandingPage.jsx` `MathParticles` | 15 floating math symbol particles from the comprehensive `MATH_SYMBOLS` array. **Must preserve if landing page is kept.** |
| O19 | **NSW Syllabi links section** | `LandingPage.jsx` lines 224–257 | Direct NESA curriculum links for Standard, Advanced, Ext1, Ext2. **Must preserve.** |
| O20 | **Production warning modal** | `WorksheetGenerator.jsx` | Warning popup before generate: "Please review selected items" with numbered checklist and disclaimer text. **Must preserve.** |
| O21 | **Universal Worksheet Draft Preview** | `WorksheetGenerator.jsx` lines 641–651 | Side-by-side preview of a sample PDF. Kimi drops this. **Must preserve and upgrade to use real PDF.** |

### 2.3 — CONFLICTS (Both implement, differently)

| # | Feature | Production | Kimi | Resolution |
|---|---------|------------|------|------------|
| C1 | **Wizard step count** | 3 steps: Year/Subject → Topics → Config | 4 steps: Curriculum → Topics → Pedagogy → Output | **Use Kimi's 4-step structure** but backfill production logic into each step. Move production's pedagogical checkboxes from Step 3 into Kimi's new Step 3 "Pedagogy". Move production's config options into Kimi's Step 4 "Output". |
| C2 | **Navbar** | `NavBar.jsx` — pages: Home, Resources, Worksheets, Past Papers, Demo + auth | `Navigation.tsx` — only scroll-to-section links + Worksheet Studio CTA, no auth, no page links | **Merge into NavBar.jsx**: Keep all production page links + auth. Add Kimi's `motion.nav` entry animation, gradient logo, and the landing-page scroll-to-section behavior (when on landing, show Kimi's scroll items; otherwise, show page links). |
| C3 | **Landing page structure** | `LandingPage.jsx` — Hero, 3 feature cards, syllabi links, AI resources preview, worksheet CTA, waitlist, footer with visit counter | `Hero.tsx` + 6 sections (Problem, Solution, AGEDemo, Features, Architecture, Footer) | **Use Kimi's section structure** as the landing page body. **Add back**: syllabi links, AI resource preview, waitlist form, visit counter, math particles. Place them between Architecture and Footer. |
| C4 | **Prompt generation** | `generatePrompt()` — 200+ lines of production LaTeX with preamble, header, spacing, marks, textbook reminders, disclaimer | `generatePrompt()` — ~35 line simplified template | **Use production's `generatePrompt()` entirely.** Only adopt Kimi's new state variable names where they map to existing production settings. |
| C5 | **CSS design system** | `index.css` — HSL CSS custom properties, Outfit + JetBrains Mono, cyan/teal primary, dark cosmic theme | `index.css` — Inter + JetBrains Mono, purple/cyan primary (mait-cosmic 265°), Tailwind component classes | **Merge Kimi's CSS additions** (glassmorphism, neon glows, terminal styling, feature-card hover, cosmic-gradient) into production's `index.css`. Keep production's HSL variable system. Add Kimi's new utility classes without removing existing ones. Keep `--primary: 265 85% 60%` (purple) as the new primary alongside existing cyan as accent. |
| C6 | **Worksheet topic selection** | Full syllabus data from JSON, AI search, manual raw text entry, NESA website search | Hardcoded 6 categories with 18 dot-points, no search, no manual entry | **Use production's topic selection** with real syllabus data and all input modes. |
| C7 | **Page transitions** | Hash/pushState navigation, no animation | `AnimatePresence` with fade/slide between sections | **Add framer-motion transitions** to production's page switching in `App.jsx`. Wrap page content in `AnimatePresence`. |
| C8 | **Generate button behavior** | Copies prompt → opens Gemini in new tab → shows "Copied!" feedback with progress bar | Shows loading spinner for 1.5s → displays modal with prompt preview and "Open Gemini" link | **Keep production's clipboard-copy-redirect flow.** Adopt Kimi's modal design for the post-generate feedback (show the prompt preview + Gemini link in a styled modal, but auto-copy AND auto-open as production does). |
| C9 | **Footer** | Simple centered footer with MAIT logo, privacy link, Mental Maths Mentor link, feedback email, visit counter | Rich footer with CTA card, 3 link columns (Product/Resources/Company), social icons, architect credit | **Use Kimi's footer layout** but populate links with production's actual pages and URLs. Add visit counter badge. |
| C10 | **Pedagogical drills** | 3 checkbox options: Spot the Error, Parameter Shift, Limit Case | 6 drill cards: adds Proof-Style, Word Problems, Multi-Step Synthesis | **Use Kimi's expanded list** with the card UI. Ensure all 6 drills map into production's `generatePrompt()` LaTeX directives. |

---

## 3. Ordered Implementation Tasks

Execute these tasks **in order**. Each task specifies exactly **What**, **Where**, and **How**.

---

### TASK 1: Merge CSS Design Systems

**What:** Combine Kimi's new CSS utilities into production's `index.css` without removing existing styles.

**Where:** `mait-mvp/frontend/src/index.css`

**How:**
1. Add Kimi's color variables to production's `:root` block:
   ```css
   --mait-cosmic-purple: 265 85% 60%;
   --mait-neon-cyan: 180 85% 55%;
   --mait-electric-violet: 270 100% 65%;
   --mait-deep-space: 230 25% 5%;
   --mait-nebula: 280 60% 25%;
   --mait-aurora: 170 80% 45%;
   --mait-solar: 45 100% 55%;
   --mait-mars: 15 85% 55%;
   ```
2. Add these Kimi utility classes (append, don't replace):
   - `.glass-card-strong` (stronger glass effect)
   - `.cosmic-gradient`, `.cosmic-gradient-animated`
   - `.neon-glow-purple`, `.neon-glow-cyan`, `.neon-text-purple`, `.neon-text-cyan`
   - `.terminal-window`, `.terminal-header`, `.terminal-dot`, `.terminal-content`
   - `.gradient-text` (the purple→cyan version), `.gradient-text-animated`
   - `.btn-cosmic`, `.btn-glass`
   - `.step-active` with pulse-glow
   - `.feature-card` hover
   - `.floating-orb`
   - `.section-divider`
   - `.grid-pattern`
   - `.processing-pulse`
   - `.animate-shimmer`, `.animate-slide-up`, `.animate-slide-in-right`, `.animate-scale-in`, `.animate-typing-cursor`
   - `.stagger-1` through `.stagger-5`
3. Add all Kimi keyframes (`cosmic-shift`, `gradient-shift`, `pulse-glow`, `float-orb`, `processing-pulse`, `typing-cursor`, `slide-up`, `slide-in-right`, `scale-in`, `shimmer`).
4. Keep ALL existing production CSS classes intact. Do not remove or rename them.

---

### TASK 2: Add Kimi Landing Sections to `sections/` directory

**What:** Copy Kimi's section components into production, converting from TSX to JSX.

**Where:** `mait-mvp/frontend/src/sections/`

**How:**
1. For each Kimi section file (`Hero.tsx`, `ProblemSection.tsx`, `SolutionSection.tsx`, `AGEDemo.tsx`, `Features.tsx`, `Architecture.tsx`, `Footer.tsx`):
   - Convert from TypeScript to JavaScript (remove type annotations, interfaces, generic params)
   - Replace `@/components/ui/button` imports with either production's existing button classes or inline `<button>` with appropriate class names (`btn-cosmic`, `btn-glass`, `btn-primary`)
   - Replace any `@/` path aliases with relative paths
   - Keep all framer-motion animations and Lucide icon usage
2. **Hero.tsx → Hero.jsx**: Add production's `navigate` and `onLoginClick` props. Wire "See A.G.E. in Action" button to `navigate('demo')`. Wire "Full Access" to `onLoginClick`. Keep the terminal preview, typing effect, and stats.
3. **AGEDemo.tsx → AGEDemo.jsx**: Add `navigate` prop. Wire "Try the Worksheet Studio" button to `navigate('worksheets')`.
4. **Footer.tsx → Footer.jsx**: Add `navigate` prop. Wire Product links to production pages. Replace `setCurrentSection('worksheet-studio')` with `navigate('worksheets')`. Add visit counter badge from production.
5. *Do not modify* the existing production sections/ files if they already exist — only add/update the ones that need Kimi's content.

---

### TASK 3: Integrate Kimi Landing Page into Production

**What:** Use the Kimi-designed sectional landing page as the primary landing.

**Where:** `mait-mvp/frontend/src/NewLandingPage.jsx`

**How:**
1. Update `NewLandingPage.jsx` to include ALL Kimi sections in order: Hero → ProblemSection → SolutionSection → AGEDemo → Features → Architecture.
2. **After Architecture and before Footer**, add these production sections:
   - **NSW Syllabi Links** (from production `LandingPage.jsx` lines 224–257): Render the `SYLLABI` array as course-card links.
   - **AI Resources Preview** (from production `LandingPage.jsx` lines 259–310): 3 preview cards + "View All Resources" button.
   - **Worksheet Generator CTA** (from production `LandingPage.jsx` lines 312–340): Glass card with "Open Generator" button.
   - **Waitlist Section** (from production `LandingPage.jsx` lines 342–358): Email subscribe form.
3. Render the Kimi `Footer` component (with production links and visit counter).
4. Keep the math particles background from production's `MathParticles` component.

---

### TASK 4: Merge Navbar & Brand Style

**What:** Create a single, unified navbar that has production's full page-link functionality AND Kimi's visual overhaul style.

**Where:** `mait-mvp/frontend/src/components/Navigation.jsx` (use as the primary navbar)

**How:**
1. **Unify Page Links**: Update `Navigation.jsx` to include ALL links from production's `NAV_ITEMS`:
   - Home (`landing`)
   - AI Resources (`resources`)
   - Worksheet Studio (`worksheets`)
   - Past Papers (`pastpapers`)
   - Free Demo (`demo`)
2. **Kimi Styling**:
   - Use the `motion.nav` entry animation and scroll-linked `backdrop-blur` / `border-b` effects.
   - Use the gradient MAIT logo (Brain icon in gradient rounded box + pulsing glow).
   - Use the "Full Access" gradient button for the unauthenticated Login state.
   - Use the "Studio" border-gradient button as a secondary CTA.
3. **Landing Page Integration**:
   - Only show the section-scroll links (The Problem, The Solution, A.G.E. Demo, Features, Architecture) when `currentPage === 'landing'`.
   - On all other pages (Resources, Past Papers, etc.), only show the main page links.
4. **App Integration**:
   - In `mait-mvp/frontend/src/App.jsx`, replace ALL instances of `<NavBar ... />` with `<Navigation ... />`.
   - Ensure `Navigation.jsx` receives all necessary props: `currentPage`, `navigate`, `onLoginClick`, `authUser`, `onLogout`, and `scrollToSection`.
5. **Mobile Readiness**: Update the mobile menu drawer in `Navigation.jsx` to include the full list of page links.

---

### TASK 5: Upgrade WorksheetGenerator to 4-Step Wizard

**What:** Restructure production's 3-step wizard into Kimi's 4 steps while preserving ALL production logic.

**Where:** `mait-mvp/frontend/src/WorksheetGenerator.jsx`

**How:**
1. **Step structure change**: Map production's steps:
   - Old Step 1 (Year & Subject) → New Step 1 "Curriculum Selection"
   - Old Step 2 (Topics) → New Step 2 "Topic Selection"
   - Old Step 3 (Config) → Split into:
     - New Step 3 "Pedagogical Arsenal" (pedagogical drill checkboxes + knowledge source selector)
     - New Step 4 "Output Configuration" (question count, difficulty, spacing, marks, answer key, textbook checkbox)

2. **Step progress indicator**: Replace production's simple step dots with Kimi's connected progress bar showing step icons, names, green checkmarks for completed steps, and active highlight.

3. **Add Configuration Summary sidebar** (Kimi's lines 620–681): A sticky `lg:col-span-1` panel showing:
   - Year, Subject, Topics count, Questions, Difficulty (color-coded), Drills count
   - Answer Key and Marking Guide toggle indicators
   - "Estimated Generation: 30–45 seconds vs 4+ hours manually" card

4. **Layout change**: Wrap the step content and sidebar in a `grid lg:grid-cols-3 gap-8` layout:
   - Steps area: `lg:col-span-2`
   - Summary sidebar: `lg:col-span-1`

5. **Expand pedagogical drills** (Step 3): Add 3 new drills from Kimi:
   - `proof-style`: "Proof-Style Questions" — "Rigorous mathematical reasoning"
   - `word-problems`: "Contextual Word Problems" — "Real-world applications"
   - `multi-step`: "Multi-Step Synthesis" — "Complex chained problems"
   
   Use Kimi's card-style layout for each drill (clickable card with checkbox, title, description).

6. **Update `generatePrompt()`**: Add LaTeX directives for the 3 new drills:
   ```
   ${pedagogicalDrills.includes('proof-style') ? '- Include rigorous proof-style questions requiring formal mathematical reasoning\n' : ''}
   ${pedagogicalDrills.includes('word-problems') ? '- Include contextual word problems with real-world applications\n' : ''}
   ${pedagogicalDrills.includes('multi-step') ? '- Include complex multi-step synthesis problems that chain multiple concepts\n' : ''}
   ```

7. **CRITICAL — Preserve all production logic**:
   - `generatePrompt()` — the full 200+ line function, untouched except adding new drill directives
   - `handleGenerate()` — clipboard copy + Gemini redirect flow
   - `localStorage` state persistence for ALL settings
   - Syllabus data loading from JSON files
   - Manual entry (`rawQuestions`) support
   - AI topic selection mode
   - NESA website search mode
   - Feedback form
   - Warning modal before generation
   - Working space / dynamic spacing controls
   - Marks allocation input
   - School name input
   - All `useEffect` hooks for state restoration

8. **Style upgrade**: Apply Kimi's visual classes to the wizard:
   - Use `glass-card-strong` for step content panels
   - Use `btn-cosmic` for the Generate button
   - Use `btn-glass` for the Previous button
   - Add `AnimatePresence` with slide animations between steps

9. **Inject Universal Worksheet Draft & FAQ Sections**:
   - Copy the "Showcase Backdrop & FAQ Section" (lines 637–702) from production `WorksheetGenerator.jsx` and append it to the bottom of the upgraded layout.
   - **PDF PREVIEW UPGRADE**: Replace the placeholder image `<img>` for `universal_worksheet_exemplar.png` (line 649) with a PDF viewer (`<iframe src="/Universal_Worksheet.pdf" className="w-full h-full rounded-lg" title="Syllabus Exemplar" />`).
   - **FILE ACTION**: Copy the source PDF at `/Users/darayeet/Documents/personal don't open/ALL/MAIT/Universal Worksheet.pdf` to the production `public/Universal_Worksheet.pdf`.

---

### TASK 6: Add Framer-Motion Page Transitions to App.jsx

**What:** Add smooth transitions when switching between pages.

**Where:** `mait-mvp/frontend/src/App.jsx`

**How:**
1. Import `motion` and `AnimatePresence` from `framer-motion`.
2. Wrap the page content rendering in `<AnimatePresence mode="wait">`.
3. Add a `<motion.div>` wrapper around each page with:
   ```jsx
   <motion.div
     key={page}
     initial={{ opacity: 0, y: 10 }}
     animate={{ opacity: 1, y: 0 }}
     exit={{ opacity: 0, y: -10 }}
     transition={{ duration: 0.3 }}
   >
   ```
4. Do NOT wrap the navbar or any persistent UI (HUD, sidebar) in the AnimatePresence.
5. Do NOT break the existing routing logic (`getPageFromPath`, `navigateTo`, `popstate`).

---

### TASK 7: Upgrade Footer

**What:** Replace the simple production footer with Kimi's rich footer, populated with production data.

**Where:** `mait-mvp/frontend/src/sections/Footer.jsx` (or update within landing page)

**How:**
1. Use Kimi's footer layout: CTA card + 3 link columns + bottom bar.
2. Populate Product links: Worksheet Studio → `navigate('worksheets')`, AI Resources → `navigate('resources')`, Past Papers → `navigate('pastpapers')`, Free Demo → `navigate('demo')`.
3. Populate Resources links: NESA Syllabus (external), Mental Maths Mentor (external).
4. Populate Company links: Privacy → `navigate('privacy')`, Feedback (mailto), Contact (mailto).
5. Add the visit counter badge from production (`POST /visit` → ordinal display).
6. Keep the architect credit line.
7. Remove placeholder `#` links — all links must go somewhere real or be removed.

---

### TASK 8: Verify All Pages Still Work

**What:** Verify that every page renders and functions correctly after the merge.

**How:**
1. Run `npm run dev` and verify:
   - **Landing page**: All Kimi sections render. Scroll-to-section works. Visit counter loads. Waitlist form submits. Syllabi links open in new tab.
   - **Worksheets page**: All 4 wizard steps work. Topics load from syllabus data. Configuration summary sidebar updates live. Generate copies prompt + opens Gemini. Warning modal appears. localStorage persists settings.
   - **Past Papers page**: Sidebar catalogue renders. Exam timer works. NESA year expansion works. External links open.
   - **AI Resources page**: 3 tabs show prompts. Copy buttons work.
   - **Demo page**: WebLLM model selection modal appears. Model download/init works.
   - **App page (authenticated)**: Chat interface works. Messages send/receive. Study timer works.
   - **Privacy page**: Content renders.
2. Test mobile responsiveness at 375px, 768px, and 1024px widths.
3. Test that the navbar correctly shows auth state and all page links.

---

## 4. Critical Constraints

> [!CAUTION]
> Violating any of these constraints will break the production site. Read carefully.

1. **DO NOT remove or replace `generatePrompt()` in WorksheetGenerator.jsx.** The production prompt assembly is battle-tested and produces correct LaTeX. Kimi's version is a skeleton. Only ADD new drill directives to the existing function.

2. **DO NOT remove the clipboard-copy → Gemini redirect flow.** This is the ENTIRE working mechanism. Kimi's `handleGenerate()` is a fake setTimeout. Keep `navigator.clipboard.writeText(prompt)` → `window.open(geminiUrl)`.

3. **DO NOT create new backend endpoints.** The merge is frontend-only. All existing API calls (`/query`, `/context`, `/history`, `/reset`, `/visit`, `/subscribe`, `/auth/*`, `/api/feedback`) must remain unchanged.

4. **DO NOT remove any existing pages.** All 7 pages must continue to work: `landing`, `resources`, `worksheets`, `pastpapers`, `app`, `demo`, `privacy`.

5. **DO NOT remove localStorage persistence.** All `mait_ws_*` keys must continue saving/restoring wizard state.

6. **DO NOT break the syllabus data pipeline.** Topics must load from `syllabus_data.json` and `stage_subjects.json`, not from hardcoded arrays.

7. **DO NOT remove auth.** Google Login + access code must continue working through `useAuth.js`.

8. **DO NOT remove keystroke tracking, privacy scanning, or fatigue detection.** These are core MAIT features.

9. **DO NOT remove the exam timer from Past Papers.** It's a standalone feature students rely on.

10. **DO NOT use TypeScript.** Production is JSX. Convert all Kimi's `.tsx` to `.jsx` during the merge.

11. **Keep `framer-motion` additions optional/progressive.** If framer-motion is not installed, the app should still render (wrap motion components in try/catch or check for availability). If it IS installed, use it for page transitions and landing section animations.

12. **DO NOT change the production routing mechanism.** Keep `window.history.pushState` + `popstate`. Do not switch to React Router or any other library.

13. **Preserve the existing font stack.** Production uses Outfit + JetBrains Mono. If Kimi uses Inter, add it as a fallback but don't replace Outfit.

---

## 5. File-by-File Summary

| File | Action | Description |
|------|--------|-------------|
| `index.css` | **MODIFY** | Add Kimi CSS utilities, variables, keyframes. Keep all existing. |
| `sections/Hero.jsx` | **MODIFY** | Convert from TSX, wire production props. |
| `sections/ProblemSection.jsx` | **MODIFY** | Convert from TSX. |
| `sections/SolutionSection.jsx` | **MODIFY** | Convert from TSX. |
| `sections/AGEDemo.jsx` | **MODIFY** | Convert from TSX, wire navigate. |
| `sections/Features.jsx` | **MODIFY** | Convert from TSX. |
| `sections/Architecture.jsx` | **MODIFY** | Convert from TSX. |
| `sections/Footer.jsx` | **MODIFY** | Convert from TSX, wire production links + visit counter. |
| `NewLandingPage.jsx` | **MODIFY** | Add production sections (syllabi, resources preview, waitlist). |
| `NavBar.jsx` | **MODIFY** | Add motion animation, scroll-to-section, Kimi styling. Keep all routes + auth. |
| `WorksheetGenerator.jsx` | **MODIFY** | Restructure to 4 steps, add sidebar, expand drills. Preserve ALL logic. |
| `App.jsx` | **MODIFY** | Add AnimatePresence page transitions. Keep all routing/auth/state. |

---

## 6. Dependency Check

Before starting, ensure these are installed:
```bash
npm ls framer-motion    # Required for Kimi animations
npm ls tailwindcss-animate # Required for Kimi Tailwind config
npm ls lucide-react     # Already in production
npm ls clsx             # Already in production
npm ls tailwind-merge   # Already in production
```

If `framer-motion` or `tailwindcss-animate` are not installed:
```bash
npm install framer-motion tailwindcss-animate
```

---

**END OF MERGE PROMPT**
