import { create } from 'zustand';

export const useModelStore = create((set) => ({
  isModelReady: false,
  modelLoading: 'Initializing...',
  downloadProgress: null,
  demoModelSize: 'balanced',
  localBrainChoice: null,
  loadedModelName: null,
  downloadError: null,
  webGPUError: null,
  showModelSwitchConfirm: null,
  cachedModels: {},

  setModelReady: (ready) => set({ isModelReady: ready }),
  setModelLoading: (msg) => set({ modelLoading: msg }),
  setDownloadProgress: (p) => set({ downloadProgress: p }),
  setDemoModelSize: (size) => set({ demoModelSize: size }),
  setLocalBrainChoice: (choice) => set({ localBrainChoice: choice }),
  setLoadedModelName: (name) => set({ loadedModelName: name }),
  setDownloadError: (err) => set({ downloadError: err }),
  setWebGPUError: (err) => set({ webGPUError: err }),
  setShowModelSwitchConfirm: (val) => set({ showModelSwitchConfirm: val }),
  setCachedModels: (update) => set((state) => ({ 
    cachedModels: typeof update === 'function' ? update(state.cachedModels) : update 
  })),
  reset: () => set({
    isModelReady: false, 
    downloadProgress: null,
    downloadError: null, 
    loadedModelName: null,
  }),
}));
