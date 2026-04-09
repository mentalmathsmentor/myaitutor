import { create } from 'zustand';

export const useTimerStore = create((set) => ({
  currentTime: new Date(),
  studyTimerRunning: false,
  studyTimerSeconds: 0,

  tick: () => set({ currentTime: new Date() }),
  setStudyTimerRunning: (isRunning) => set({ studyTimerRunning: isRunning }),
  setStudyTimerSeconds: (update) => set((state) => ({ 
    studyTimerSeconds: typeof update === 'function' ? update(state.studyTimerSeconds) : update 
  })),
  startTimer: () => set({ studyTimerRunning: true }),
  stopTimer: () => set({ studyTimerRunning: false }),
  resetTimer: () => set({ studyTimerSeconds: 0, studyTimerRunning: false }),
  incrementTimer: () => set((state) => ({
    studyTimerSeconds: state.studyTimerSeconds + 1,
  })),
}));
