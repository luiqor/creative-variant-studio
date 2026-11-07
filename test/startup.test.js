import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const entry = fileURLToPath(new URL('../src/index.js', import.meta.url));

test('process exits non-zero with a clear message when ANTHROPIC_API_KEY is missing', () => {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  const r = spawnSync(process.execPath, [entry], { env, encoding: 'utf8', timeout: 10000 });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /ANTHROPIC_API_KEY/);
});
