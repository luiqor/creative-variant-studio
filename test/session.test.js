import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSession } from '../public/js/session.js';

const memoryStorage = (initial = {}) => {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
};

const card = {
  id: 'a1',
  type: 'hook',
  text: 'Stop scrolling',
  state: 'kept',
  likedTags: ['short'],
  rejectTag: null,
  comment: 'nice',
};

test('saved cards are restored by a new session on the same storage', () => {
  const storage = memoryStorage();
  createSession(storage).save([card]);
  assert.deepEqual(createSession(storage).load(), [card]);
});

test('load returns no cards when nothing is stored', () => {
  assert.deepEqual(createSession(memoryStorage()).load(), []);
});

test('clear removes stored cards', () => {
  const storage = memoryStorage();
  const session = createSession(storage);
  session.save([card]);
  session.clear();
  assert.deepEqual(session.load(), []);
  assert.equal(storage.getItem('idea-generator-session'), null);
});

test('a storage that throws never breaks the session', () => {
  const fail = () => {
    throw new Error('blocked');
  };
  const session = createSession({ getItem: fail, setItem: fail, removeItem: fail });
  session.save([card]);
  session.clear();
  assert.deepEqual(session.load(), []);
});

test('load drops stored entries that are not valid cards', () => {
  const stored = JSON.stringify([card, null, 'x', { id: 'b' }, { ...card, id: 'a2', likedTags: 'short' }]);
  assert.deepEqual(createSession(memoryStorage({ 'idea-generator-session': stored })).load(), [card]);
});

test('load returns no cards when stored JSON is not a list', () => {
  assert.deepEqual(createSession(memoryStorage({ 'idea-generator-session': '{"a":1}' })).load(), []);
});

test('load returns no cards when stored data is corrupt', () => {
  assert.deepEqual(createSession(memoryStorage({ 'idea-generator-session': '{oops' })).load(), []);
});
