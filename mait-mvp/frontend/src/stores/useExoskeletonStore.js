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

  setWizardOpen: (open) => set({ isWizardOpen: open }),

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
