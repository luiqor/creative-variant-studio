import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCards } from '../public/js/cards.js';

test('createCards turns a batch into typed cards with stable unique ids and state', () => {
  const cards = createCards({ hooks: ['H1', 'H2'], on_screen_texts: ['T1'] });
  assert.deepEqual(cards.map(({ type, text, state }) => ({ type, text, state })), [
    { type: 'hook', text: 'H1', state: 'new' },
    { type: 'hook', text: 'H2', state: 'new' },
    { type: 'on_screen_text', text: 'T1', state: 'new' },
  ]);
  assert.equal(new Set(cards.map((c) => c.id)).size, 3);
});
