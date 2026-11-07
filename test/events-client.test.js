import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventForAction, feedbackEvent, exportEvent, reportEvent } from '../public/js/events.js';
import {
  initialState,
  addType,
  applyBatch,
  keepIdea,
  rejectIdea,
  openMore,
  toggleMoreTag,
  setMoreInstruction,
} from '../public/js/workspace.js';

const idOf = (state, text) => state.ideas.find((i) => i.text === text).id;
const generated = () => applyBatch(addType(initialState(), 'cta'), { hook: ['A', 'B'], cta: ['X'] });

test('keeping or rejecting an idea is reported with its id and idea type', () => {
  const state = generated();
  assert.deepEqual(eventForAction(state, 'keep', idOf(state, 'A')), {
    type: 'kept',
    data: { ideaId: idOf(state, 'A'), ideaType: 'hook' },
  });
  assert.deepEqual(eventForAction(state, 'reject', idOf(state, 'X')), {
    type: 'rejected',
    data: { ideaId: idOf(state, 'X'), ideaType: 'cta' },
  });
});

test('repeated, unknown and other actions are not reported', () => {
  const state = generated();
  const kept = keepIdea(state, idOf(state, 'A'));
  const rejected = rejectIdea(state, idOf(state, 'B'));
  assert.equal(eventForAction(kept, 'keep', idOf(state, 'A')), null);
  assert.equal(eventForAction(rejected, 'reject', idOf(state, 'B')), null);
  assert.equal(eventForAction(state, 'keep', 'nope'), null);
  for (const action of ['restore', 'unkeep', 'more']) {
    assert.equal(eventForAction(kept, action, idOf(state, 'A')), null);
  }
});

test('More like this with liked tags or an instruction is reported as feedback on the chosen idea', () => {
  const state = generated();
  const id = idOf(state, 'A');
  const withTags = toggleMoreTag(toggleMoreTag(openMore(state, id), 'humor'), 'short');
  assert.deepEqual(feedbackEvent(withTags), {
    type: 'feedback',
    data: { ideaId: id, ideaType: 'hook', kind: 'more_like_this', tags: ['humor', 'short'], hasInstruction: false },
  });
  const withText = setMoreInstruction(openMore(state, id), '  cheekier ');
  assert.equal(feedbackEvent(withText).data.hasInstruction, true);
  assert.deepEqual(feedbackEvent(withText).data.tags, []);
});

test('More like this without tags or an instruction is not feedback', () => {
  const state = generated();
  assert.equal(feedbackEvent(openMore(state, idOf(state, 'A'))), null);
  assert.equal(feedbackEvent(setMoreInstruction(openMore(state, idOf(state, 'A')), '   ')), null);
  assert.equal(feedbackEvent(state), null);
});

test('an export is reported with its format, the number of kept ideas and the idea types in it', () => {
  const state = generated();
  const kept = keepIdea(keepIdea(keepIdea(state, idOf(state, 'A')), idOf(state, 'B')), idOf(state, 'X'));
  assert.deepEqual(exportEvent(kept, 'jsx'), {
    type: 'exported',
    data: { format: 'jsx', count: 3, ideaTypes: ['hook', 'cta'] },
  });
});

test('reportEvent posts the event to the server and never throws', async () => {
  const calls = [];
  const ok = async (url, init) => {
    calls.push({ url, init });
    return { ok: true };
  };
  await reportEvent('kept', { ideaId: '1', ideaType: 'hook' }, ok);
  assert.equal(calls[0].url, '/api/events');
  assert.deepEqual(JSON.parse(calls[0].init.body), { type: 'kept', ideaId: '1', ideaType: 'hook' });
  await assert.doesNotReject(reportEvent('kept', {}, async () => {
    throw new Error('offline');
  }));
  await assert.doesNotReject(reportEvent('kept', {}, async () => ({ ok: false, status: 500 })));
});
