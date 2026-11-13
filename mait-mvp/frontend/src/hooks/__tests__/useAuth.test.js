import { afterEach, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import useAuth from '../useAuth';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('completes Google login and logout when storage is denied', async () => {
  vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw new Error('Denied'); });
  vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
  vi.spyOn(localStorage, 'removeItem').mockImplementation(() => { throw new Error('Denied'); });
  const fetchMock = vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'new', student_id: 'synthetic-google-id', user: { name: 'Synthetic', email: 'synthetic@example.test', picture: '' } }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
  vi.stubGlobal('fetch', fetchMock);
  const onLoginSuccess = vi.fn(); const onLogout = vi.fn();
  const { result } = renderHook(() => useAuth('https://api.example.test', { onLoginSuccess, onLogout }));
  const anonymousId = result.current.studentId;

  await act(() => result.current.handleGoogleSuccess({ credential: 'synthetic-credential' }));
  expect(result.current.authUser?.student_id).toBe('synthetic-google-id');
  expect(result.current.studentId).toBe('synthetic-google-id');
  expect(onLoginSuccess).toHaveBeenCalledOnce();
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ old_student_id: anonymousId, new_student_id: 'synthetic-google-id' });

  act(() => result.current.handleLogout());
  expect(result.current.authUser).toBeNull();
  expect(result.current.studentId).toMatch(/^student_/);
  expect(onLogout).toHaveBeenCalledOnce();
});
