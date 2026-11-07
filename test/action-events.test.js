import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventForAction, trackAction, trackExport } from '../public/js/action-events.js';

const card = { id: 'c1', type: 'hook', likedTags: ['Short'], comment: '' };

test('Keep produces a kept event for the card', () => {
  assert.deepEqual(eventForAction('keep', card), { type: 'kept', data: { cardId: 'c1' } });
});

test('Reject produces a rejected event with the reject tag; Restore produces none', () => {
  assert.deepEqual(eventForAction('reject', card, 'Too long'), { type: 'rejected', data: { cardId: 'c1', rejectTag: 'Too long' } });
  assert.deepEqual(eventForAction('reject', card), { type: 'rejected', data: { cardId: 'c1', rejectTag: null } });
  assert.equal(eventForAction('restore', card), null);
});

test('liking a new tag is feedback; un-liking a tag is not', () => {
  assert.deepEqual(eventForAction('like', card, 'Funny'), { type: 'feedback', data: { cardId: 'c1', kind: 'tag', tag: 'Funny' } });
  assert.equal(eventForAction('like', card, 'Short'), null);
});

test('a non-empty comment is feedback; clearing it is not', () => {
  assert.deepEqual(eventForAction('comment', card, null, 'Nice'), { type: 'feedback', data: { cardId: 'c1', kind: 'comment' } });
  assert.equal(eventForAction('comment', card, null, '  '), null);
});

test('trackAction reports the mapped event for the card, and nothing when there is none', () => {
  const sent = [];
  const report = (type, data) => sent.push({ type, data });
  trackAction([card], 'c1', 'keep', undefined, undefined, report);
  trackAction([card], 'c1', 'restore', undefined, undefined, report);
  trackAction([], 'zzz', 'keep', undefined, undefined, report);
  assert.deepEqual(sent, [{ type: 'kept', data: { cardId: 'c1' } }]);
});

test('trackExport reports format and number of exported cards', () => {
  const sent = [];
  trackExport('csv', [{ ...card, state: 'kept' }, card], (type, data) => sent.push({ type, data }));
  assert.deepEqual(sent, [{ type: 'exported', data: { format: 'csv', count: 1 } }]);
});
