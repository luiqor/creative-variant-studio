import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyTokenStatus,
  editToken,
  cancelTokenEdit,
  startSavingToken,
  tokenSaved,
  tokenFailed,
  tokenRejected,
  needsTokenScreen,
} from '../public/js/token.js';
import { initialState } from '../public/js/workspace.js';

const required = (configured) => applyTokenStatus(initialState(), { required: true, configured });

test('without a token requirement the token screen is never shown', () => {
  const state = applyTokenStatus(initialState(), { required: false, configured: true });
  assert.equal(needsTokenScreen(state), false);
  assert.equal(needsTokenScreen(editToken(state)), false);
});

test('a required token that is not set shows the token screen', () => {
  assert.equal(needsTokenScreen(required(false)), true);
  assert.equal(needsTokenScreen(required(true)), false);
});

test('a designer can open the token screen to replace a token, and cancel', () => {
  const editing = editToken(required(true));
  assert.equal(needsTokenScreen(editing), true);
  assert.equal(needsTokenScreen(cancelTokenEdit(editing)), false);
});

test('saving a token shows progress and then leaves the token screen', () => {
  const saving = startSavingToken(editToken(required(true)));
  assert.equal(saving.token.saving, true);
  const done = tokenSaved(saving);
  assert.equal(done.token.saving, false);
  assert.equal(done.token.configured, true);
  assert.equal(needsTokenScreen(done), false);
  assert.equal(done.token.error, '');
});

test('a token that cannot be saved stays on the token screen with the reason', () => {
  const failed = tokenFailed(startSavingToken(required(false)), 'Encryption is not available');
  assert.equal(needsTokenScreen(failed), true);
  assert.equal(failed.token.saving, false);
  assert.equal(failed.token.error, 'Encryption is not available');
});

test('a token Gemini rejected sends the designer back to the token screen with the message', () => {
  const state = { ...required(true), ideas: [{ id: '1', type: 'hook', text: 'keep me', status: 'new' }] };
  const rejected = tokenRejected(state, 'Gemini rejected the token.');
  assert.equal(needsTokenScreen(rejected), true);
  assert.equal(rejected.token.error, 'Gemini rejected the token.');
  assert.equal(rejected.ideas.length, 1);
  assert.equal(rejected.loading, false);
});

test('cancelling the edit clears an old error', () => {
  const state = cancelTokenEdit({ ...editToken(required(true)), token: { ...editToken(required(true)).token, error: 'old' } });
  assert.equal(state.token.error, '');
});
