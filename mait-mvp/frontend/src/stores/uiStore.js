import { create } from 'zustand';

export const useUIStore = create((set) => ({
  showLocalChat: false,
  showMobileSyllabus: false,
  showKeystrokePanel: false,
  showOverlay: false,
  showAutoSavePrompt: false,
  showQueueConfirm: null,
  autoSaveEnabled: localStorage.getItem('mait_autosave') === 'true',
  isIdle: false,

  setShowLocalChat: (show) => set({ showLocalChat: show }),
  setShowMobileSyllabus: (show) => set({ showMobileSyllabus: show }),
  setShowKeystrokePanel: (show) => set({ showKeystrokePanel: show }),
  setShowOverlay: (show) => set({ showOverlay: show }),
  setShowAutoSavePrompt: (show) => set({ showAutoSavePrompt: show }),
  setShowQueueConfirm: (val) => set({ showQueueConfirm: val }),
  setIsIdle: (idle) => set({ isIdle: idle }),
  setAutoSaveEnabled: (enabled) => set({ autoSaveEnabled: enabled }),
  toggleAutoSave: () => set((state) => {
    const next = !state.autoSaveEnabled;
    localStorage.setItem('mait_autosave', String(next));
    return { autoSaveEnabled: next };
  }),
}));
