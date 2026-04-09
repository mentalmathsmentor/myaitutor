import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock framer-motion's useReducedMotion before importing the hook
vi.mock('framer-motion', () => ({
  useReducedMotion: vi.fn(() => false),
}));

import { useIsMobileOrReduced } from '../useIsMobileOrReduced';
import { useReducedMotion } from 'framer-motion';

describe('useIsMobileOrReduced', () => {
  it('returns false on desktop viewports with no reduced motion', () => {
    // Default: matchMedia returns false (desktop), useReducedMotion returns false
    const { result } = renderHook(() => useIsMobileOrReduced());
    expect(result.current).toBe(false);
  });

  it('returns true when useReducedMotion is true (accessibility preference)', () => {
    useReducedMotion.mockReturnValue(true);
    const { result } = renderHook(() => useIsMobileOrReduced());
    expect(result.current).toBe(true);
    useReducedMotion.mockReturnValue(false); // reset
  });

  it('returns true when window.innerWidth is below breakpoint', () => {
    // Override innerWidth to simulate mobile
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 375 });
    const { result } = renderHook(() => useIsMobileOrReduced(768));
    expect(result.current).toBe(true);
    // Reset
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 1024 });
  });

  it('accepts a custom breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 500 });
    const { result } = renderHook(() => useIsMobileOrReduced(400));
    // 500 > 400, so should be false (desktop)
    expect(result.current).toBe(false);
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 1024 });
  });
});
