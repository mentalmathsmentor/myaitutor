import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Rocket } from 'lucide-react'
import { useExoskeletonStore } from '@/stores/useExoskeletonStore'

const SENIOR_SUBJECTS = ['Mathematics Advanced', 'Mathematics Standard 2', 'Mathematics Standard 1']

const INTELLIGENT_DEFAULT_SUBJECT = {
  7: 'Stage 4 Mathematics',
  8: 'Stage 4 Mathematics',
  9: 'Stage 5 Mathematics',
  10: 'Stage 5 Mathematics',
  11: 'Mathematics Advanced',
  12: 'Mathematics Advanced',
}

const TIERS_BY_BAND = {
  junior: ['Core', 'Core+Path'],
  senior: ['Band 3/4', 'Band 5/6'],
}

const steps = [
  'Class',
  'Year',
  'Subject',
  'Tier',
  'Vibe',
]

function getBand(yearLevel) {
  return Number(yearLevel) >= 11 ? 'senior' : 'junior'
}

function getSubjectsForYear(yearLevel) {
  const year = Number(yearLevel)
  if (year >= 11) return SENIOR_SUBJECTS
  if (year >= 9) return ['Stage 5 Mathematics']
  return ['Stage 4 Mathematics']
}

export default function StartupWizard() {
  const draft = useExoskeletonStore((state) => state.wizardDraft)
  const updateDraft = useExoskeletonStore((state) => state.updateWizardDraft)
  const launchWorkspace = useExoskeletonStore((state) => state.launchWorkspace)
  const resetWizardDraft = useExoskeletonStore((state) => state.resetWizardDraft)
  const setWizardOpen = useExoskeletonStore((state) => state.setWizardOpen)
  const cohorts = useExoskeletonStore((state) => state.cohorts)

  const [step, setStep] = useState(0)
  const [isLaunching, setIsLaunching] = useState(false)
  const [error, setError] = useState('')

  const band = getBand(draft.year_level)
  const subjects = getSubjectsForYear(draft.year_level)
  const tiers = TIERS_BY_BAND[band]

  const canContinue = useMemo(() => {
    if (step === 0) return draft.name.trim().length > 0
    return true
  }, [draft.name, step])

  const handleYearChange = (event) => {
    const year = Number(event.target.value)
    const nextBand = getBand(year)
    updateDraft({
      year_level: year,
      subject: INTELLIGENT_DEFAULT_SUBJECT[year],
      ability_tier: TIERS_BY_BAND[nextBand][0],
    })
  }

  const handleLaunch = async () => {
    setIsLaunching(true)
    setError('')
    try {
      const response = await fetch('/api/classes/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name.trim(),
          year_level: draft.year_level,
          subject: draft.subject,
          ability_tier: draft.ability_tier,
          profile_metadata: draft.profile_metadata,
        }),
      })

      if (!response.ok) {
        const detail = await response.text()
        throw new Error(detail || 'Workspace launch failed')
      }

      const payload = await response.json()
      launchWorkspace(payload)
      resetWizardDraft()
      setWizardOpen(false)
    } catch (launchError) {
      if (import.meta.env.DEV) {
        const classId = crypto.randomUUID()
        const threadId = crypto.randomUUID()
        launchWorkspace({
          class: {
            id: classId,
            tutor_id: '00000000-0000-0000-0000-000000000000',
            name: draft.name.trim(),
            year_level: draft.year_level,
            subject: draft.subject,
            ability_tier: draft.ability_tier,
            profile_metadata: draft.profile_metadata,
          },
          thread: {
            id: threadId,
            tutor_id: '00000000-0000-0000-0000-000000000000',
            class_id: classId,
            title: `${draft.name.trim()} prep`,
            created_at: new Date().toISOString(),
            local_only: true,
          },
        })
        resetWizardDraft()
        setWizardOpen(false)
        return
      }
      setError(launchError.message || 'Could not launch workspace')
    } finally {
      setIsLaunching(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-[#0A0E17] px-4 py-10 text-white">
      <div className="w-full max-w-3xl overflow-hidden rounded-[8px] border border-cyan-300/15 bg-slate-950/88 shadow-[0_0_60px_rgba(20,184,166,0.16)] backdrop-blur-xl">
        <div className="border-b border-white/10 bg-white/[0.03] px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan-300">Tutor Exoskeleton V1</p>
              <h1 className="mt-2 text-2xl font-semibold text-white">Launch a teaching workspace</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[8px] border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
                <Rocket size={20} />
              </div>
              {cohorts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setWizardOpen(false)}
                  className="flex h-11 w-11 items-center justify-center rounded-[8px] border border-white/10 bg-slate-900/60 text-white/60 transition hover:border-white/20 hover:text-white"
                  title="Close wizard"
                >
                  <span className="text-xl font-light">×</span>
                </button>
              )}
            </div>
          </div>
          <div className="mt-6 grid grid-cols-5 gap-2">
            {steps.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => setStep(index)}
                className={`h-2 rounded-full transition-colors ${index <= step ? 'bg-cyan-300' : 'bg-white/10'}`}
                aria-label={`Go to ${label} step`}
              />
            ))}
          </div>
        </div>

        <div className="min-h-[320px] px-6 py-7">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-cyan-300 text-sm font-bold text-slate-950">
              {step + 1}
            </span>
            <div>
              <p className="text-sm text-white/55">Step {step + 1} of {steps.length}</p>
              <h2 className="text-xl font-semibold">{steps[step]}</h2>
            </div>
          </div>

          {step === 0 && (
            <label className="block">
              <span className="text-sm text-white/70">Class name</span>
              <input
                value={draft.name}
                onChange={(event) => updateDraft({ name: event.target.value })}
                placeholder="Year 9 Maths Accelerated"
                className="mt-3 h-14 w-full rounded-[8px] border border-white/10 bg-slate-900 px-4 text-lg text-white outline-none transition focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/20"
              />
            </label>
          )}

          {step === 1 && (
            <label className="block">
              <span className="text-sm text-white/70">Year level</span>
              <select
                value={draft.year_level}
                onChange={handleYearChange}
                className="mt-3 h-14 w-full rounded-[8px] border border-white/10 bg-slate-900 px-4 text-lg text-white outline-none transition focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/20"
              >
                {[7, 8, 9, 10, 11, 12].map((year) => (
                  <option key={year} value={year}>Year {year}</option>
                ))}
              </select>
            </label>
          )}

          {step === 2 && (
            <div>
              <p className="text-sm text-white/70">Subject</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {subjects.map((subject) => (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => updateDraft({ subject })}
                    className={`rounded-[8px] border px-4 py-4 text-left transition ${
                      draft.subject === subject
                        ? 'border-cyan-300/80 bg-cyan-300/12 text-cyan-100'
                        : 'border-white/10 bg-slate-900 text-white/75 hover:border-cyan-300/40 hover:text-white'
                    }`}
                  >
                    {subject}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <p className="text-sm text-white/70">Ability tier</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {tiers.map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => updateDraft({ ability_tier: tier })}
                    className={`rounded-[8px] border px-4 py-4 text-left transition ${
                      draft.ability_tier === tier
                        ? 'border-teal-300/80 bg-teal-300/12 text-teal-100'
                        : 'border-white/10 bg-slate-900 text-white/75 hover:border-teal-300/40 hover:text-white'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <label className="block">
              <span className="text-sm text-white/70">Teaching Style / Class Vibe</span>
              <textarea
                value={draft.profile_metadata.teaching_style}
                onChange={(event) => updateDraft({ profile_metadata: { teaching_style: event.target.value } })}
                placeholder="Quiet class, needs confidence before algebra. Likes partner problem-solving."
                className="mt-3 min-h-36 w-full resize-none rounded-[8px] border border-white/10 bg-slate-900 px-4 py-4 text-white outline-none transition focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/20"
              />
            </label>
          )}

          {error && (
            <div className="mt-5 rounded-[8px] border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-black/20 px-6 py-5">
          <button
            type="button"
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            disabled={step === 0 || isLaunching}
            className="inline-flex h-11 items-center gap-2 rounded-[8px] border border-white/10 px-4 text-sm text-white/75 transition hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          {step < steps.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}
              disabled={!canContinue}
              className="inline-flex h-11 items-center gap-2 rounded-[8px] bg-cyan-300 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLaunch}
              disabled={isLaunching || !draft.name.trim()}
              className="inline-flex h-11 items-center gap-2 rounded-[8px] bg-teal-300 px-5 text-sm font-semibold text-slate-950 transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isLaunching ? 'Launching...' : 'Launch Workspace'}
              {!isLaunching && <Check size={16} />}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
