import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTokenStore } from '../electron/token-store.js';

const fakeSafeStorage = ({ available = true } = {}) => ({
  isEncryptionAvailable: () => available,
  encryptString: (text) => Buffer.from(`ENC:${[...text].reverse().join('')}`),
  decryptString: (buffer) => {
    const text = buffer.toString();
    if (!text.startsWith('ENC:')) throw new Error('cannot decrypt');
    return [...text.slice(4)].reverse().join('');
  },
});

const newFile = () => join(mkdtempSync(join(tmpdir(), 'token-')), 'token.bin');

test('a saved token comes back, and the file does not contain it in plain text', () => {
  const file = newFile();
  const store = createTokenStore({ safeStorage: fakeSafeStorage(), file });
  store.save('  AIza-secret-123  ');
  assert.equal(store.load(), 'AIza-secret-123');
  assert.doesNotMatch(readFileSync(file).toString(), /AIza-secret-123/);
});

test('with no saved token, load returns null', () => {
  assert.equal(createTokenStore({ safeStorage: fakeSafeStorage(), file: newFile() }).load(), null);
});

test('a damaged or unreadable file is treated as no token', () => {
  const file = newFile();
  writeFileSync(file, 'garbage');
  assert.equal(createTokenStore({ safeStorage: fakeSafeStorage(), file }).load(), null);
});

test('a token is never stored without encryption', () => {
  const file = newFile();
  const store = createTokenStore({ safeStorage: fakeSafeStorage({ available: false }), file });
  assert.throws(() => store.save('secret'), /encryption is not available/i);
  assert.equal(existsSync(file), false);
});

test('an empty token is refused', () => {
  const store = createTokenStore({ safeStorage: fakeSafeStorage(), file: newFile() });
  assert.throws(() => store.save('   '), /empty/i);
});

test('saving again replaces the token, and clear forgets it', () => {
  const store = createTokenStore({ safeStorage: fakeSafeStorage(), file: newFile() });
  store.save('one');
  store.save('two');
  assert.equal(store.load(), 'two');
  store.clear();
  assert.equal(store.load(), null);
  assert.doesNotThrow(() => store.clear());
});
