import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTokenService } from '../src/tokens.js';

const memoryStore = (initial = null) => {
  const box = { token: initial };
  return {
    load: () => box.token,
    save: (token) => {
      box.token = token.trim();
    },
    box,
  };
};
const makeClient = (key) => ({ key });

test('without a stored token or an environment key there is no client and a token is required', () => {
  const service = createTokenService({ store: memoryStore(), createClient: makeClient, env: {} });
  assert.equal(service.getClient(), null);
  assert.equal(service.configured(), false);
});

test('a stored token is used to build the client', () => {
  const service = createTokenService({ store: memoryStore('stored'), createClient: makeClient, env: {} });
  assert.deepEqual(service.getClient(), { key: 'stored' });
  assert.equal(service.configured(), true);
});

test('the stored token takes priority over the development key from the environment', () => {
  const service = createTokenService({
    store: memoryStore('stored'),
    createClient: makeClient,
    env: { GEMINI_API_KEY: 'from-env' },
  });
  assert.deepEqual(service.getClient(), { key: 'stored' });
});

test('the development key from the environment is used when nothing is stored', () => {
  const service = createTokenService({ store: memoryStore(), createClient: makeClient, env: { GEMINI_API_KEY: ' dev ' } });
  assert.deepEqual(service.getClient(), { key: 'dev' });
  assert.equal(service.configured(), true);
});

test('saving a token stores it and switches the client to it', () => {
  const store = memoryStore();
  const service = createTokenService({ store, createClient: makeClient, env: { GEMINI_API_KEY: 'dev' } });
  service.save('  fresh ');
  assert.equal(store.box.token, 'fresh');
  assert.deepEqual(service.getClient(), { key: 'fresh' });
});

test('a token the store cannot save leaves the current client untouched', () => {
  const store = { load: () => 'old', save: () => { throw new Error('no encryption'); } };
  const service = createTokenService({ store, createClient: makeClient, env: {} });
  assert.throws(() => service.save('new'), /no encryption/);
  assert.deepEqual(service.getClient(), { key: 'old' });
});
