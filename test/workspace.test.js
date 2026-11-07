import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  initialState,
  toggleType,
  addType,
  setCount,
  canGenerate,
  generateRequest,
  applyBatch,
  groupIdeas,
  typeLabel,
  keepIdea,
  unkeepIdea,
  rejectIdea,
  restoreIdea,
  keptLists,
  rejectedIdeas,
} from '../public/js/workspace.js';

const withScript = (state, script = 'Hook: hi') => ({ ...state, script });
const enabled = (state) => state.types.filter((t) => t.on).map((t) => t.name);

test('starts with hook and on-screen text chosen and a count of 10', () => {
  const state = initialState();
  assert.deepEqual(enabled(state), ['hook', 'on_screen_text']);
  assert.equal(state.count, 10);
  assert.deepEqual(state.ideas, []);
});

test('toggling a type switches it off and on again', () => {
  const off = toggleType(initialState(), 'hook');
  assert.deepEqual(enabled(off), ['on_screen_text']);
  assert.deepEqual(enabled(toggleType(off, 'hook')), ['hook', 'on_screen_text']);
});

test('adding a custom type normalises its name and chooses it', () => {
  const state = addType(initialState(), '  Call To Action ');
  assert.deepEqual(enabled(state), ['hook', 'on_screen_text', 'call_to_action']);
});

test('adding an empty or duplicate type changes nothing', () => {
  const state = initialState();
  assert.equal(addType(state, '   '), state);
  assert.equal(addType(state, 'Hook'), state);
});

test('a type name that cannot be sent to the server is not added', () => {
  const state = initialState();
  assert.equal(addType(state, '123 go'), state);
  assert.equal(addType(state, 'a'.repeat(25)), state);
});

test('no more than 8 types can be added', () => {
  const full = ['a', 'b', 'c', 'd', 'e', 'f'].reduce(addType, initialState());
  assert.equal(full.types.length, 8);
  assert.equal(addType(full, 'one_more'), full);
});

test('the count stays between 1 and 30', () => {
  const state = initialState();
  assert.equal(setCount(state, 0).count, 1);
  assert.equal(setCount(state, 31).count, 30);
  assert.equal(setCount(state, 12).count, 12);
  assert.equal(setCount(state, 'abc').count, 10);
});

test('Generate needs a script, at least one chosen type and no running request', () => {
  const ready = withScript(initialState());
  assert.equal(canGenerate(ready), true);
  assert.equal(canGenerate(initialState()), false);
  assert.equal(canGenerate(withScript(initialState(), '   ')), false);
  assert.equal(canGenerate({ ...ready, loading: true }), false);
  const none = toggleType(toggleType(ready, 'hook'), 'on_screen_text');
  assert.equal(canGenerate(none), false);
});

test('the request contains only the chosen types, the count and the note', () => {
  const state = { ...withScript(toggleType(initialState(), 'hook'), ' Hook: hi '), count: 4, note: ' playful ' };
  assert.deepEqual(generateRequest(state), {
    script: 'Hook: hi',
    types: ['on_screen_text'],
    count: 4,
    note: 'playful',
  });
});

test('a batch is appended as ideas with unique ids, keeping earlier ideas', () => {
  const first = applyBatch(initialState(), { hook: ['A', 'B'], on_screen_text: ['C'] });
  const second = applyBatch(first, { hook: ['D'] });
  assert.deepEqual(
    second.ideas.map((i) => [i.type, i.text]),
    [['hook', 'A'], ['hook', 'B'], ['on_screen_text', 'C'], ['hook', 'D']],
  );
  assert.equal(new Set(second.ideas.map((i) => i.id)).size, 4);
});

test('ideas are grouped by type in the order the types were chosen', () => {
  const state = applyBatch(addType(initialState(), 'cta'), { cta: ['X'], on_screen_text: ['C'], hook: ['A'] });
  assert.deepEqual(
    groupIdeas(state).map((g) => [g.type, g.label, g.items.map((i) => i.text)]),
    [['hook', 'Hook', ['A']], ['on_screen_text', 'On-screen text', ['C']], ['cta', 'CTA', ['X']]],
  );
});

