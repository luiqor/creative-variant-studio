import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCards, keepCard, rejectCard, restoreCard, toggleLikedTag, setComment } from '../public/js/cards.js';

const sample = () => createCards({ hooks: ['H1', 'H2'], on_screen_texts: ['T1'] });

test('createCards turns a batch into typed cards with stable unique ids and state', () => {
  const cards = createCards({ hooks: ['H1', 'H2'], on_screen_texts: ['T1'] });
  assert.deepEqual(cards.map(({ type, text, state }) => ({ type, text, state })), [
    { type: 'hook', text: 'H1', state: 'new' },
    { type: 'hook', text: 'H2', state: 'new' },
    { type: 'on_screen_text', text: 'T1', state: 'new' },
  ]);
  assert.equal(new Set(cards.map((c) => c.id)).size, 3);
});

test('new cards have empty feedback', () => {
  const [card] = sample();
  assert.deepEqual([card.likedTags, card.rejectTag, card.comment], [[], null, '']);
});

test('rejectCard without a tag rejects the card with no reject tag', () => {
  const cards = sample();
  const next = rejectCard(cards, cards[0].id);
  assert.deepEqual(next.map((c) => c.state), ['rejected', 'new', 'new']);
  assert.equal(next[0].rejectTag, null);
});

test('rejectCard stores the optional reject tag', () => {
  const cards = sample();
  assert.equal(rejectCard(cards, cards[0].id, 'too_long')[0].rejectTag, 'too_long');
});

test('restoreCard returns a rejected card to new and clears its reject tag', () => {
  const cards = sample();
  const rejected = rejectCard(cards, cards[0].id, 'off_brand');
  const [restored] = restoreCard(rejected, cards[0].id);
  assert.deepEqual([restored.state, restored.rejectTag], ['new', null]);
});

test('toggleLikedTag adds a tag and removes it on the second toggle', () => {
  const cards = sample();
  const once = toggleLikedTag(cards, cards[0].id, 'humor');
  const twice = toggleLikedTag(once, cards[0].id, 'humor');
  assert.deepEqual([once[0].likedTags, twice[0].likedTags, cards[0].likedTags], [['humor'], [], []]);
});

test('setComment stores the comment on that card only', () => {
  const cards = sample();
  const next = setComment(cards, cards[2].id, 'love the tone');
  assert.deepEqual(next.map((c) => c.comment), ['', '', 'love the tone']);
});

test('keepCard marks only that card as kept, without mutating input', () => {
  const cards = sample();
  const next = keepCard(cards, cards[1].id);
  assert.deepEqual(next.map((c) => c.state), ['new', 'kept', 'new']);
  assert.equal(cards[1].state, 'new');
});
