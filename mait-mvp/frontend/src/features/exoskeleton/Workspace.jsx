import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, Dumbbell, FileOutput, Flame, Layers3, Lightbulb, Loader2, MessageSquare, Send, Sparkles, Target, Trash2 } from 'lucide-react'
import { useExoskeletonStore } from '@/stores/useExoskeletonStore'
import { useCanvasStore } from '@/stores/canvasStore'
import CadenceRenderer from './CadenceRenderer'
import StartupWizard from './StartupWizard'
import mateAvatar from '@/assets/mate-avatar.webp'

// One-way deck→Canvas handoff (C4): server builds the element list from the
// session deck; we seed the Canvas store and open the IDE. Edits there do not
// sync back to question_log in V1.
function seedCanvasFromExport(exportPayload) {
  const now = new Date().toISOString()
  const elements = (exportPayload.elements || []).map((element) => ({
    id: crypto.randomUUID(),
    kind: element.kind,
    sortKey: element.sort_key,
    contentLatex: element.content_latex,
    label: element.label || 'Element',
    isLocked: Boolean(element.is_locked),
    isCollapsed: Boolean(element.is_collapsed),
    versionId: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  }))
  const canvas = useCanvasStore.getState()
  canvas.setDocument({
    id: `deck_${Date.now()}`,
    title: exportPayload.title || 'Session deck',
    kind: 'artifact',
    source: 'chat',
    createdAt: now,
    updatedAt: now,
  })
  canvas.setElements(elements)
}

// Attach question_log ids (generation order) onto question items so
// CerberusSuggestions / OutcomeButtons can key off item.qlog_id.
function enrichPartsWithQuestionIds(parts, questionIds) {
  if (!questionIds?.length) return parts
  let cursor = 0
  return (parts || []).map((part) => {
    if (part.type !== 'question_set' || !part.questions) return part
    return {
      ...part,
      questions: part.questions.map((q) => ({ ...q, qlog_id: questionIds[cursor++] })),
    }
  })
}

function buildCerberusItems(parts, intent, student) {
  const levelTag = `Year ${student.year_level} ${student.profile?.ability_tier || 'Core'}`
  const items = []
  for (const part of parts || []) {
    if (part.type !== 'question_set' || !part.questions) continue
    for (const q of part.questions) {
      if (!q.qlog_id) continue
      items.push({
        question_log_id: q.qlog_id,
        question_text: q.question_latex,
        worked_solution: q.teacher_answer_latex || '(no worked solution provided)',
        outcome_or_bloom_tag: intent,
        student_level_tag: levelTag,
      })
    }
  }
  return items
}

