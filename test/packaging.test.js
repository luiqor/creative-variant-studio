import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const pkg = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));

test('the installer targets macOS and Windows', () => {
  assert.ok(pkg.build.appId);
  const [mac] = pkg.build.mac.target;
  const [win] = pkg.build.win.target;
  assert.equal(mac.target, 'dmg');
  assert.deepEqual([...mac.arch].sort(), ['arm64', 'x64']);
  assert.equal(win.target, 'nsis');
  assert.deepEqual(win.arch, ['x64']);
  assert.equal(pkg.scripts['dist:mac'], 'electron-builder --mac');
  assert.equal(pkg.scripts['dist:win'], 'electron-builder --win');
});

test('the app entry point exists', () => {
  assert.ok(existsSync(new URL(pkg.main, root)));
});

test('only the runtime folders go into the installer, never secrets, tests or logs', () => {
  const files = pkg.build.files;
  assert.deepEqual(files.filter((f) => !f.startsWith('!')).sort(), ['electron/**', 'package.json', 'public/**', 'src/**']);
  for (const forbidden of ['.env', 'events.jsonl', 'token.bin', 'test', 'examples', 'scripts']) {
    assert.ok(!files.some((f) => !f.startsWith('!') && f.includes(forbidden)), forbidden);
  }
  assert.ok(files.includes('!**/*.test.js'));
});

test('the runtime folders named in the installer exist', () => {
  for (const folder of ['electron', 'src', 'public']) assert.ok(existsSync(new URL(`${folder}/`, root)), folder);
  assert.ok(existsSync(new URL('public/ae/duplicate-from-csv.jsx', root)));
});

test('the install instructions cover both systems and the first-launch token', () => {
  const text = readFileSync(new URL('INSTALL.md', root), 'utf8');
  assert.match(text, /macOS/);
  assert.match(text, /Windows/);
  assert.match(text, /unknown developer|unidentified developer/i);
  assert.match(text, /token/i);
});
