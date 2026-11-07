import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const angles = ['pain', 'humor', 'social-proof', 'price'];
const sections = ['Hook:', 'Problem:', 'Demo:', 'On-screen text:', 'CTA:'];

for (const angle of angles) {
  test(`${angle} example has disclaimer first line and all sections in order`, () => {
    const lines = readFileSync(join(dir, `${angle}.txt`), 'utf8').split('\n');
    assert.equal(lines[0], 'Fictional example, not real SockLock data');
    const found = sections.map((s) => lines.findIndex((l) => l.startsWith(s)));
    assert.ok(found.every((i) => i > 0), `missing section in ${angle}`);
    assert.deepEqual(found, [...found].sort((a, b) => a - b));
  });
}
