import { describe, expect, it } from 'vitest';
import { queueClipboardWrite } from '../clipboardQueue';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('queueClipboardWrite', () => {
  it('serialises writes so an older write cannot finish after a newer one', async () => {
    const started = [];
    let finishFirst;
    const writer = text => {
      started.push(text);
      if (text === 'first') return new Promise(resolve => { finishFirst = resolve; });
      return Promise.resolve();
    };

    const first = queueClipboardWrite('first', writer);
    await flush();
    expect(started).toEqual(['first']);

    const second = queueClipboardWrite('second', writer);
    await flush();
    expect(started).toEqual(['first']);

    finishFirst();
    await first;
    await second;
    expect(started).toEqual(['first', 'second']);
  });

  it('continues the queue after a rejected write', async () => {
    const started = [];
    const first = queueClipboardWrite('first-after-rejection', () => Promise.reject(new Error('denied')));
    const second = queueClipboardWrite('second-after-rejection', text => {
      started.push(text);
      return Promise.resolve();
    });

    await expect(first).rejects.toThrow('denied');
    await expect(second).resolves.toBeUndefined();
    expect(started).toEqual(['second-after-rejection']);
  });
});
