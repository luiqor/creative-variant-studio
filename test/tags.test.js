import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIKED_TAGS, REJECT_TAGS } from '../public/js/tags.js';

test('tag sets match the spec, each tag with an id and a label', () => {
  assert.deepEqual(LIKED_TAGS.map((t) => t.id), ['short', 'emotion', 'question', 'number', 'humor', 'tone']);
  assert.deepEqual(REJECT_TAGS.map((t) => t.id), ['too_long', 'off_brand', 'similar_to_another', 'unnatural']);
  assert.deepEqual(REJECT_TAGS.map((t) => t.label), ['Too long', 'Off-brand', 'Similar to another', 'Unnatural']);
});
