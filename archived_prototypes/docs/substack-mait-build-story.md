# 137 Commits, 4 AI Models, 0 Developers: A Solo Builder's Guide to Shipping in 2026

*How a \*mostly* broke education student built a production AI tutoring platform between recess and bedtime — with receipts.*

---

## The Hook

Three months ago, I had a 37-page Google Doc and a dream. Today I have a live AI tutoring platform at myaitutor.au with 137+ commits, a school CEO meeting on the calendar, partnership outreach to established education providers, and a worksheet generator that does in 45 seconds what takes teachers 4+ hours manually.

I have no CS degree. No funding. No team. My total infrastructure cost is $0/month. My AI subscriptions cost roughly $3/day across three services. I built most of this between classes during my teaching placement, during tutoring sessions while students worked on practice questions, and late at night when I probably should have been sleeping.

This is not a hypothetical think piece about AI-enabled solo building. This is a build log with git receipts.

---

## Who Am I

My name's Darra. I'm 21, Bangladeshi-Australian, based in Western Sydney. I'm completing a Bachelor of Education at Macquarie University while running Mental Maths Mentor (mentalmaths.au), a private maths tutoring business. I was Class Teacher of the Year 2023 at Art of Smart after teaching across 7 high schools. Before education, I started in Mechatronics at UNSW, switched to Computer Science, then realised my actual superpower was teaching.

I am not a software engineer. I've never worked at a tech company. I can't write a binary search from scratch without looking it up. What I can do is understand what students need, explain complex things simply, and apparently prompt AI models into building production software for me.

---

## The Vision Doc Era (September – December 2025)

It started as a Google Doc in September 2025. "MAIT — MyAITutor: Project Vision Document." I wrote it like I was pitching to investors I didn't have, because I needed to convince myself this wasn't insane.

The core thesis: every AI tutoring product on the market optimises for screen time and test scores. Nobody is building for student wellbeing. What if the AI tutor was the one telling you to stop studying?

The doc grew. And grew. Four addendums. A "Tri-Brain" architecture for privacy. A "Guess-First" workflow that uses API latency as a pedagogical tool. A wellness engine that monitors your typing patterns for signs of frustration and fatigue. A "Glass Box" transparency system where the AI's factual output is rendered separately from its personality, so the friendly Australian persona can never corrupt the maths.

By December, the doc was 37 pages. I'd published the core ideas on Substack. I'd stress-tested the alignment implications across six different LLMs. I had a complete technical architecture.

I had zero lines of code.

---

## The Boxing Day Sprint (26 December 2025)

On Boxing Day, I sat down with Claude Code and Google's Antigravity (Gemini's code assistant) and said: "build this."

The first MVP took about 5 hours. Not 5 days. Not 5 sprints. Five hours. Claude Code's multi-agent swarm built the foundation — RAG pipeline, artifact engine with LaTeX-to-PDF conversion, keystroke analytics, Bloom's taxonomy assessment engine, SQLite persistence, and WebLLM integration for a local browser-based demo.

I didn't write most of this code. I described what I wanted, reviewed what came back, and iterated. The architecture decisions were mine. The implementation was the machines'.

[INSERT: Screenshot of the Boxing Day commit history]

---

## The Vibe Code Era (January – March 2026)

"Vibe coding" is what happens when you treat AI code generation the way you'd treat a conversation with a senior developer. You don't write specs. You describe intent. You show screenshots of what's broken. You paste error messages. You say "make it look cooler" and somehow it does.

My development workflow became:

- **Claude Opus** (web chat): Architecture decisions, business strategy, competitive analysis, prompt writing. The brain.
- **Claude Sonnet** (Claude Code): Execution. Takes detailed prompts and ships clean code. 63 commits in 3 days at peak velocity.
- **Gemini** (Google AI Studio + Canvas): The runtime model powering the actual tutoring. Also used for worksheet LaTeX generation via Canvas.
- **Kimi K2.5**: Frontend design. Fed it the vision doc, got back a production-quality UI redesign that would've cost $15K+ from a design agency.

I'd code between students during tutoring sessions. I'd code during recess and lunch at my teaching placement. I'd code at night when I should've been doing uni assignments. The AI models don't care if you're working at 2am in your pyjamas — they'll ship the same quality code at any hour.

