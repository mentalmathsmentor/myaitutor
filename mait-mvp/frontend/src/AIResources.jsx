import { useState } from 'react'
import { GraduationCap, BookOpen, Sparkles, Copy, Check, ChevronDown, ChevronUp, Lightbulb, Code2, FileText, Wand2, Users } from 'lucide-react'

function CopyButton({ text }) {
    const [copied, setCopied] = useState(false)
    const handleCopy = () => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }
    return (
        <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs font-display text-mait-cyan hover:text-accent transition-colors">
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy'}
        </button>
    )
}

function PromptCard({ title, description, prompt, icon }) {
    const [expanded, setExpanded] = useState(false)
    return (
        <div className="glass-card rounded-xl p-5 hover:border-primary/30 transition-all duration-300">
            <div className="flex items-start justify-between gap-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
                <div className="flex items-start gap-3 flex-1">
                    <div className="bg-white/5 w-10 h-10 rounded-lg flex items-center justify-center border border-white/10 shrink-0 mt-0.5">
                        {icon}
                    </div>
                    <div>
                        <h4 className="font-display text-sm font-bold text-white">{title}</h4>
                        <p className="text-white/60 text-xs mt-1 leading-relaxed">{description}</p>
                    </div>
                </div>
                <button className="text-white/60 hover:text-white transition-colors shrink-0 mt-1">
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
            </div>
            {expanded && (
                <div className="mt-4 pt-4 border-t border-white/5">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-display text-white/60 uppercase tracking-wider">Prompt</span>
                        <CopyButton text={prompt} />
                    </div>
                    <pre className="bg-white/5 border border-white/10 rounded-lg p-4 text-xs text-white/90 whitespace-pre-wrap leading-relaxed font-mono overflow-x-auto max-h-80 overflow-y-auto">
                        {prompt}
                    </pre>
                </div>
            )}
        </div>
    )
}

const STUDENT_PROMPTS = [
    {
        title: "Homework Helper",
        description: "Paste any homework question and get step-by-step guidance without being given the answer directly.",
        icon: <GraduationCap size={18} className="text-mait-cyan" />,
        prompt: `I'm a high school student working on homework. Here is a question I need help with:

[PASTE YOUR QUESTION HERE]

Please:
1. Don't give me the answer directly
2. Ask me what I think the first step is
3. Guide me through the solution step by step
4. If I get stuck, give me a hint rather than the answer
5. Once I solve it, confirm if I'm correct and explain why

Keep your responses short and encouraging.`
    },
    {
        title: "Exam Study Summariser",
        description: "Turn your notes or a topic into a concise revision sheet with key formulas and concepts.",
        icon: <FileText size={18} className="text-accent" />,
        prompt: `I'm studying for my exam and need a concise revision summary.

Topic: [YOUR TOPIC, e.g. "Integration by Parts" or "Shakespearean Sonnets"]
Subject: [YOUR SUBJECT, e.g. "HSC Maths Advanced" or "Year 12 English"]

Please create:
1. A brief overview (2-3 sentences)
2. Key formulas/concepts I MUST know (bullet points)
3. Common mistakes students make
4. 3 practice questions (easy, medium, hard)
5. Memory tricks or mnemonics if applicable

Format it cleanly so I can screenshot it for revision.`
    },
    {
        title: "Explain Like I'm 10",
        description: "Get any complex concept explained in the simplest possible language with everyday examples.",
        icon: <Lightbulb size={18} className="text-secondary" />,
        prompt: `Explain this concept to me like I'm 10 years old. Use everyday examples, no jargon, and make it fun.

Concept: [PASTE CONCEPT HERE, e.g. "derivatives in calculus" or "supply and demand"]

Rules:
- Use analogies from things a teenager would know (games, social media, sports)
- No technical terms without explaining them first
- Keep it under 200 words
- End with a "test yourself" question to check I understood`
    },
    {
        title: "Essay Structure Coach",
        description: "Get help structuring an essay with a clear thesis, arguments, and evidence plan.",
        icon: <BookOpen size={18} className="text-mait-cyan" />,
        prompt: `I need to write an essay and want help with structure (NOT writing it for me).

Essay question: [PASTE YOUR ESSAY QUESTION]
Subject: [YOUR SUBJECT]
Word limit: [WORD LIMIT]

Please help me:
1. Develop a clear thesis statement (give me 2-3 options)
2. Suggest 3 body paragraph topics that support my thesis
3. For each paragraph, suggest what evidence or examples I could use
4. Give me a strong opening sentence idea
5. Suggest linking phrases between paragraphs

Don't write the essay - just give me the skeleton so I can write it myself.`
    },
    {
        title: "Practice Question Generator",
        description: "Generate practice questions tailored to your topic and difficulty level.",
        icon: <Wand2 size={18} className="text-accent" />,
        prompt: `Generate practice questions for me to study.

Topic: [YOUR TOPIC]
Subject: [YOUR SUBJECT]
Difficulty: [easy / medium / hard / exam-level]
Number of questions: [HOW MANY, e.g. 5]

Requirements:
- Make them similar to real exam questions
- Include a mix of short answer and longer problems
- Provide answers SEPARATELY at the end (so I can try first)
- Mark which syllabus dot point each question covers if applicable
- For maths: include worked solutions, not just final answers`
    },
]

