import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  engine: null,
  MLCEngine: vi.fn(function () {
    return mocks.engine;
  }),
}));

vi.mock('@mlc-ai/web-llm', () => ({
  MLCEngine: mocks.MLCEngine,
}));

import { modelService } from '../ModelService';

afterEach(async () => {
  vi.unstubAllGlobals();
  mocks.engine = null;
  await modelService.reset();
});

describe('ModelService WebLLM catalogue', () => {
  it('exposes the approved Gemma 4 and Phi 4 browser models', () => {
    const models = modelService.constructor.getAvailableModels();

    expect(models.gemma4).toMatchObject({
      id: 'gemma-4-E2B-it-q4f16_1-MLC',
      name: 'Gemma 4 E2B',
    });
    expect(models.gemma4.hidden).not.toBe(true);

    expect(models.phi4).toMatchObject({
      id: 'Phi-4-mini-instruct-q4f16_1-MLC',
      name: 'Phi 4 Mini',
    });
    expect(models.phi4.hidden).not.toBe(true);
  });

  it('keeps the existing tiny, balanced, and quality choices available', () => {
    const models = modelService.constructor.getAvailableModels();

    expect(models.tiny.id).toBe('Qwen2.5-1.5B-Instruct-q4f16_1-MLC');
    expect(models.balanced.id).toBe('Llama-3.2-3B-Instruct-q4f16_1-MLC');
    expect(models.quality.id).toBe('Phi-3.5-mini-instruct-q4f16_1-MLC');
    expect(models.legacy.hidden).toBe(true);
  });

  it('rejects stale model keys instead of silently loading the wrong model', async () => {
    await expect(modelService.initialize(() => {}, 'large')).rejects.toThrow('Unknown model size: large');
  });

  it('aborts an in-flight initialisation on reset', async () => {
    let finishReload;
    const reloadPromise = new Promise((resolve) => { finishReload = resolve; });
    const engine = {
      reload: vi.fn(() => reloadPromise),
      unload: vi.fn(async () => { finishReload(); }),
    };
    mocks.engine = engine;
    vi.stubGlobal('navigator', { gpu: {} });

    const initPromise = modelService.initialize(() => {}, 'tiny');
    const expectation = expect(initPromise).rejects.toMatchObject({
      name: 'ModelInitializationCancelledError',
    });

    await vi.waitFor(() => {
      expect(engine.reload).toHaveBeenCalled();
    });

    await modelService.reset();
    await expectation;

    expect(engine.unload).toHaveBeenCalled();
    expect(modelService.getStatus()).toMatchObject({ status: 'IDLE', engine: false });
  });

  it('does not let stale error cleanup clear a newer initialisation', async () => {
    let finishFirstUnload;
    const firstUnloadPromise = new Promise((resolve) => { finishFirstUnload = resolve; });
    const firstEngine = {
      reload: vi.fn(async () => { throw new Error('boom'); }),
      unload: vi.fn(() => firstUnloadPromise),
    };
    mocks.engine = firstEngine;
    vi.stubGlobal('navigator', { gpu: {} });

    const firstInit = modelService.initialize(() => {}, 'tiny');
    const firstExpectation = expect(firstInit).rejects.toMatchObject({
      name: 'ModelInitializationCancelledError',
    });

    await vi.waitFor(() => {
      expect(firstEngine.unload).toHaveBeenCalled();
    });

    const resetPromise = modelService.reset();
    const secondEngine = {
      reload: vi.fn(async () => {}),
      unload: vi.fn(async () => {}),
    };
    mocks.engine = secondEngine;
    const secondInit = modelService.initialize(() => {}, 'quality');

    finishFirstUnload();
    await resetPromise;
    await firstExpectation;
    await expect(secondInit).resolves.toBe('Phi 3.5 Mini');

    expect(modelService.getStatus()).toMatchObject({ status: 'READY', engine: true, modelSize: 'quality' });
  });
});
