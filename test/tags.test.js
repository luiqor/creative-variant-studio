import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIKED_TAGS, tagLabel } from '../public/js/tags.js';

test('the liked tag set matches the spec, each tag with an id and a label', () => {
  assert.deepEqual(LIKED_TAGS.map((t) => t.id), ['short', 'emotion', 'question', 'number', 'humor', 'tone']);
  assert.ok(LIKED_TAGS.every((t) => t.label));
});

test('tagLabel returns the label, or the id for an unknown tag', () => {
  assert.equal(tagLabel('humor'), 'Humor');
  assert.equal(tagLabel('mystery'), 'mystery');
});
