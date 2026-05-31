import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const textLikeTypes = new Set(['text', 'glass_box'])
const EMPTY_PARTS = []

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function MathMarkdown({ children, className = '' }) {
  const processedChildren = useMemo(() => {
    if (typeof children !== 'string') return children;
    return children
      .replace(/\\\[/g, '$$$$')
      .replace(/\\\]/g, '$$$$')
      .replace(/\\\(/g, '$')
      .replace(/\\\)/g, '$');
  }, [children]);

  return (
    <div className={`chat-prose max-w-none text-sm leading-6 text-white/86 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {processedChildren || ''}
      </ReactMarkdown>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex w-fit items-center gap-1 rounded-[8px] border border-cyan-300/15 bg-slate-900/90 px-4 py-3">
      {[0, 1, 2].map((dot) => (
        <span
          key={dot}
          className="h-2 w-2 animate-bounce rounded-full bg-cyan-300"
          style={{ animationDelay: `${dot * 120}ms` }}
        />
      ))}
    </div>
  )
}

function TextPart({ part }) {
  const isGlass = part.type === 'glass_box'
  return (
    <div
      className={`max-w-3xl rounded-[8px] border px-4 py-3 shadow-lg ${
        isGlass
          ? 'border-teal-300/28 bg-teal-300/10 shadow-teal-950/30'
          : 'border-white/10 bg-slate-900/92 shadow-black/30'
      }`}
    >
      {part.title && (
        <div className={`mb-2 font-mono text-xs uppercase tracking-[0.16em] ${isGlass ? 'text-teal-200' : 'text-cyan-200'}`}>
          {part.title}
        </div>
      )}
      <MathMarkdown>{part.content}</MathMarkdown>
    </div>
  )
}

function QuestionItem({ item, index }) {
  return (
    <div className="rounded-[8px] border border-white/10 bg-slate-950/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="font-mono text-xs text-cyan-200">Question {index + 1}</span>
        {Number.isFinite(item.marks) && (
          <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-xs text-cyan-100">
            {item.marks} marks
          </span>
        )}
      </div>
      <MathMarkdown className="whitespace-pre-wrap break-words prose prose-invert">{item.question_latex}</MathMarkdown>
      {item.teacher_answer_latex && (
        <div className="mt-4 border-t border-white/10 pt-3">
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.16em] text-teal-200">Teacher answer</p>
          <MathMarkdown className="whitespace-pre-wrap break-words prose prose-invert">{item.teacher_answer_latex}</MathMarkdown>
        </div>
      )}
    </div>
  )
}

function QuestionSetPanel({ parts }) {
  const grouped = parts.reduce((acc, part) => {
    const tier = part.tier || 'all'
    acc[tier] = acc[tier] || []
    acc[tier].push(part)
    return acc
  }, {})

  const tiers = Object.keys(grouped)
  const renderTier = (tier) => (
    <div className="space-y-3">
      {grouped[tier].map((part, partIndex) => {
        const items = part.items || part.questions || []
        return (
          <div key={`${tier}-${partIndex}`} className="space-y-3">
            {part.title && (
              <h3 className="text-sm font-semibold text-white">{part.title}</h3>
            )}
            {items.map((item, itemIndex) => (
              <QuestionItem key={`${partIndex}-${itemIndex}`} item={item} index={itemIndex} />
            ))}
          </div>
        )
      })}
    </div>
  )

  if (tiers.length > 1) {
    return (
      <div className="max-w-4xl rounded-[8px] border border-cyan-300/18 bg-slate-900/82 p-4">
        <Tabs defaultValue={tiers[0]}>
          <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-2 rounded-[8px] border border-white/10 bg-black/30 p-2">
            {tiers.map((tier) => (
              <TabsTrigger
                key={tier}
                value={tier}
                className="rounded-[8px] px-3 py-2 capitalize data-[state=active]:bg-cyan-300 data-[state=active]:text-slate-950"
              >
                {tier}
              </TabsTrigger>
            ))}
          </TabsList>
          {tiers.map((tier) => (
            <TabsContent key={tier} value={tier}>
              {renderTier(tier)}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    )
  }

  return (
    <div className="max-w-4xl rounded-[8px] border border-cyan-300/18 bg-slate-900/82 p-4">
      {renderTier(tiers[0] || 'all')}
    </div>
  )
}

function ActivityCard({ part }) {
  return (
    <div className="max-w-3xl rounded-[8px] border border-teal-300/25 bg-teal-300/10 p-4 shadow-lg shadow-teal-950/25">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-teal-100">{part.title || 'Activity'}</h3>
        <span className="rounded-full border border-teal-300/25 bg-black/20 px-2.5 py-1 text-xs capitalize text-teal-100">
          {part.tier || 'all'}
        </span>
      </div>
      <MathMarkdown>{part.content}</MathMarkdown>
    </div>
  )
}

export default function CadenceRenderer({ parts = EMPTY_PARTS }) {
  const normalisedParts = useMemo(() => Array.isArray(parts) ? parts : EMPTY_PARTS, [parts])
  const [visibleTextParts, setVisibleTextParts] = useState([])
  const [showTyping, setShowTyping] = useState(false)
  const [cardsReady, setCardsReady] = useState(false)

  const questionParts = useMemo(
    () => normalisedParts.filter((part) => part.type === 'question_set'),
    [normalisedParts]
  )

  const activityParts = useMemo(
    () => normalisedParts.filter((part) => part.type === 'activity'),
    [normalisedParts]
  )

  useEffect(() => {
    let cancelled = false

    async function runCadence() {
      setVisibleTextParts([])
      setCardsReady(false)

      for (const part of normalisedParts) {
        if (!textLikeTypes.has(part.type)) continue
        setShowTyping(true)
        const textLength = (part.content || '').length
        await sleep(Math.min(1200, Math.max(520, textLength * 10)))
        await sleep(400)
        if (cancelled) return
        setShowTyping(false)
        setVisibleTextParts((current) => [...current, part])
        await sleep(160)
      }

      if (!cancelled) setCardsReady(true)
    }

    runCadence()
    return () => {
      cancelled = true
    }
  }, [normalisedParts])

  return (
    <div className="space-y-4">
      {visibleTextParts.map((part, index) => (
        <TextPart key={`${part.type}-${index}`} part={part} />
      ))}
      {showTyping && <TypingIndicator />}
      {cardsReady && questionParts.length > 0 && <QuestionSetPanel parts={questionParts} />}
      {cardsReady && activityParts.map((part, index) => (
        <ActivityCard key={`activity-${index}`} part={part} />
      ))}
    </div>
  )
}