test('a type with no ideas has no group, and a switched-off type keeps its ideas', () => {
  const state = toggleType(applyBatch(initialState(), { hook: ['A'] }), 'hook');
  assert.deepEqual(groupIdeas(state).map((g) => g.type), ['hook']);
});

test('type labels are readable', () => {
  assert.equal(typeLabel('hook'), 'Hook');
  assert.equal(typeLabel('on_screen_text'), 'On-screen text');
  assert.equal(typeLabel('cta'), 'CTA');
  assert.equal(typeLabel('voice_over'), 'Voice over');
});

const generated = () => applyBatch(initialState(), { hook: ['A', 'B', 'C'], on_screen_text: ['T1', 'T2'] });
const idOf = (state, text) => state.ideas.find((i) => i.text === text).id;
const reviewTexts = (state) => groupIdeas(state).flatMap((g) => g.items.map((i) => i.text));
const keptTexts = (state, type) => keptLists(state).find((l) => l.type === type)?.items.map((i) => i.text) ?? [];

test('keeping an idea moves it from review to the Kept list of its type, in kept order', () => {
  const start = generated();
  const state = keepIdea(keepIdea(start, idOf(start, 'C')), idOf(start, 'A'));
  assert.deepEqual(keptTexts(state, 'hook'), ['C', 'A']);
  assert.deepEqual(reviewTexts(state), ['B', 'T1', 'T2']);
});

test('Kept lists are separate per idea type', () => {
  const start = generated();
  const state = keepIdea(keepIdea(start, idOf(start, 'A')), idOf(start, 'T2'));
  assert.deepEqual(keptTexts(state, 'hook'), ['A']);
  assert.deepEqual(keptTexts(state, 'on_screen_text'), ['T2']);
});

test('keeping the same idea twice or an unknown idea changes nothing', () => {
  const start = generated();
  const kept = keepIdea(start, idOf(start, 'A'));
  assert.equal(keepIdea(kept, idOf(start, 'A')), kept);
  assert.equal(keepIdea(start, 'nope'), start);
});

test('removing a kept idea returns it to review and out of the Kept list', () => {
  const start = generated();
  const kept = keepIdea(start, idOf(start, 'A'));
  const state = unkeepIdea(kept, idOf(start, 'A'));
  assert.deepEqual(keptTexts(state, 'hook'), []);
  assert.deepEqual(reviewTexts(state), ['A', 'B', 'C', 'T1', 'T2']);
  assert.equal(unkeepIdea(start, idOf(start, 'A')), start);
});

test('rejecting removes an idea from review and from the Kept list, without a reason', () => {
  const start = generated();
  const kept = keepIdea(start, idOf(start, 'A'));
  const state = rejectIdea(kept, idOf(start, 'A'));
  assert.deepEqual(reviewTexts(state), ['B', 'C', 'T1', 'T2']);
  assert.deepEqual(keptTexts(state, 'hook'), []);
  assert.deepEqual(rejectedIdeas(state).map((i) => i.text), ['A']);
  assert.equal(rejectIdea(state, idOf(start, 'A')), state);
});

test('restoring a rejected idea returns it to review', () => {
  const start = generated();
  const rejected = rejectIdea(start, idOf(start, 'B'));
  const state = restoreIdea(rejected, idOf(start, 'B'));
  assert.deepEqual(rejectedIdeas(state), []);
  assert.deepEqual(reviewTexts(state), ['A', 'B', 'C', 'T1', 'T2']);
  assert.equal(restoreIdea(start, idOf(start, 'B')), start);
});

test('a Kept list is shown for every type that has ideas, even when nothing is kept', () => {
  assert.deepEqual(keptLists(generated()).map((l) => [l.type, l.items.length]), [['hook', 0], ['on_screen_text', 0]]);
  assert.deepEqual(keptLists(initialState()), []);
});