const TEACHER_PROMPTS = [
    {
        title: "LaTeX Worksheet Generator",
        description: "Generate professional, print-ready maths worksheets with proper equation formatting.",
        icon: <Code2 size={18} className="text-mait-cyan" />,
        prompt: `You are a LaTeX document generator for high school mathematics. Generate a clean, printable worksheet.

Topic: [TOPIC, e.g. "Differentiation - Chain Rule"]
Year level: [e.g. "Year 12 HSC Advanced"]
Number of questions: [e.g. 10]
Difficulty progression: Start easy, end with exam-level

Requirements:
- Output ONLY valid LaTeX code (no markdown, no explanation)
- Use this preamble:
\\documentclass[11pt, a4paper]{article}
\\usepackage[margin=2cm]{geometry}
\\usepackage{amsmath, amssymb, tikz}
\\usetikzlibrary{arrows.meta, calc}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{1em}
\\begin{document}

- Include a title with topic and date
- Number all questions
- Leave appropriate working space between questions
- Use \\frac{}{} for fractions (never a/b)
- Include a separate answer key section at the end
- Use TikZ for any graphs or diagrams needed

End with \\end{document}`
    },
    {
        title: "Lesson Plan Builder",
        description: "Create a structured lesson plan with learning objectives, activities, and assessment.",
        icon: <BookOpen size={18} className="text-accent" />,
        prompt: `Create a detailed lesson plan for my class.

Subject: [SUBJECT]
Topic: [SPECIFIC TOPIC]
Year level: [YEAR LEVEL]
Duration: [e.g. 50 minutes]
Class size: [NUMBER]
Prior knowledge: [WHAT STUDENTS ALREADY KNOW]

Please include:
1. Learning objectives (2-3, using Bloom's taxonomy verbs)
2. Syllabus outcomes addressed (if NSW curriculum, use NESA codes)
3. Warm-up activity (5 min) - something engaging to activate prior knowledge
4. Direct instruction (10 min) - key concepts with suggested board notes
5. Guided practice (15 min) - worked examples to do together
6. Independent practice (15 min) - student activity or worksheet
7. Plenary/Exit ticket (5 min) - quick check for understanding
8. Differentiation strategies for:
   - Students who need support
   - Students who need extension
9. Resources needed`
    },
    {
        title: "Marking Rubric Creator",
        description: "Generate a detailed marking rubric aligned to syllabus outcomes.",
        icon: <FileText size={18} className="text-secondary" />,
        prompt: `Create a marking rubric/criteria sheet for an assessment task.

Assessment type: [e.g. "Investigation task", "Essay", "Exam"]
Subject: [SUBJECT]
Topic: [TOPIC]
Year level: [YEAR LEVEL]
Total marks: [TOTAL]
Syllabus outcomes: [LIST RELEVANT OUTCOMES]

Please create:
1. A table with criteria, mark ranges, and descriptors
2. Use 4 levels: Limited (0-25%), Developing (25-50%), Proficient (50-75%), Advanced (75-100%)
3. For each criterion, provide specific descriptors of what student work looks like at each level
4. Include marks allocation for each criterion
5. Add examiner notes/tips for consistent marking
6. Include sample feedback comments for each level

Format as a clean table I can paste into Word or Google Docs.`
    },
    {
        title: "Differentiated Task Modifier",
        description: "Take any existing task and create scaffolded, standard, and extension versions.",
        icon: <Users size={18} className="text-mait-cyan" />,
        prompt: `I have an existing task/question that I need to differentiate for my class.

Original task: [PASTE THE TASK OR QUESTION HERE]
Subject: [SUBJECT]
Year level: [YEAR LEVEL]

Please create 3 versions:

1. SCAFFOLDED VERSION (for students who need support):
   - Break the task into smaller steps
   - Provide sentence starters or formula reminders
   - Include visual aids or worked example structures
   - Reduce complexity while maintaining the same learning outcome

2. STANDARD VERSION (the original, cleaned up if needed):
   - Keep as-is or slightly refine wording
   - Add success criteria so students know what a good response looks like

3. EXTENSION VERSION (for students who finish early or need challenge):
   - Add complexity, open-ended elements, or real-world application
   - Require higher-order thinking (analysis, evaluation, creation)
   - Could include a "convince me why" or "what if" component`
    },
]

