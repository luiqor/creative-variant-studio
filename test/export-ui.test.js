import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setupExport } from '../public/js/export-ui.js';

function fakeDom() {
  const handlers = {};
  globalThis.document = {
    getElementById: (id) => ({ addEventListener: (_, fn) => (handlers[id] = fn) }),
    createElement: () => ({ click() {} }),
  };
  globalThis.URL.createObjectURL = () => 'blob:x';
  globalThis.URL.revokeObjectURL = () => {};
  return handlers;
}

const card = (state) => ({ id: state, type: 'hook', text: state, state });

test('exporting with no Kept cards does not download or report, and tells the user', () => {
  const handlers = fakeDom();
  const exported = [];
  let empty = 0;
  setupExport({ getCards: () => [card('new')], onExported: (f) => exported.push(f), onNothingKept: () => empty++ });
  handlers['export-json']();
  assert.deepEqual(exported, []);
  assert.equal(empty, 1);
});

test('exporting with a Kept card reports the export', () => {
  const handlers = fakeDom();
  const exported = [];
  setupExport({ getCards: () => [card('kept')], onExported: (f) => exported.push(f), onNothingKept: () => {} });
  handlers['export-csv']();
  assert.deepEqual(exported, ['csv']);
});
