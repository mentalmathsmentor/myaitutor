import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch } from '../apiClient';
import { API_URL } from '../../config/api';

describe('apiFetch', () => {
  beforeEach(() => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prefixes API_URL to the path', async () => {
    await apiFetch('/context/abc');
    expect(global.fetch).toHaveBeenCalledWith(`${API_URL}/context/abc`, {
      headers: {},
      body: undefined,
    });
  });

  it('attaches the X-Student-Id header when studentId is provided', async () => {
    await apiFetch('/history/s1', { studentId: 's1' });
    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers['X-Student-Id']).toBe('s1');
  });

  it('does not attach X-Student-Id when studentId is absent', async () => {
    await apiFetch('/keystroke-profile/s1');
    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers['X-Student-Id']).toBeUndefined();
  });

  it('JSON-encodes the body and sets Content-Type for json option', async () => {
    const payload = { student_id: 's1', query: 'hi', complexity: 5 };
    await apiFetch('/query', { method: 'POST', studentId: 's1', json: payload });
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe(`${API_URL}/query`);
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.headers['X-Student-Id']).toBe('s1');
    expect(options.body).toBe(JSON.stringify(payload));
  });

  it('preserves caller-supplied headers', async () => {
    await apiFetch('/x', { headers: { 'X-Custom': '1' }, studentId: 's1' });
    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers['X-Custom']).toBe('1');
    expect(options.headers['X-Student-Id']).toBe('s1');
  });

  it('returns the fetch response', async () => {
    const res = await apiFetch('/x');
    expect(res).toEqual({ ok: true });
  });
});