const GENERAL_PROMPTS = [
    {
        title: "Personal AI Tutor Setup",
        description: "Turn any AI chatbot into a patient, personalised tutor for any subject.",
        icon: <Sparkles size={18} className="text-mait-cyan" />,
        prompt: `You are my personal tutor. Here are your rules:

MY DETAILS:
- Name: [YOUR NAME]
- Level: [e.g. "Year 12", "University first year", "Complete beginner"]
- Subject: [WHAT YOU'RE STUDYING]
- Learning style: [e.g. "I learn best with examples", "I need visual explanations", "I like analogies"]

YOUR BEHAVIOUR:
- Be patient and encouraging, never condescending
- Ask me questions before explaining - make me think first
- Break complex ideas into small, digestible chunks
- Use analogies and real-world examples
- When I'm wrong, don't just correct me - ask me to reconsider
- Celebrate small wins ("Nice thinking!" "You're getting it!")
- Check my understanding regularly ("Does that make sense?" "Can you explain it back to me?")
- If I'm struggling, simplify your language
- If I'm breezing through, increase the challenge

Start by asking me what I'd like to learn today.`
    },
    {
        title: "AI for Career Exploration",
        description: "Use AI to explore career paths, required skills, and create a development plan.",
        icon: <Lightbulb size={18} className="text-accent" />,
        prompt: `I want to explore career options. Help me think through this.

My interests: [LIST 3-5 THINGS YOU ENJOY]
My strengths: [LIST 3-5 THINGS YOU'RE GOOD AT]
Subjects I like: [YOUR FAVOURITE SUBJECTS]
What matters to me: [e.g. "creativity", "helping people", "good salary", "work-life balance"]

Please:
1. Suggest 5 career paths that match my profile (include some I might not have considered)
2. For each career, tell me:
   - What a typical day looks like
   - Required qualifications
   - Salary range in Australia
   - Growth outlook (is this field growing?)
3. Suggest 3 things I could do THIS WEEK to explore my top choice
4. Recommend free online resources or courses to get started`
    },
    {
        title: "Research Assistant",
        description: "Turn AI into a research partner that helps you find, evaluate, and synthesise information.",
        icon: <BookOpen size={18} className="text-secondary" />,
        prompt: `You are my research assistant. Help me research a topic thoroughly.

Topic: [YOUR RESEARCH TOPIC]
Purpose: [e.g. "school assignment", "personal interest", "work project"]
Depth: [e.g. "overview", "detailed", "expert-level"]

Please:
1. Give me a structured overview of the topic (key areas to cover)
2. List the most important facts and statistics
3. Present BOTH sides of any debate or controversy
4. Identify common misconceptions
5. Suggest 5 credible sources I should read (real publications, not made-up URLs)
6. Highlight what's still unknown or being researched
7. Create a "Key Terms" glossary for any jargon

IMPORTANT: If you're not sure about something, say so. Don't make up facts. I'd rather have "I'm not certain about this" than a confident wrong answer.`
    },
    {
        title: "Weekly Study Planner",
        description: "Create a personalised study schedule that accounts for your energy levels and commitments.",
        icon: <FileText size={18} className="text-mait-cyan" />,
        prompt: `Help me create a realistic weekly study plan.

My subjects: [LIST ALL YOUR SUBJECTS]
Upcoming assessments: [LIST DATES AND WHAT THEY'RE FOR]
My schedule constraints:
- School hours: [e.g. "8am-3pm Mon-Fri"]
- Other commitments: [e.g. "Sport Tuesday/Thursday 4-6pm", "Part-time job Saturday"]
- When I'm most productive: [e.g. "mornings", "after dinner"]
- How long I can focus before needing a break: [e.g. "25 minutes"]

Please create:
1. A weekly timetable (Mon-Sun) with specific time slots
2. Prioritise subjects by urgency (upcoming assessments first)
3. Include short breaks (5 min every 25 min) and longer breaks (15 min every 2 hours)
4. Leave buffer time for when things take longer than expected
5. Include at least one full rest day
6. For each study block, specify WHAT to do (not just "study maths" but "practice integration questions from textbook Ch.7")

Use the Pomodoro technique format where possible.`
    },
    {
        title: "What Can AI Actually Do?",
        description: "A prompt that shows you the full range of what AI assistants are capable of.",
        icon: <Wand2 size={18} className="text-accent" />,
        prompt: `I'm new to using AI and want to understand what you can actually help me with. Give me a practical tour.

Please show me examples of what you can do by actually doing each one briefly:

1. EXPLAIN something complex simply (pick any science concept)
2. WRITE something creative (a 4-line poem about studying)
3. ANALYSE something (take this sentence and identify the persuasive techniques: "Every student deserves a world-class education, and technology is the key.")
4. CODE something (write a simple Python script that calculates compound interest)
5. TRANSLATE between formats (convert this to bullet points: "The mitochondria is the powerhouse of the cell. It produces ATP through cellular respiration.")
6. BRAINSTORM ideas (give me 5 creative ways to remember the order of operations in maths)
7. ROLE-PLAY a scenario (pretend you're a job interviewer and ask me one question)

After each example, rate its reliability on a scale:
- HIGH: AI is very reliable for this
- MEDIUM: AI is decent but double-check facts
- LOW: AI might hallucinate, always verify`
    },
]

