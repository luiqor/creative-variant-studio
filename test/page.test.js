import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

test('the page mounts the workspace and loads all its ES modules from the server', async () => {
  const server = createApp().listen(0);
  const base = `http://localhost:${server.address().port}`;
  const html = await fetch(`${base}/`).then((res) => res.text());
  const main = await fetch(`${base}/js/main.js`);
  const mainSource = await main.text();
  const stylesheet = await fetch(`${base}/styles.css`);
  const imported = [...mainSource.matchAll(/from '\.\/([^']+)'/g)].map(([, path]) => `/js/${path}`);
  const expected = ['render.js', 'api.js', 'workspace.js'].map((name) => `/js/${name}`);
  const transitive = [...expected, '/js/idea-types.js'];
  const statuses = await Promise.all(transitive.map((path) => fetch(`${base}${path}`).then((res) => res.status)));
  server.close();

  assert.match(html, /<div id="app"><\/div>/);
  assert.match(html, /<script type="module" src="\/js\/main\.js">/);
  assert.match(main.headers.get('content-type'), /javascript/);
  assert.equal(stylesheet.status, 200);
  assert.deepEqual([...imported].sort(), [...expected].sort());
  assert.deepEqual(statuses, transitive.map(() => 200));
});
