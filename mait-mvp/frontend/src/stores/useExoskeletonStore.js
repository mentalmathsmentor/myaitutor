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
    }
  }),

  setActiveWorkspace: (classObj, thread) => set({
    activeClass: classObj,
    activeThread: thread,
  }),

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
