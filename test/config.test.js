import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig, LIMITS } from '../src/config.js';

test('defaults MODEL to claude-haiku-5-5 and PORT to 3000', () => {
  const c = loadConfig({ ANTHROPIC_API_KEY: 'k' });
  assert.equal(c.model, 'claude-haiku-5-5');
  assert.equal(c.port, 3000);
  assert.equal(c.apiKey, 'k');
});

test('MODEL and PORT can be overridden', () => {
  const c = loadConfig({ ANTHROPIC_API_KEY: 'k', MODEL: 'claude-sonnet-5-5', PORT: '8080' });
  assert.equal(c.model, 'claude-sonnet-5-5');
  assert.equal(c.port, 8080);
});

test('missing API key throws a clear message', () => {
  assert.throws(() => loadConfig({}), /ANTHROPIC_API_KEY/);
  assert.throws(() => loadConfig({ ANTHROPIC_API_KEY: '  ' }), /ANTHROPIC_API_KEY/);
});

test('limits are readable from the config module', () => {
  assert.equal(LIMITS.hookMaxWords, 15);
  assert.equal(LIMITS.onScreenTextMaxWords, 8);
});
