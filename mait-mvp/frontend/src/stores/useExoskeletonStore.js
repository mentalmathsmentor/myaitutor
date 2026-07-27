import { create } from 'zustand'

const initialWizardDraft = {
  name: '',
  year_level: 9,
  subject: 'Stage 5 Mathematics',
  ability_tier: 'Core',
  profile_metadata: {
    teaching_style: '',
  },
}

export const useExoskeletonStore = create((set, get) => ({
  wizardDraft: initialWizardDraft,
  cohorts: [],
  activeClass: null,
  activeThread: null,
  messagesByThread: {},
  topicCache: {},
  isWizardOpen: false,

  // Tutor V1 (canon §7): students + session spine + Cerberus state
  students: [],
  activeStudent: null,
  activeSession: null,
  cerberusByQuestionId: {},
  outcomesByQuestionId: {},

  setWizardOpen: (open) => set({ isWizardOpen: open }),

  fetchStudents: async () => {
    try {
      const response = await fetch('/api/students')
      if (!response.ok) throw new Error('Failed to fetch students')
      const data = await response.json()
      const students = data.students || []
      set({ students })
      return students
    } catch (error) {
      console.error('fetchStudents failed:', error)
      return []
    }
  },

  initStudent: async (payload) => {
    const response = await fetch('/api/students/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      const detail = await response.text()
      throw new Error(detail || 'Failed to create student')
    }
    const data = await response.json()
    set((state) => ({ students: [...state.students, data.student] }))
    return data.student
  },

  setActiveStudent: async (student) => {
    set({ activeStudent: student, activeClass: null, activeThread: null, activeSession: null })
    if (!student) return
    try {
      const response = await fetch(`/api/students/${student.id}/session`, { method: 'POST' })
      if (!response.ok) throw new Error('Failed to open session')
      const data = await response.json()
      set({ activeSession: data.session })
    } catch (error) {
      console.error('setActiveStudent session open failed:', error)
    }
  },

  setActiveSession: (session) => set({ activeSession: session }),

  setCerberusStatus: (questionIds, status) => set((state) => {
    const next = { ...state.cerberusByQuestionId }
    questionIds.forEach((id) => {
      next[id] = { status, suggestions: [] }
    })
    return { cerberusByQuestionId: next }
  }),

  cerberusVerify: async (sessionId, items) => {
    const questionIds = items.map((item) => item.question_log_id).filter(Boolean)
    get().setCerberusStatus(questionIds, 'pending')
    try {
      const response = await fetch('/api/cerberus/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, items }),
      })
      if (!response.ok) throw new Error('Cerberus verify failed')
      const data = await response.json()
      set((state) => {
        const next = { ...state.cerberusByQuestionId }
        for (const result of data.results || []) {
          if (result.question_log_id) {
            next[result.question_log_id] = {
              status: result.status,
              suggestions: result.suggestions || [],
            }
          }
        }
        return { cerberusByQuestionId: next }
      })
      return data
    } catch (error) {
      console.error('cerberusVerify failed:', error)
      get().setCerberusStatus(questionIds, 'unavailable')
      return null
    }
  },

  recordOutcome: async (questionId, outcome, misconceptionTag = null) => {
    set((state) => ({
      outcomesByQuestionId: { ...state.outcomesByQuestionId, [questionId]: outcome },
    }))
    try {
      const response = await fetch(`/api/questions/${questionId}/outcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome, misconception_tag: misconceptionTag }),
      })
      if (!response.ok) throw new Error('Failed to record outcome')
      return true
    } catch (error) {
      console.error('recordOutcome failed:', error)
      set((state) => {
        const next = { ...state.outcomesByQuestionId }
        delete next[questionId]
        return { outcomesByQuestionId: next }
      })
      return false
    }
  },

  sessionCheckin: async (sessionId, payload) => {
    const response = await fetch(`/api/sessions/${sessionId}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      const detail = await response.text()
      throw new Error(detail || 'Check-in failed')
    }
    set({ activeSession: null })
    return (await response.json()).session
  },

  fetchClasses: async () => {
    try {
      const response = await fetch('/api/classes')
      if (!response.ok) throw new Error('Failed to fetch classes')
      const data = await response.json()
      const classes = data.classes || []
      set({ cohorts: classes })
      return classes
    } catch (error) {
      console.error('fetchClasses failed:', error)
      return []
    }
  },

  fetchThreads: async (classId) => {
    try {
      const response = await fetch(`/api/threads/${classId}`)
      if (!response.ok) throw new Error('Failed to fetch threads')
      const data = await response.json()
      const threads = data.threads || []
      if (threads.length > 0) {
        const mainThread = threads[0]
        set((state) => {
          const updatedCohorts = state.cohorts.map((c) => {
            if (c.id === classId) {
              return { ...c, thread: mainThread }
            }
            return c
          })

          const isActive = state.activeClass && state.activeClass.id === classId

          return {
            cohorts: updatedCohorts,
            messagesByThread: {
              ...state.messagesByThread,
              [mainThread.id]: mainThread.messages || [],
            },
            activeThread: isActive ? mainThread : state.activeThread,
          }
        })
      }
    } catch (error) {
      console.error('fetchThreads failed:', error)
    }
  },

  updateWizardDraft: (patch) => set((state) => ({
    wizardDraft: {
      ...state.wizardDraft,
      ...patch,
      profile_metadata: {
        ...state.wizardDraft.profile_metadata,
        ...(patch.profile_metadata || {}),
      },
    },
  })),

  resetWizardDraft: () => set({ wizardDraft: initialWizardDraft }),

  launchWorkspace: ({ class: classObj, thread }) => set((state) => {
    const existing = state.cohorts.filter((cohort) => cohort.id !== classObj.id)
    return {
      cohorts: [...existing, { ...classObj, thread }],
      activeClass: classObj,
      activeThread: thread,
      messagesByThread: {
        ...state.messagesByThread,
        [thread.id]: state.messagesByThread[thread.id] || [],
      },
      isWizardOpen: false,
    }
  }),

  setActiveWorkspace: (classObj, thread) => set({
    activeClass: classObj,
    activeThread: thread,
  }),

  deleteClass: async (classId) => {
    try {
      const response = await fetch(`/api/classes/${classId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete class')

      set((state) => {
        const remainingCohorts = state.cohorts.filter((c) => c.id !== classId)
        const wasActive = state.activeClass?.id === classId
        const removedThreadId = wasActive ? state.activeThread?.id : null

        const nextMessagesByThread = { ...state.messagesByThread }
        if (removedThreadId) delete nextMessagesByThread[removedThreadId]

        if (!wasActive) {
          return {
            cohorts: remainingCohorts,
            messagesByThread: nextMessagesByThread,
          }
        }

        const nextActive = remainingCohorts[0] || null
        return {
          cohorts: remainingCohorts,
          activeClass: nextActive,
          activeThread: nextActive?.thread || null,
          messagesByThread: nextMessagesByThread,
        }
      })

      return true
    } catch (error) {
      console.error('deleteClass failed:', error)
      return false
    }
  },

  setTopicsForSubject: (subject, topics) => set((state) => ({
    topicCache: {
      ...state.topicCache,
      [subject]: topics,
    },
  })),

  addMessage: (threadId, message) => set((state) => ({
    messagesByThread: {
      ...state.messagesByThread,
      [threadId]: [
        ...(state.messagesByThread[threadId] || []),
        {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          ...message,
        },
      ],
    },
  })),

  getActiveMessages: () => {
    const thread = get().activeThread
    if (!thread) return []
    return get().messagesByThread[thread.id] || []
  },
}))
