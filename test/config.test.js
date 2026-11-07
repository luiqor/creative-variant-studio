import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig, LIMITS } from '../src/config.js';

test('defaults MODEL to gemini-3.5-flash-lite and PORT to 3000', () => {
  const c = loadConfig({ GEMINI_API_KEY: 'k' });
  assert.equal(c.model, 'gemini-3.5-flash-lite');
  assert.equal(c.port, 3000);
  assert.equal(c.apiKey, 'k');
});

test('MODEL and PORT can be overridden', () => {
  const c = loadConfig({ GEMINI_API_KEY: 'k', MODEL: 'gemini-3.8-flash', PORT: '8080' });
  assert.equal(c.model, 'gemini-3.8-flash');
  assert.equal(c.port, 8080);
});

test('missing API key throws a clear message', () => {
  assert.throws(() => loadConfig({}), /GEMINI_API_KEY/);
  assert.throws(() => loadConfig({ GEMINI_API_KEY: '  ' }), /GEMINI_API_KEY/);
});

test('limits are readable from the config module', () => {
  assert.equal(LIMITS.hookMaxWords, 15);
  assert.equal(LIMITS.onScreenTextMaxWords, 8);
});
