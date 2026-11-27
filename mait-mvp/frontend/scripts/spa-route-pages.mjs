// GitHub Pages cannot rewrite URLs, so deep links such as /worksheets fell back to 404.html
// and returned a 404 status. Writing <route>.html lets Pages serve each app route with 200.
import { copyFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export function appRoutes(appSource) {
  const paths = [...appSource.matchAll(/<Route\s+path="\/([A-Za-z0-9_-]+)"/g)].map(match => match[1]);
  return [...new Set(paths)];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const dist = path.join(root, 'dist');
  const routes = appRoutes(readFileSync(path.join(root, 'src/App.jsx'), 'utf8'));
  if (!routes.length) throw new Error('No app routes found in src/App.jsx');
  for (const route of routes) copyFileSync(path.join(dist, 'index.html'), path.join(dist, `${route}.html`));
  copyFileSync(path.join(dist, 'index.html'), path.join(dist, '404.html'));
  console.log(`Wrote ${routes.length} route pages: ${routes.join(', ')}`);
}
