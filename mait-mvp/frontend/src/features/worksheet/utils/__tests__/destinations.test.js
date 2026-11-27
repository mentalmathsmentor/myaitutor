import { afterEach, expect, it, vi } from 'vitest';
import { CURRICULUM_REFERENCE_LINKS, destinations, openDestination, WORKSHEET_GPT_URL } from '../destinations';

afterEach(() => vi.restoreAllMocks());

it('puts Gemini first and shows the custom GPT only when a link is set', () => {
  expect(destinations[0]).toMatchObject({ id: 'gemini', url: 'https://gemini.google.com/app', full: true });
  expect(destinations.some(destination => destination.id === 'gem')).toBe(false);
  expect(destinations.some(destination => destination.id === 'gpt')).toBe(Boolean(WORKSHEET_GPT_URL));
  expect(destinations.filter(destination => destination.full).map(destination => destination.id)).toEqual(['gemini', 'chatgpt', 'claude']);
});

it('links the official NESA, IB MYP and IB DP mathematics references', () => {
  expect(CURRICULUM_REFERENCE_LINKS).toEqual([
    expect.objectContaining({ id: 'nesa', url: 'https://curriculum.nsw.edu.au/' }),
    expect.objectContaining({ id: 'ib-myp-maths', url: 'https://www.ibo.org/programmes/middle-years-programme/curriculum/mathematics/' }),
    expect.objectContaining({ id: 'ib-dp-maths', url: 'https://www.ibo.org/programmes/diploma-programme/curriculum/mathematics/' }),
  ]);
});
it('reports a blocked tab and detaches an opened one', () => {
  vi.spyOn(window, 'open').mockReturnValueOnce(null);
  expect(openDestination(destinations[0])).toBe(false);
  const tab = { opener: window };
  vi.spyOn(window, 'open').mockReturnValueOnce(tab);
  expect(openDestination(destinations[0])).toBe(true);
  expect(tab.opener).toBeNull();
});
