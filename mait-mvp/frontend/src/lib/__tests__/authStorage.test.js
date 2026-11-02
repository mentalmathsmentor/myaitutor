import { it, expect, vi } from 'vitest';
import { getStudentId, getSavedAuthUser } from '../auth';

it('retains the saved ID when storage is available', () => {
  localStorage.setItem('mait_student_id', 'synthetic-saved-id');
  expect(getStudentId()).toBe('synthetic-saved-id');
});
it('uses a stable page-local anonymous ID when storage is denied', () => {
  vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw new Error('Denied'); });
  vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
  const id = getStudentId(); expect(id).toMatch(/^student_/); expect(getStudentId()).toBe(id);
  expect(getSavedAuthUser()).toBeNull();
});
it('does not crash the UI store during import or toggle when storage is denied', async () => {
  vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw new Error('Denied'); });
  vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
  const { useUIStore } = await import('../../stores/uiStore');
  expect(useUIStore.getState().autoSaveEnabled).toBe(false);
  expect(() => useUIStore.getState().toggleAutoSave()).not.toThrow();
  expect(useUIStore.getState().autoSaveEnabled).toBe(false);
});
