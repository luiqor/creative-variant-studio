import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSession } from '../public/js/session.js';
import {
  initialState,
  addType,
  applyBatch,
  keepIdea,
  moveKept,
  rejectIdea,
  setCount,
  newScript,
  openMore,
  setPreview,
} from '../public/js/workspace.js';

function fakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

const idOf = (state, text) => state.ideas.find((i) => i.text === text).id;

function worked() {
  const base = {
    ...addType(setCount(initialState(), 8), 'cta'),
    script: 'Hook: hi',
    note: 'playful',
  };
  const start = applyBatch(base, { hook: ['A', 'B', 'C'], on_screen_text: ['T1'], cta: ['X'] });
  const kept = ['A', 'B', 'C', 'T1'].reduce((state, text) => keepIdea(state, idOf(start, text)), start);
  return rejectIdea(moveKept(kept, 'hook', idOf(start, 'C'), 0), idOf(start, 'X'));
}

test('a saved session comes back with the same ideas, states, Kept order, types, count, note and script', () => {
  const storage = fakeStorage();
  const state = worked();
  createSession(storage).save(state);
  const loaded = createSession(storage).load();
  assert.deepEqual(loaded.ideas, state.ideas);
  assert.deepEqual(loaded.kept, state.kept);
  assert.deepEqual(loaded.types, state.types);
  assert.equal(loaded.count, 8);
  assert.equal(loaded.note, 'playful');
  assert.equal(loaded.script, 'Hook: hi');
  assert.deepEqual(loaded.kept.hook.map((id) => loaded.ideas.find((i) => i.id === id).text), ['C', 'A', 'B']);
});

test('temporary things are not saved: a running request, an error, an open modal, the preview', () => {
  const storage = fakeStorage();
  const state = worked();
  const busy = { ...setPreview(openMore(state, state.ideas[0].id), state.ideas[0].id), loading: true, error: 'boom' };
  createSession(storage).save(busy);
  const loaded = createSession(storage).load();
  assert.equal(loaded.loading, false);
  assert.equal(loaded.error, '');
  assert.equal(loaded.more, null);
  assert.equal(loaded.previewId, null);
});

test('with nothing saved, the session starts empty', () => {
  assert.deepEqual(createSession(fakeStorage()).load(), initialState());
});

test('damaged or old-format data does not crash and starts empty', () => {
  for (const raw of ['not json', '[]', '{"version":99}', '{"version":1,"ideas":"x"}', 'null', '[{"id":"1","type":"hook","text":"old card","state":"kept"}]']) {
    const storage = fakeStorage();
    createSession(storage).save(worked());
    const savedKey = [...storage.data.keys()][0];
    storage.data.set(savedKey, raw);
    assert.deepEqual(createSession(storage).load(), initialState(), raw);
  }
});

test('unusable entries are dropped while the rest is kept', () => {
  const storage = fakeStorage();
  createSession(storage).save(worked());
  const savedKey = [...storage.data.keys()][0];
  const saved = JSON.parse(storage.data.get(savedKey));
  saved.ideas.push({ id: 'bad1', type: 'Not Valid', text: 'x', status: 'new' });
  saved.ideas.push({ id: 'bad2', type: 'hook', text: 5, status: 'new' });
  saved.ideas.push({ id: 'bad3', type: 'hook', text: 'x', status: 'weird' });
  saved.kept.hook.push('missing-id');
  saved.count = 999;
  storage.data.set(savedKey, JSON.stringify(saved));
  const loaded = createSession(storage).load();
  assert.equal(loaded.ideas.length, worked().ideas.length);
  assert.ok(!loaded.kept.hook.includes('missing-id'));
  assert.equal(loaded.count, 30);
});

test('a kept idea missing from the saved order is added to the end of its list', () => {
  const storage = fakeStorage();
  const state = worked();
  createSession(storage).save(state);
  const savedKey = [...storage.data.keys()][0];
  const saved = JSON.parse(storage.data.get(savedKey));
  saved.kept.hook = saved.kept.hook.slice(0, 1);
  storage.data.set(savedKey, JSON.stringify(saved));
  const loaded = createSession(storage).load();
  assert.equal(loaded.kept.hook.length, 3);
  assert.equal(loaded.kept.hook[0], state.kept.hook[0]);
});

test('clear forgets the saved session', () => {
  const storage = fakeStorage();
  const session = createSession(storage);
  session.save(worked());
  session.clear();
  assert.deepEqual(session.load(), initialState());
});

test('a storage that fails never breaks the page', () => {
  const broken = {
    getItem: () => {
      throw new Error('denied');
    },
    setItem: () => {
      throw new Error('quota');
    },
    removeItem: () => {
      throw new Error('denied');
    },
  };
  const session = createSession(broken);
  assert.deepEqual(session.load(), initialState());
  assert.doesNotThrow(() => session.save(worked()));
  assert.doesNotThrow(() => session.clear());
});

test('New script returns a completely empty workspace', () => {
  assert.deepEqual(newScript(worked()), initialState());
});