[INSERT: Screenshot of the GitHub contributions graph showing commit density]

---

## The Product Today

### What's Live at myaitutor.au

**AI Tutoring Chat** — Gemini-powered, with a "Mate" persona that speaks in Australian English. Fatigue-aware: it gives detailed explanations when you're fresh, gets concise when you're tired, and locks you out when you need a break.

**Worksheet Generator** — The crown jewel. Teachers select syllabus dot-points from the NESA curriculum, configure difficulty and question types, hit one button, and get a LaTeX-compiled PDF worksheet in under a minute. Includes TikZ diagrams, graph grids, chemical structures, working space, and auto-generated answer keys. This replaces 4+ hours of manual worksheet formatting.

[INSERT: Screenshot of the worksheet generator UI]
[INSERT: Screenshot of the exemplar PDF output]

**Past Papers Browser** — Curated links to THSC Online (655+ trial papers) and First Education's topic test maker, with an integrated exam timer. Full attribution, no sketchy iframe embedding.

**Free Demo Mode** — Runs entirely in the browser via WebLLM. SmolLM 360M or Llama 3.2 3B. No API key needed, no data leaves the device. Zero-cost introduction to the MAIT experience.

**AI Resources Library** — 17+ ready-to-use prompt templates for students, teachers, and general users.

**Keystroke Psychometrics** — Real-time typing pattern analysis that feeds into the wellness engine. WPM, dwell time, error rate, rhythm variance. The system can detect when you're frustrated before you even send the message.

### The Architecture

- **Frontend:** React 18 + Vite + Tailwind CSS. Hosted on GitHub Pages. Cost: $0.
- **Backend:** FastAPI + Python. Hosted on Render free tier. Cost: $0.
- **AI Runtime:** Gemini 3.1 Flash-Lite via BYOK (Bring Your Own Key). Students use free Google AI Studio keys. Cost to MAIT: $0.
- **Domain:** myaitutor.au. Cost: ~$30/year.
- **Total monthly infrastructure cost: $0.**

---

## The Economics That Break Your Brain

Gemini 3.1 Flash-Lite launched on March 4, 2026 at $0.25 per million input tokens and $1.50 per million output tokens. Let's do the maths on what this means for MAIT.

A typical tutoring session: ~30 exchanges, ~500 tokens input per exchange, ~300 tokens output. **Total cost per session: approximately 2 cents.**

MAIT's planned pricing is $15/week. Even if a student does 5 sessions a week, the inference cost is ~10 cents. That's a **99.3% gross margin on compute.**

The BYOK model makes the free tier genuinely free to operate. Students bring their own Gemini API key (takes 2 minutes to set up), and MAIT provides the syllabus context, persona, pedagogy, and wellness monitoring. The API calls go directly from the student's browser to Google. MAIT's servers aren't involved.

The paid tier's value proposition isn't "access to AI." Any student can open Google AI Studio for free. The paid tier is: privacy (zero data retention), persistent conversation history, keystroke wellness monitoring, and the convenience of not managing your own API key. You're paying for the education layer, not the intelligence.

---

## The Competitive Landscape Is Terrifying (For Them)

China's AI education market is projected at $20 billion in 2026. Squirrel AI has 24 million students and 3,000 learning centres. iFlytek's education division does $1.5 billion in revenue. These companies break middle school maths into 10,000+ "knowledge points" and use surveillance cameras to monitor student attention.

They optimise for test scores. I optimise for the student not wanting to kill themselves during exam season.

That's not hyperbole. 22% of adolescent suicides in China are directly attributed to study stress. China's "Double Reduction" policy tried to fix this by banning for-profit tutoring overnight — and all that happened was the money moved from human tutors to AI tablets that do the exact same thing through a screen.

Nobody in the $20 billion Chinese EdTech market is building a wellness engine. Nobody is using keystroke psychometrics to detect frustration. Nobody's AI tutor tells you to go touch grass.

MAIT's moat isn't features. It's values.

---

## The School Pipeline

I'm currently completing my SLSO (Student Learning Support Officer) placement at a primary school. I showed the worksheet generator to some staff. The deputy principal saw it and said he wants to show it to the CEO.

