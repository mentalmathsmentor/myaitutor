import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';
import { appRoutes } from '../../scripts/spa-route-pages.mjs';

it('finds every named app route and skips the root and catch-all', () => {
  const routes = appRoutes(readFileSync(path.resolve('src/App.jsx'), 'utf8'));
  expect(routes).toContain('worksheets');
  expect(routes).not.toContain('');
  expect(routes.every(route => /^[A-Za-z0-9_-]+$/.test(route))).toBe(true);
});