export default function AIResources() {
    const [activeTab, setActiveTab] = useState('students')

    const tabs = [
        { id: 'students', label: 'Students', icon: <GraduationCap size={16} />, color: 'text-mait-cyan' },
        { id: 'teachers', label: 'Teachers', icon: <BookOpen size={16} />, color: 'text-mait-cosmic' },
        { id: 'general', label: 'Everyone', icon: <Sparkles size={16} />, color: 'text-mait-neon' },
    ]

    const prompts = {
        students: STUDENT_PROMPTS,
        teachers: TEACHER_PROMPTS,
        general: GENERAL_PROMPTS,
    }

    const descriptions = {
        students: "Copy these prompts, paste them into any AI chatbot (ChatGPT, Gemini, Claude), and start studying smarter. No setup required.",
        teachers: "System prompts and templates to save hours of prep work. Generate worksheets, lesson plans, and rubrics in seconds.",
        general: "Discover what AI can do for anyone. From personal tutoring to career planning, these prompts work everywhere.",
    }

    return (
        <div className="min-h-screen bg-cosmic noise-overlay text-white selection:bg-mait-cyan/30">
            <div className="fixed inset-0 pointer-events-none opacity-[0.02]"
                style={{
                    backgroundImage: `linear-gradient(rgba(0, 240, 255, 0.1) 1px, transparent 1px),
                                     linear-gradient(90deg, rgba(0, 240, 255, 0.1) 1px, transparent 1px)`,
                    backgroundSize: '60px 60px'
                }}
            />

            {/* Title */}
            <div className="relative z-10 text-center px-6 pt-4 pb-8">
                <div className="tag animate-reveal animate-reveal-2 animate-float mb-6 inline-flex">
                    <Sparkles size={12} />
                    FREE RESOURCES
                </div>
                <h2 className="animate-reveal animate-reveal-3 text-3xl md:text-5xl font-display font-bold tracking-tight mb-4">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-mait-cyan to-mait-neon">AI Resources</span>
                </h2>
                <p className="animate-reveal animate-reveal-4 text-white/60 text-lg max-w-lg mx-auto leading-relaxed">
                    Free prompts, system prompts, and guides. Copy, paste, and start using AI effectively.
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="relative z-10 flex justify-center gap-2 px-6 mb-8 animate-reveal animate-reveal-5">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-display text-sm transition-all duration-300 border ${activeTab === tab.id
                            ? 'bg-primary/15 border-primary/40 text-mait-cyan'
                            : 'bg-white/5 border-white/10 text-white/60 hover:border-primary/20 hover:text-white'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Description */}
            <div className="relative z-10 text-center px-6 mb-8">
                <p className="text-white/60 text-sm max-w-xl mx-auto">
                    {descriptions[activeTab]}
                </p>
            </div>

            {/* Prompt Cards */}
            <div className="relative z-10 max-w-3xl mx-auto px-6 pb-16 space-y-4">
                {prompts[activeTab].map((prompt, idx) => (
                    <div key={prompt.title} className="animate-reveal" style={{ animationDelay: `${idx * 80}ms` }}>
                        <PromptCard {...prompt} />
                    </div>
                ))}
            </div>

            {/* How to Use Section */}
            <section className="relative z-10 max-w-3xl mx-auto px-6 pb-16">
                <div className="divider-glow mb-8" />
                <h3 className="font-display text-xl font-bold mb-6 text-center">How to Use These Prompts</h3>
                <div className="grid md:grid-cols-3 gap-4">
                    <div className="glass-card rounded-xl p-5 text-center">
                        <div className="text-3xl font-display font-bold text-mait-cyan mb-2">1</div>
                        <h4 className="font-display text-sm font-bold mb-1">Copy</h4>
                        <p className="text-white/60 text-xs">Click the copy button on any prompt above</p>
                    </div>
                    <div className="glass-card rounded-xl p-5 text-center">
                        <div className="text-3xl font-display font-bold text-accent mb-2">2</div>
                        <h4 className="font-display text-sm font-bold mb-1">Paste</h4>
                        <p className="text-white/60 text-xs">Open any AI chatbot and paste the prompt</p>
                    </div>
                    <div className="glass-card rounded-xl p-5 text-center">
                        <div className="text-3xl font-display font-bold text-secondary mb-2">3</div>
                        <h4 className="font-display text-sm font-bold mb-1">Customise</h4>
                        <p className="text-white/60 text-xs">Replace the [BRACKETS] with your details</p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 py-6 text-center border-t border-white/5">
                <p className="text-white/60 text-sm font-display">
                    Built by <a href="https://mentalmaths.au" target="_blank" rel="noopener noreferrer" className="text-mait-cyan hover:text-accent transition-colors">Mental Maths Mentor</a> · Free for everyone
                </p>
            </footer>
        </div>
    )
}
