import { create } from 'zustand';

export const useChatStore = create((set, get) => ({
  // State
  messages: [
    { role: 'bot', text: "G'day, Mate! I'm ready to crunch some Mathematics Advanced. What's on your mind?", isGreeting: true }
  ],
  input: '',
  loading: false,
  context: null,
  messageQueue: [],
  pendingQueue: [],

  // Actions
  setInput: (input) => set({ input }),
  setLoading: (loading) => set({ loading }),
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  setMessages: (update) => set((state) => ({ 
    messages: typeof update === 'function' ? update(state.messages) : update 
  })),
  setContext: (context) => set({ context }),
  enqueue: (msg) => set((state) => ({ messageQueue: [...state.messageQueue, msg] })),
  dequeue: () => set((state) => ({
    messageQueue: state.messageQueue.slice(1)
  })),
  setMessageQueue: (update) => set((state) => ({ 
    messageQueue: typeof update === 'function' ? update(state.messageQueue) : update 
  })),
  setPendingQueue: (update) => set((state) => ({ 
    pendingQueue: typeof update === 'function' ? update(state.pendingQueue) : update 
  })),
  clearHistory: () => set({ 
    messages: [
      { role: 'bot', text: "G'day, Mate! I'm ready to crunch some Mathematics Advanced. What's on your mind?", isGreeting: true }
    ] 
  }),
}));
