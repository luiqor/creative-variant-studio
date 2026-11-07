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
  moveKept,
  dropIndex,
  setPreview,
  previewIdea,
  previewWarning,
  openMore,
  closeMore,
  toggleMoreTag,
  setMoreInstruction,
  moreRequest,
  canSubmitMore,
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

const keptThree = () => {
  const start = applyBatch(initialState(), { hook: ['A', 'B', 'C', 'D'], on_screen_text: ['T1', 'T2'] });
  return ['A', 'B', 'C', 'D', 'T1', 'T2'].reduce((state, text) => keepIdea(state, idOf(start, text)), start);
};

test('moving a kept idea puts it at the given position within its type', () => {
  const state = keptThree();
  assert.deepEqual(keptTexts(moveKept(state, 'hook', idOf(state, 'D'), 0), 'hook'), ['D', 'A', 'B', 'C']);
  assert.deepEqual(keptTexts(moveKept(state, 'hook', idOf(state, 'A'), 3), 'hook'), ['B', 'C', 'D', 'A']);
  assert.deepEqual(keptTexts(moveKept(state, 'hook', idOf(state, 'B'), 2), 'hook'), ['A', 'C', 'B', 'D']);
});

test('the position is clamped to the ends of the list', () => {
  const state = keptThree();
  assert.deepEqual(keptTexts(moveKept(state, 'hook', idOf(state, 'A'), 99), 'hook'), ['B', 'C', 'D', 'A']);
  assert.deepEqual(keptTexts(moveKept(state, 'hook', idOf(state, 'D'), -5), 'hook'), ['D', 'A', 'B', 'C']);
});

test('reordering one type never changes another type', () => {
  const state = keptThree();
  const moved = moveKept(state, 'hook', idOf(state, 'D'), 0);
  assert.deepEqual(keptTexts(moved, 'on_screen_text'), ['T1', 'T2']);
});

test('moving across types, an idea that is not kept, or to its own position changes nothing', () => {
  const state = keptThree();
  assert.equal(moveKept(state, 'hook', idOf(state, 'T1'), 0), state);
  assert.equal(moveKept(state, 'hook', 'nope', 0), state);
  assert.equal(moveKept(state, 'cta', idOf(state, 'A'), 0), state);
  assert.equal(moveKept(state, 'hook', idOf(state, 'B'), 1), state);
});

test('dropIndex turns "drop before or after a target" into the final position', () => {
  const list = ['a', 'b', 'c', 'd'];
  assert.equal(dropIndex(list, 'a', 'c', true), 2);
  assert.equal(dropIndex(list, 'd', 'b', false), 1);
  assert.equal(dropIndex(list, 'b', 'c', false), 1);
  assert.equal(dropIndex(list, 'c', 'b', true), 2);
  assert.equal(dropIndex(list, 'a', 'a', true), null);
  assert.equal(dropIndex(list, 'a', 'zzz', true), null);
  assert.equal(dropIndex(list, 'zzz', 'a', true), null);
});

const words = (n) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ');
const ideaOf = (type, text) => ({ id: 'x', type, text, status: 'new' });

test('the preview shows the idea that was last pointed at, or nothing before that', () => {
  const state = generated();
  assert.equal(previewIdea(state), null);
  const pointed = setPreview(state, idOf(state, 'B'));
  assert.equal(previewIdea(pointed).text, 'B');
  assert.equal(previewIdea(setPreview(state, 'nope')), null);
});

test('pointing at the same idea again returns the same state', () => {
  const pointed = setPreview(generated(), idOf(generated(), 'A'));
  assert.equal(setPreview(pointed, pointed.previewId), pointed);
});

test('an idea within its limits has no warning', () => {
  assert.equal(previewWarning(ideaOf('hook', words(8))), null);
  assert.equal(previewWarning(ideaOf('on_screen_text', words(15))), null);
  assert.equal(previewWarning(ideaOf('cta', words(15))), null);
});

test('an idea over the limit for its type warns, naming the limit', () => {
  assert.match(previewWarning(ideaOf('hook', words(9))), /9 words.*8-word limit/);
  assert.match(previewWarning(ideaOf('on_screen_text', words(16))), /16 words.*15-word limit/);
  assert.match(previewWarning(ideaOf('cta', words(16))), /16 words.*15-word limit/);
});

test('an idea that does not fit the frame warns even when within the word limit', () => {
  assert.match(previewWarning(ideaOf('hook', 'Unbelievablyunmatchable')), /may not fit/i);
});

test('opening More like this remembers the chosen idea; an unknown idea changes nothing', () => {
  const state = generated();
  const opened = openMore(state, idOf(state, 'B'));
  assert.deepEqual(opened.more, { id: idOf(state, 'B'), tags: [], instruction: '' });
  assert.equal(openMore(state, 'nope'), state);
});

test('liked tags toggle on and off, unknown tags are ignored', () => {
  const state = generated();
  const opened = openMore(state, state.ideas[0].id);
  const on = toggleMoreTag(toggleMoreTag(opened, 'humor'), 'short');
  assert.deepEqual(on.more.tags, ['humor', 'short']);
  assert.deepEqual(toggleMoreTag(on, 'humor').more.tags, ['short']);
  assert.equal(toggleMoreTag(opened, 'spicy'), opened);
  assert.equal(toggleMoreTag(state, 'humor'), state);
});

test('the request has the idea type, the chosen idea, all existing texts, the tags, the instruction and the count', () => {
  const start = generated();
  const withStates = rejectIdea(keepIdea(start, idOf(start, 'A')), idOf(start, 'T2'));
  const opened = setMoreInstruction(toggleMoreTag(openMore({ ...withStates, count: 6 }, idOf(start, 'B')), 'humor'), '  cheekier ');
  assert.deepEqual(moreRequest(opened), {
    type: 'hook',
    source: 'B',
    texts: ['A', 'B', 'C', 'T1', 'T2'],
    likedTags: ['humor'],
    instruction: 'cheekier',
    count: 6,
  });
});

test('More like this can be sent only while it is open and nothing is running', () => {
  const state = generated();
  const opened = openMore(state, state.ideas[0].id);
  assert.equal(canSubmitMore(opened), true);
  assert.equal(canSubmitMore({ ...opened, loading: true }), false);
  assert.equal(canSubmitMore(state), false);
});

test('closing More like this clears it', () => {
  const state = generated();
  const opened = openMore(state, state.ideas[0].id);
  assert.notEqual(opened.more, null);
  assert.equal(closeMore(opened).more, null);
});