I didn't pitch anyone. I didn't send cold emails. I built something useful, showed it to people in the building I was already in, and they pulled me upward.

The plan for the CEO meeting: I click 5 times on the worksheet generator, it opens Gemini, a print-ready PDF appears in 45 seconds, and I shut up and let them ask questions.

I've also sent partnership outreach to THSC Online (the biggest HSC trial paper archive in NSW) and First Education (a 5-campus tutoring company in Sydney). Both are featured on MAIT's site with proper attribution. I'm not asking for money — I'm offering to make their existing resources more accessible through MAIT's platform.

[INSERT: Screenshot of the past papers page with attribution cards]

---

## The Bug Report (Keeping It Real)

This is not a clean success story. Here's what went wrong along the way:

- Google OAuth took me three days to debug. The error was a missing `client_id` parameter. Three. Days.
- Gemini deleted an entire chat's worth of LaTeX code mid-session because the context got too long. No warning, no recovery. I rage-feedbacked Google on four separate accounts.
- I committed `.DS_Store` to the repo like an amateur and didn't notice for weeks.
- CORS was set to `allow_origins=["*"]` in production because I copied it from development config and forgot.
- My backend had zero rate limiting. Anyone could've hammered my Gemini API key.
- I still don't have a privacy policy page. This is bad and I know it's bad and it's on the list.
- I have done approximately zero automated testing.
- The mobile responsiveness of at least three pages is "questionable."

I'm not sharing these to be self-deprecating. I'm sharing them because every "I built X in Y days" post that omits the chaos is lying to you. Vibe coding is fast, but it's not clean. You ship first and fix later, or you never ship.

---

## What I Actually Learned

**The vision doc matters more than the code.** Every AI model I worked with produced dramatically better output when I gave it architectural context. The 37-page doc wasn't procrastination — it was the prompt engineering that made everything else possible.

**AI models have complementary strengths.** Claude thinks. Gemini executes runtime inference cheaply. Kimi designs. Using one model for everything is like using a screwdriver for every job. The multi-model swarm is the unlock.

**Your cost structure is not your pricing.** MAIT costs me near nothing to run. That doesn't mean it's worth nothing. It means my margins are insane. Price based on what you're replacing (teacher hours, commercial LMS licences), not what it costs you.

**Distribution is everything.** I'm inside a school already. The deputy principal is my distribution channel. The worksheet generator is my Trojan horse. No amount of features matter if nobody uses them.

**Wellness features aren't just ethical — they're a moat.** Nobody else is building this. In a market full of products trying to maximise screen time, being the one that tells students to take a break is a genuine differentiator. It's also the right thing to do.

**Perfect is the enemy of shipped.** MAIT has no automated tests, inconsistent mobile responsiveness, and a privacy policy that exists only in my head. It's also live, being used by real students, and generating institutional interest. I'd rather have a messy product in the world than a perfect product in a repo.

---

## The $3/Day Revolution

Here's the thing nobody writing about AI seems to want to say plainly: the barrier to building software is effectively gone.

I'm not a special case. I'm a education student with a tutoring business and a $3/day AI budget. The tools I used — Claude, Gemini, Kimi, GitHub Pages, Render — are available to literally anyone with an internet connection and a credit card.

What I brought that the AI couldn't: domain expertise (I've taught in 7+ high schools), the lived experience that informed the wellness engine, the relationships that opened the school door, and the stubborn refusal to accept that AI tutoring has to be surveillance-based to work.

The models built the code. I built the thing worth building.

---

## What's Next

- School pilot (one Year 12 Maths Advanced class, one term)
- BYOK (Bring Your Own Key) free tier launch
- Conversation history persistence
- Streaming responses for real-time "Mate is typing..." effect
- The "Guess-First" pedagogical workflow
- Extension 1 and Extension 2 syllabus content
- And eventually, the 3D avatar system from the vision doc, because why not dream big when the foundation is solid

---

*MAIT is open source at github.com/mentalmathsmentor/myaitutor. The product is live at myaitutor.au. I'm at darayat.substack.com.*

*If you're a teacher who wants early access, a school looking for a pilot, or an investor who thinks AI education should care about the student — I'm at mentor@mentalmaths.au.*

*Built with care in Sydney, Australia. Because every student deserves a tutor who actually cares if they're okay.*
