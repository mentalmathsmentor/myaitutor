import { useEffect, useMemo, useState } from 'react'
import { Activity, Dumbbell, Flame, Layers3, Lightbulb, Loader2, MessageSquare, Send, Sparkles, Target } from 'lucide-react'
import { useExoskeletonStore } from '@/stores/useExoskeletonStore'
import CadenceRenderer from './CadenceRenderer'
import StartupWizard from './StartupWizard'

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
  const activeThreadId = activeThread?.id
  const activeSubject = activeClass?.subject || ''
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

  const selectedCohortLabel = useMemo(() => {
    if (!activeClass) return 'No cohort'
    return `${activeClass.name} · Year ${activeClass.year_level}`
  }, [activeClass])

  const handleGenerate = async (intent, label) => {
    if (!activeClass || !activeThread || !selectedTopic) return

    setIsGenerating(true)
    setError('')
    addMessage(activeThread.id, {
      role: 'teacher',
      title: label,
      content: refinements ? `${selectedTopic} · ${refinements}` : selectedTopic,
    })

    try {
      const response = await fetch('/api/chat/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: activeClass.id,
          thread_id: activeThread.id,
          intent,
          topic: selectedTopic,
          refinements: refinements.trim() || null,
        }),
      })

      if (!response.ok) {
        const detail = await response.text()
        throw new Error(detail || 'Generation failed')
      }

      const payload = await response.json()
      addMessage(activeThread.id, {
        role: 'assistant',
        parts: payload.parts || [],
      })
    } catch (generateError) {
      if (import.meta.env.DEV) {
        const payload = buildOfflineResponse(intent, label, selectedTopic, refinements)
        addMessage(activeThread.id, {
          role: 'assistant',
          parts: payload.parts,
        })
        setError('Backend offline. Showing local UI preview output.')
      } else {
        setError(generateError.message || 'Generation failed')
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const handleChatSend = async () => {
    if (!activeClass || !activeThread || !selectedTopic || !chatInput.trim()) return

    const messageText = chatInput.trim()
    setChatInput('')
    setIsGenerating(true)
    setError('')
    addMessage(activeThread.id, {
      role: 'teacher',
      title: 'Chat',
      content: messageText,
    })

    try {
      const response = await fetch('/api/chat/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: activeClass.id,
          thread_id: activeThread.id,
          intent: 'chat',
          topic: selectedTopic,
          refinements: messageText,
        }),
      })

      if (!response.ok) {
        const detail = await response.text()
        throw new Error(detail || 'Generation failed')
      }

      const payload = await response.json()
      addMessage(activeThread.id, {
        role: 'assistant',
        parts: payload.parts || [],
      })
    } catch (generateError) {
      if (import.meta.env.DEV) {
        const payload = buildOfflineResponse('chat', 'Chat', selectedTopic, messageText)
        addMessage(activeThread.id, {
          role: 'assistant',
          parts: payload.parts,
        })
        setError('Backend offline. Showing local UI preview output.')
      } else {
        setError(generateError.message || 'Generation failed')
      }
    } finally {
      setIsGenerating(false)
    }
  }


  if (!activeClass || !activeThread) {
    return <StartupWizard />
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[#0A0E17] pt-20 text-white">
      <div className="flex min-h-[calc(100vh-5rem)]">
        <aside className="hidden w-80 shrink-0 border-r border-white/10 bg-slate-950/72 p-4 backdrop-blur-xl lg:block">
          <div className="mb-5 flex items-center gap-3 rounded-[8px] border border-cyan-300/18 bg-cyan-300/10 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-cyan-300 text-slate-950">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Tutor V1</p>
              <p className="text-xs text-cyan-100/70">Prep cockpit</p>
            </div>
          </div>

          <section>
            <p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-white/40">Cohorts</p>
            <div className="space-y-2">
              {cohorts.map((cohort) => (
                <button
                  key={cohort.id}
                  type="button"
                  onClick={() => setActiveWorkspace(cohort, cohort.thread)}
                  className={`w-full rounded-[8px] border p-3 text-left transition ${
                    activeClass.id === cohort.id
                      ? 'border-cyan-300/60 bg-cyan-300/12'
                      : 'border-white/10 bg-slate-900/70 hover:border-cyan-300/30'
                  }`}
                >
                  <p className="text-sm font-semibold text-white">{cohort.name}</p>
                  <p className="mt-1 text-xs text-white/50">Year {cohort.year_level} · {cohort.subject}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="mt-6">
            <p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-white/40">Thread stream</p>
            <div className="rounded-[8px] border border-white/10 bg-slate-900/70 p-3">
              <div className="flex items-center gap-2">
                <MessageSquare size={15} className="text-cyan-200" />
                <p className="text-sm text-white">{activeThread.title}</p>
              </div>
              <p className="mt-2 text-xs text-white/45">{messages.length} turns</p>
            </div>
          </section>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-white/10 bg-slate-950/70 px-4 py-4 backdrop-blur-xl sm:px-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-200/70">{activeClass.subject}</p>
                <h1 className="mt-1 text-xl font-semibold text-white">{selectedCohortLabel}</h1>
              </div>
              <p className="text-sm text-white/50">{activeClass.ability_tier}</p>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
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
              <div className="mx-auto flex max-w-5xl flex-col gap-5 pb-4">
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

          <footer className="border-t border-white/10 bg-slate-950/88 px-4 py-4 backdrop-blur-xl sm:px-6">
            <div className="mx-auto max-w-5xl">
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
      </div>
    </div>
  )
}
