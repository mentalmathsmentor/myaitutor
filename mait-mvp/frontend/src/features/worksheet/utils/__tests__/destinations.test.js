import { afterEach, expect, it, vi } from 'vitest';
import { destinations, openDestination, WORKSHEET_GEM_URL, WORKSHEET_GPT_URL } from '../destinations';

afterEach(() => vi.restoreAllMocks());

it('puts the Gem first and shows the GPT only when a link is set', () => {
  expect(destinations[0]).toMatchObject({ id: 'gem', url: WORKSHEET_GEM_URL, full: false });
  expect(destinations.some(destination => destination.id === 'gpt')).toBe(Boolean(WORKSHEET_GPT_URL));
  expect(destinations.filter(destination => destination.full).map(destination => destination.id)).toEqual(['chatgpt', 'claude']);
});
it('reports a blocked tab and detaches an opened one', () => {
  vi.spyOn(window, 'open').mockReturnValueOnce(null);
  expect(openDestination(destinations[0])).toBe(false);
  const tab = { opener: window };
  vi.spyOn(window, 'open').mockReturnValueOnce(tab);
  expect(openDestination(destinations[0])).toBe(true);
  expect(tab.opener).toBeNull();
});