function CheckinModal({ session, onClose }) {
  const sessionCheckin = useExoskeletonStore((state) => state.sessionCheckin)
  const [contextRelevance, setContextRelevance] = useState(3)
  const [cerberusUsefulness, setCerberusUsefulness] = useState(3)
  const [frictionNote, setFrictionNote] = useState('')
  const [dump, setDump] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setSaving(true)
    setError('')
    try {
      await sessionCheckin(session.id, {
        context_relevance: contextRelevance,
        cerberus_usefulness: cerberusUsefulness,
        friction_note: frictionNote.trim() || null,
        dump: dump.trim() || null,
      })
      onClose(true)
    } catch (checkinError) {
      setError(checkinError.message || 'Check-in failed')
      setSaving(false)
    }
  }

  const scaleRow = (label, value, setValue) => (
    <label className="block">
      <span className="mb-1 block text-xs text-white/55">{label}</span>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setValue(n)}
            className={`h-9 w-9 rounded-[6px] border text-sm transition ${
              value === n
                ? 'border-cyan-300/70 bg-cyan-300/20 text-cyan-100'
                : 'border-white/12 bg-slate-900/70 text-white/50 hover:border-cyan-300/35'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </label>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <div className="w-full max-w-md space-y-4 rounded-[10px] border border-white/12 bg-slate-950 p-5">
        <h2 className="text-lg font-semibold text-white">End session — 10-second check-in</h2>
        {scaleRow('Was the student context relevant?', contextRelevance, setContextRelevance)}
        {scaleRow('Was Cerberus useful?', cerberusUsefulness, setCerberusUsefulness)}
        <label className="block">
          <span className="mb-1 block text-xs text-white/55">Friction note (what broke / annoyed you?)</span>
          <input
            value={frictionNote}
            onChange={(event) => setFrictionNote(event.target.value)}
            className="h-10 w-full rounded-[8px] border border-white/12 bg-slate-900 px-3 text-sm text-white outline-none focus:border-cyan-300/60"
            placeholder="optional"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-white/55">Session brain-dump (feeds next session's memory)</span>
          <textarea
            value={dump}
            onChange={(event) => setDump(event.target.value)}
            rows={3}
            className="w-full rounded-[8px] border border-white/12 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/60"
            placeholder="optional — what clicked, what fell apart, what to hit next time"
          />
        </label>
        {error && <p className="text-xs text-red-300">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onClose(false)}
            className="rounded-[8px] border border-white/15 px-4 py-2 text-sm text-white/70 hover:border-white/35"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={submit}
            className="rounded-[8px] bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Complete session'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AddStudentForm({ onDone }) {
  const initStudent = useExoskeletonStore((state) => state.initStudent)
  const [slug, setSlug] = useState('')
  const [year, setYear] = useState(9)
  const [subject, setSubject] = useState('Stage 5 Mathematics')
  const [tier, setTier] = useState('Core')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!/^S[0-9]+$/.test(slug)) {
      setError('Alias must be S1, S2, ... (no real names — PII rule)')
      return
    }
    setSaving(true)
    setError('')
    try {
      await initStudent({
        name: slug,
        subject,
        year_level: Number(year),
        profile: { ability_tier: tier },
      })
      onDone()
    } catch (submitError) {
      setError(submitError.message || 'Failed to add student')
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2 rounded-[8px] border border-cyan-300/25 bg-slate-900/80 p-3">
      <input
        value={slug}
        onChange={(event) => setSlug(event.target.value.toUpperCase())}
        placeholder="Alias slug (S1, S2, ...)"
        className="h-9 w-full rounded-[6px] border border-white/12 bg-slate-950 px-2.5 text-sm text-white outline-none focus:border-cyan-300/60"
      />
      <div className="flex gap-2">
        <select
          value={year}
          onChange={(event) => setYear(event.target.value)}
          className="h-9 flex-1 rounded-[6px] border border-white/12 bg-slate-950 px-2 text-sm text-white"
        >
          {[7, 8, 9, 10, 11, 12].map((y) => (
            <option key={y} value={y}>Year {y}</option>
          ))}
        </select>
        <select
          value={tier}
          onChange={(event) => setTier(event.target.value)}
          className="h-9 flex-1 rounded-[6px] border border-white/12 bg-slate-950 px-2 text-sm text-white"
        >
          {['Core', 'Core+Path', 'Band 3/4', 'Band 5/6'].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <input
        value={subject}
        onChange={(event) => setSubject(event.target.value)}
        placeholder="Subject (corpus string)"
        className="h-9 w-full rounded-[6px] border border-white/12 bg-slate-950 px-2.5 text-sm text-white outline-none focus:border-cyan-300/60"
      />
      {error && <p className="text-xs text-red-300">{error}</p>}
      <button
        type="button"
        disabled={saving}
        onClick={submit}
        className="w-full rounded-[6px] bg-cyan-300 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-50"
      >
        {saving ? 'Adding...' : 'Add student'}
      </button>
    </div>
  )
}

const TOOLS = [
  { intent: 'warmup', label: 'Warmup', iconText: '🎯', Icon: Target },
  { intent: 'lesson_plan', label: 'Lesson Plan', iconText: '📋', Icon: Layers3 },
  { intent: 'practice_set', label: 'Practice Set', iconText: '🏋️', Icon: Dumbbell },
  { intent: 'challenge', label: 'Boss Challenge', iconText: '⚡', Icon: Flame },
  { intent: 'explain_alt', label: 'Explain Another Way', iconText: '🪜', Icon: Lightbulb },
  { intent: 'activity', label: 'Activity', iconText: '🎲', Icon: Activity },
]

const EMPTY_MESSAGES = []
const EMPTY_TOPICS = []

function buildOfflineResponse(intent, label, topic, refinements) {
  const context = refinements ? `${topic}. ${refinements}` : topic
  if (intent === 'practice_set' || intent === 'challenge') {
    return {
      parts: [
        {
          type: 'text',
          tier: 'all',
          title: `${label} draft`,
          content: `Backend is offline, so this is a local UI draft for **${topic}**. Once FastAPI is running, this block will be replaced by RAG-grounded MAIT output.`,
        },
        {
          type: 'question_set',
          tier: intent === 'challenge' ? 'extension' : 'core',
          title: intent === 'challenge' ? 'Boss challenge' : 'Core practice',
          items: [
            {
              question_latex: `Write one teacher-ready question for ${context}.`,
              teacher_answer_latex: 'Use the RAG-grounded backend response once available.',
              marks: intent === 'challenge' ? 4 : 2,
            },
          ],
        },
      ],
    }
  }

  if (intent === 'activity') {
    return {
      parts: [
        {
          type: 'text',
          tier: 'all',
          title: 'Local UI mode',
          content: `Backend is offline. Showing an activity-shaped preview for **${topic}** so the workspace flow can continue.`,
        },
        {
          type: 'activity',
          tier: 'all',
          title: 'Quick table challenge',
          content: `Students work in pairs to create one worked example and one deliberate error for ${context}. Swap with another pair, identify the error, then discuss the fix.`,
        },
      ],
    }
  }

  return {
    parts: [
      {
        type: 'text',
        tier: 'all',
        title: `${label} preview`,
        content: `Backend is offline. This local preview confirms the texting cadence and layout for **${topic}**. The live version will use exact topic RAG and Gemini output.`,
      },
      {
        type: 'glass_box',
        tier: 'all',
        title: 'Next step',
        content: 'Start the FastAPI backend on port 8000 to replace local preview content with real Tutor Exoskeleton responses.',
      },
    ],
  }
}

function ToolButton({ tool, disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onClick(tool.intent, tool.label)}
      className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] border border-white/10 bg-slate-900/88 px-3 text-sm text-white/78 transition hover:border-cyan-300/45 hover:bg-cyan-300/10 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-45"
      title={tool.label}
    >
      <span aria-hidden="true">{tool.iconText}</span>
      <span className="hidden whitespace-nowrap xl:inline">{tool.label}</span>
    </button>
  )
}

function MessageBubble({ message }) {
  const isTeacher = message.role === 'teacher'

  return (
    <div className={`flex ${isTeacher ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[88%] rounded-[8px] px-4 py-3 shadow-lg ${
          isTeacher
            ? 'bg-cyan-300 text-slate-950 shadow-cyan-950/20'
            : 'border border-white/10 bg-slate-950/70 text-white shadow-black/30'
        }`}
      >
        {isTeacher ? (
          <div>
            <p className="text-sm font-semibold">{message.title}</p>
            <p className="mt-1 text-sm opacity-80">{message.content}</p>
          </div>
        ) : (
          <CadenceRenderer parts={message.parts} />
        )}
      </div>
    </div>
  )
}

export default function Workspace() {
  const cohorts = useExoskeletonStore((state) => state.cohorts)
  const activeClass = useExoskeletonStore((state) => state.activeClass)
  const activeThread = useExoskeletonStore((state) => state.activeThread)
  const setActiveWorkspace = useExoskeletonStore((state) => state.setActiveWorkspace)
  const setTopicsForSubject = useExoskeletonStore((state) => state.setTopicsForSubject)
  const addMessage = useExoskeletonStore((state) => state.addMessage)
  
  const isWizardOpen = useExoskeletonStore((state) => state.isWizardOpen)
  const setWizardOpen = useExoskeletonStore((state) => state.setWizardOpen)
  const fetchClasses = useExoskeletonStore((state) => state.fetchClasses)
  const fetchThreads = useExoskeletonStore((state) => state.fetchThreads)
  const deleteClass = useExoskeletonStore((state) => state.deleteClass)

  const students = useExoskeletonStore((state) => state.students)
  const activeStudent = useExoskeletonStore((state) => state.activeStudent)
  const activeSession = useExoskeletonStore((state) => state.activeSession)
  const fetchStudents = useExoskeletonStore((state) => state.fetchStudents)
  const setActiveStudent = useExoskeletonStore((state) => state.setActiveStudent)
  const setActiveSession = useExoskeletonStore((state) => state.setActiveSession)
  const cerberusVerify = useExoskeletonStore((state) => state.cerberusVerify)

  const [showAddStudent, setShowAddStudent] = useState(false)
  const [showCheckin, setShowCheckin] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const navigate = useNavigate()

  const hasDeck = useExoskeletonStore((state) => {
    if (!activeStudent) return false
    const threadKey = `student-${activeStudent.id}`
    return (state.messagesByThread[threadKey] || []).some(
      (message) => message.role === 'assistant'
        && (message.parts || []).some((part) => part.type === 'question_set')
    )
  })

  const handleDeckToCanvas = async () => {
    if (!activeSession) return
    setIsExporting(true)
    setError('')
    try {
      const response = await fetch(`/api/sessions/${activeSession.id}/deck-export`, { method: 'POST' })
      if (!response.ok) {
        const detail = await response.text()
        throw new Error(detail || 'Deck export failed')
      }
      seedCanvasFromExport(await response.json())
      navigate('/canvas')
    } catch (exportError) {
      setError(exportError.message || 'Deck export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const activeThreadId = activeStudent ? `student-${activeStudent.id}` : activeThread?.id
  const activeSubject = activeStudent?.subject || activeClass?.subject || ''
  const messages = useExoskeletonStore((state) => (
    activeThreadId ? state.messagesByThread[activeThreadId] || EMPTY_MESSAGES : EMPTY_MESSAGES
  ))
  const topics = useExoskeletonStore((state) => (
    activeSubject ? state.topicCache[activeSubject] || EMPTY_TOPICS : EMPTY_TOPICS
  ))
  const topicsLoaded = useExoskeletonStore((state) => (
    activeSubject ? Object.prototype.hasOwnProperty.call(state.topicCache, activeSubject) : false
  ))

  const [selectedTopic, setSelectedTopic] = useState('')
  const [refinements, setRefinements] = useState('')
  const [chatInput, setChatInput] = useState('')
  const [isLoadingTopics, setIsLoadingTopics] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  useEffect(() => {
    if (!activeSubject) return
    if (topicsLoaded) return

    let cancelled = false
    async function fetchTopics() {
      setIsLoadingTopics(true)
      setError('')
      try {
        const response = await fetch(`/api/topics?subject=${encodeURIComponent(activeSubject)}`)
        if (!response.ok) throw new Error('Could not load topics')
        const payload = await response.json()
        if (!cancelled) setTopicsForSubject(activeSubject, payload.topics || [])
      } catch (topicError) {
        if (!cancelled) {
          setTopicsForSubject(activeSubject, [])
          setError('Topic API offline. Type a topic manually for now.')
        }
      } finally {
        if (!cancelled) setIsLoadingTopics(false)
      }
    }

    fetchTopics()
    return () => {
      cancelled = true
    }
  }, [activeSubject, setTopicsForSubject, topicsLoaded])

  useEffect(() => {
    if (topics.length && !topics.includes(selectedTopic)) {
      setSelectedTopic(topics[0])
    }
  }, [selectedTopic, topics])

  useEffect(() => {
    async function loadData() {
      setIsInitialLoading(true)
      const [studentsList, classesList] = await Promise.all([fetchStudents(), fetchClasses()])
      if (studentsList.length > 0) {
        await setActiveStudent(studentsList[0])
      } else if (classesList.length > 0) {
        const firstClass = classesList[0]
        setActiveWorkspace(firstClass, firstClass.thread || null)
        try {
          await Promise.all(classesList.map((c) => fetchThreads(c.id)))
        } catch (err) {
          console.error('Failed to load threads in parallel:', err)
        }
      } else {
        setWizardOpen(true)
      }
      setIsInitialLoading(false)
    }
    loadData()
  }, [])

  const handleCohortClick = async (cohort) => {
    if (activeStudent) await setActiveStudent(null)
    setActiveWorkspace(cohort, cohort.thread || null)
    if (!cohort.thread) {
      await fetchThreads(cohort.id)
    }
  }

  const selectedCohortLabel = useMemo(() => {
    if (activeStudent) return `${activeStudent.name} · Year ${activeStudent.year_level}`
    if (!activeClass) return 'No cohort'
    return `${activeClass.name} · Year ${activeClass.year_level}`
  }, [activeStudent, activeClass])

  const runGenerate = async (intent, label, refinementText, teacherTitle) => {
    if (!selectedTopic || !activeThreadId) return
    if (!activeStudent && (!activeClass || !activeThread)) return

    setIsGenerating(true)
    setError('')
    addMessage(activeThreadId, {
      role: 'teacher',
      title: teacherTitle,
      content: intent === 'chat'
        ? refinementText
        : (refinementText ? `${selectedTopic} · ${refinementText}` : selectedTopic),
    })

    try {
      const requestBody = activeStudent
        ? {
            student_id: activeStudent.id,
            session_id: activeSession?.id || null,
            intent,
            topic: selectedTopic,
            refinements: refinementText || null,
          }
        : {
            class_id: activeClass.id,
            thread_id: activeThread.id,
            intent,
            topic: selectedTopic,
            refinements: refinementText || null,
          }

      const response = await fetch('/api/chat/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const detail = await response.text()
        throw new Error(detail || 'Generation failed')
      }

      const payload = await response.json()
      let parts = payload.parts || []

      if (activeStudent) {
        parts = enrichPartsWithQuestionIds(parts, payload.question_ids)
        if (payload.session_id && payload.session_id !== activeSession?.id) {
          setActiveSession({ id: payload.session_id, student_id: activeStudent.id })
        }
        const cerberusItems = buildCerberusItems(parts, intent, activeStudent)
        if (cerberusItems.length) {
          // Fire-and-render: suggestions stream in beside each question.
          cerberusVerify(payload.session_id, cerberusItems)
        }
      }

      addMessage(activeThreadId, { role: 'assistant', parts })
    } catch (generateError) {
      if (import.meta.env.DEV && !activeStudent) {
        const payload = buildOfflineResponse(intent, label, selectedTopic, refinementText)
        addMessage(activeThreadId, { role: 'assistant', parts: payload.parts })
        setError('Backend offline. Showing local UI preview output.')
      } else {
        setError(generateError.message || 'Generation failed')
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerate = (intent, label) => runGenerate(intent, label, refinements.trim(), label)

  const handleChatSend = async () => {
    if (!chatInput.trim()) return
    const messageText = chatInput.trim()
    setChatInput('')
    await runGenerate('chat', 'Chat', messageText, 'Chat')
  }


  if (isInitialLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0E17] text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-300" />
          <p className="text-sm font-medium text-white/60">Loading tutor workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-full overflow-hidden flex bg-[#0A0E17] pt-20 text-white">
      <aside className="hidden w-80 shrink-0 border-r border-white/10 bg-slate-950/72 overflow-y-auto p-4 backdrop-blur-xl lg:block">
          <div className="mb-5 flex items-center gap-3 rounded-[8px] border border-cyan-300/18 bg-cyan-300/10 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-cyan-300 text-slate-950">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Tutor V1</p>
              <p className="text-xs text-cyan-100/70">Prep cockpit</p>
            </div>
          </div>

          <section className="mb-6">
            <p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-white/40">Students</p>
            <div className="space-y-2">
              {students.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => setActiveStudent(student)}
                  className={`flex w-full items-start gap-2 rounded-[8px] border p-3 text-left transition ${
                    activeStudent?.id === student.id
                      ? 'border-cyan-300/60 bg-cyan-300/12'
                      : 'border-white/10 bg-slate-900/70 hover:border-cyan-300/30'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{student.name}</p>
                    <p className="mt-1 text-xs text-white/50">Year {student.year_level} · {student.subject}</p>
                  </div>
                </button>
              ))}
              {showAddStudent ? (
                <AddStudentForm onDone={() => setShowAddStudent(false)} />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddStudent(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-[8px] border border-dashed border-cyan-300/30 bg-slate-950/40 p-3 text-sm font-semibold text-cyan-300 transition hover:border-cyan-300/60 hover:bg-cyan-300/5 hover:text-cyan-200"
                >
                  + Add Student
                </button>
              )}
            </div>
          </section>

          <section>
            <p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-white/40">Cohorts</p>
            <div className="space-y-2">
              {cohorts.map((cohort) => (
                <div
                  key={cohort.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleCohortClick(cohort)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      handleCohortClick(cohort)
                    }
                  }}
                  className={`group/cohort flex w-full cursor-pointer items-start gap-2 rounded-[8px] border p-3 text-left transition ${
                    activeClass?.id === cohort.id
                      ? 'border-cyan-300/60 bg-cyan-300/12'
                      : 'border-white/10 bg-slate-900/70 hover:border-cyan-300/30'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{cohort.name}</p>
                    <p className="mt-1 text-xs text-white/50">Year {cohort.year_level} · {cohort.subject}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      deleteClass(cohort.id)
                    }}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] text-white/35 opacity-0 transition hover:bg-red-500/15 hover:text-red-300 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 group-hover/cohort:opacity-100"
                    aria-label={`Delete cohort ${cohort.name}`}
                    title="Delete cohort"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setWizardOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-[8px] border border-dashed border-cyan-300/30 bg-slate-950/40 p-3 text-sm font-semibold text-cyan-300 transition hover:border-cyan-300/60 hover:bg-cyan-300/5 hover:text-cyan-200"
              >
                + Add Cohort
              </button>
            </div>
          </section>
 
          <section className="mt-6">
            <p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-white/40">Thread stream</p>
            <div className="rounded-[8px] border border-white/10 bg-slate-900/70 p-3">
              <div className="flex items-center gap-2">
                <MessageSquare size={15} className="text-cyan-200" />
                <p className="text-sm text-white">{activeThread?.title || 'No active thread'}</p>
              </div>
              <p className="mt-2 text-xs text-white/45">{messages.length} turns</p>
            </div>
          </section>
        </aside>
 
        <main className="flex-1 flex flex-col min-w-0">
          <header className="border-b border-white/10 bg-slate-950/70 px-4 py-4 backdrop-blur-xl sm:px-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-200/70">{activeSubject || 'No Subject'}</p>
                <h1 className="mt-1 text-xl font-semibold text-white">{selectedCohortLabel}</h1>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm text-white/50">
                  {activeStudent ? (activeStudent.profile?.ability_tier || '') : (activeClass?.ability_tier || '')}
                </p>
                {activeStudent && activeSession && hasDeck && (
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={handleDeckToCanvas}
                    className="inline-flex items-center gap-1.5 rounded-[8px] border border-cyan-300/40 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-50"
                  >
                    <FileOutput size={13} />
                    {isExporting ? 'Exporting...' : 'Send deck to Canvas'}
                  </button>
                )}
                {activeStudent && activeSession && (
                  <button
                    type="button"
                    onClick={() => setShowCheckin(true)}
                    className="rounded-[8px] border border-teal-300/40 bg-teal-300/10 px-3 py-1.5 text-xs font-semibold text-teal-100 transition hover:bg-teal-300/20"
                  >
                    End session
                  </button>
                )}
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 scroll-smooth">
            {messages.length === 0 && !isGenerating ? (
              <div className="flex h-full min-h-80 items-center justify-center">
                <div className="max-w-md text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[8px] border border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
                    <Send size={18} />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Choose a topic and tool</h2>
                  <p className="mt-2 text-sm leading-6 text-white/55">
                    The response will arrive in a staged texting cadence, with question sets and activities held until the explanation has landed.
                  </p>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto w-full space-y-6 pb-4">
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                {isGenerating && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-3 rounded-[8px] border border-cyan-300/15 bg-slate-900/90 px-4 py-3 text-cyan-200 animate-pulse">
                      <span className="text-lg">🧠</span>
                      <span className="text-sm font-semibold">Mate is thinking...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <footer className="shrink-0 border-t border-slate-800 bg-[#0A0E17] p-4 w-full z-10">
            <div className="mx-auto max-w-4xl">
              <div className="mb-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
                <label className="block">
                  <span className="mb-1 block text-xs text-white/45">Topic</span>
                  {topics.length > 0 ? (
                    <select
                      value={selectedTopic}
                      onChange={(event) => setSelectedTopic(event.target.value)}
                      disabled={isLoadingTopics}
                      className="h-11 w-full rounded-[8px] border border-white/10 bg-slate-900 px-3 text-sm text-white outline-none transition focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/20 disabled:opacity-50"
                    >
                      {topics.map((topic) => (
                        <option key={topic} value={topic}>{topic}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={selectedTopic}
                      onChange={(event) => setSelectedTopic(event.target.value)}
                      placeholder={isLoadingTopics ? 'Loading topics...' : 'Type a topic manually'}
                      className="h-11 w-full rounded-[8px] border border-white/10 bg-slate-900 px-3 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/20"
                    />
                  )}
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs text-white/45">Refinements</span>
                  <input
                    value={refinements}
                    onChange={(event) => setRefinements(event.target.value)}
                    placeholder="e.g. more visual, HSC-style, no calculators"
                    className="h-11 w-full rounded-[8px] border border-white/10 bg-slate-900 px-3 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/20"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
                {TOOLS.map((tool) => (
                  <ToolButton
                    key={tool.intent}
                    tool={tool}
                    disabled={isGenerating || !selectedTopic}
                    onClick={handleGenerate}
                  />
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <input
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !isGenerating && chatInput.trim()) {
                      handleChatSend()
                    }
                  }}
                  disabled={isGenerating || !selectedTopic}
                  placeholder="Ask Mate anything... (e.g. Give me another explanation for conditional probability)"
                  className="h-11 flex-1 rounded-[8px] border border-white/10 bg-slate-900 px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/20 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={handleChatSend}
                  disabled={isGenerating || !selectedTopic || !chatInput.trim()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-cyan-300 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send size={15} />
                  Send
                </button>
              </div>

              <div className="mt-3 min-h-5">
                {isGenerating && (
                  <p className="inline-flex items-center gap-2 text-xs text-cyan-100/70">
                    <Loader2 size={14} className="animate-spin" />
                    Generating structured prep output
                  </p>
                )}
                {error && <p className="text-xs text-red-200">{error}</p>}
              </div>
            </div>
          </footer>
        </main>

      {isWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-3xl">
            <StartupWizard />
          </div>
        </div>
      )}

      {showCheckin && activeSession && (
        <CheckinModal session={activeSession} onClose={() => setShowCheckin(false)} />
      )}

      {/* Mate — the avatar survives the dogfood as a corner icon (Darra's call) */}
      <img
        src={mateAvatar}
        alt="Mate"
        title="Mate"
        className="pointer-events-none fixed bottom-4 right-4 z-40 h-10 w-10 rounded-full border border-cyan-300/30 opacity-70 shadow-lg shadow-cyan-950/40"
      />
    </div>
  )
}
