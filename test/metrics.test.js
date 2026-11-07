import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeMetrics, formatReport } from '../scripts/metrics.js';

const sample = [
  { type: 'generated', count: 20 },
  { type: 'generated', count: 20 },
  { type: 'kept', cardId: 'a' },
  { type: 'kept', cardId: 'a' },
  { type: 'kept', cardId: 'b' },
  { type: 'rejected', cardId: 'c' },
  { type: 'feedback', cardId: 'a', kind: 'tag', tag: 'Funny' },
  { type: 'feedback', cardId: 'a', kind: 'comment' },
  { type: 'feedback', cardId: 'c', kind: 'comment' },
  { type: 'exported', format: 'csv', count: 2 },
]
  .map((e) => JSON.stringify({ ...e, timestamp: '2026-01-01T00:00:00.000Z' }))
  .join('\n');

test('computes shares of Kept cards and cards with feedback over all generated cards', () => {
  assert.deepEqual(computeMetrics(sample), {
    generatedCards: 40,
    keptCards: 2,
    cardsWithFeedback: 2,
    keptShare: 0.05,
    feedbackShare: 0.05,
    byType: {
      unknown: { generatedCards: 40, keptCards: 2, cardsWithFeedback: 2, keptShare: 0.05, feedbackShare: 0.05 },
    },
  });
});

test('the report states both denominators explicitly', () => {
  const report = formatReport(computeMetrics(sample));
  assert.match(report, /Kept share: 5\.0% \(2 distinct cards kept \/ 40 cards generated\)/);
  assert.match(report, /Feedback share: 5\.0% \(2 distinct cards with a liked tag or comment \/ 40 cards generated\)/);
});

test('shares are null when no cards were generated; blank and malformed lines are ignored', () => {
  assert.deepEqual(computeMetrics('\nnot json\n'), {
    generatedCards: 0,
    keptCards: 0,
    cardsWithFeedback: 0,
    keptShare: null,
    feedbackShare: null,
    byType: {},
  });
  assert.match(formatReport(computeMetrics('')), /n\/a/);
});

const log = (events) =>
  events.map((e) => JSON.stringify({ ...e, timestamp: '2026-01-01T00:00:00.000Z' })).join('\n');

const typed = log([
  { type: 'generated', count: 30, counts: { hook: 20, on_screen_text: 10 } },
  { type: 'kept', ideaId: 'h1', ideaType: 'hook' },
  { type: 'kept', ideaId: 'h1', ideaType: 'hook' },
  { type: 'kept', ideaId: 'h2', ideaType: 'hook' },
  { type: 'kept', ideaId: 't1', ideaType: 'on_screen_text' },
  { type: 'rejected', ideaId: 'h3', ideaType: 'hook' },
  { type: 'feedback', ideaId: 'h1', ideaType: 'hook', kind: 'more_like_this' },
  { type: 'exported', format: 'jsx', count: 3 },
]);

test('shares are reported overall and per idea type', () => {
  assert.deepEqual(computeMetrics(typed), {
    generatedCards: 30,
    keptCards: 3,
    cardsWithFeedback: 1,
    keptShare: 3 / 30,
    feedbackShare: 1 / 30,
    byType: {
      hook: { generatedCards: 20, keptCards: 2, cardsWithFeedback: 1, keptShare: 0.1, feedbackShare: 0.05 },
      on_screen_text: { generatedCards: 10, keptCards: 1, cardsWithFeedback: 0, keptShare: 0.1, feedbackShare: 0 },
    },
  });
});

test('old events without an idea type are counted overall and under "unknown", next to typed events', () => {
  const mixed = `${sample}\n${typed}`;
  const metrics = computeMetrics(mixed);
  assert.equal(metrics.generatedCards, 70);
  assert.equal(metrics.byType.unknown.generatedCards, 40);
  assert.equal(metrics.byType.unknown.keptCards, 2);
  assert.equal(metrics.byType.hook.generatedCards, 20);
});

test('a generated event whose counts do not add up to its total puts the rest under "unknown"', () => {
  const metrics = computeMetrics(log([{ type: 'generated', count: 12, counts: { hook: 10 } }]));
  assert.equal(metrics.byType.hook.generatedCards, 10);
  assert.equal(metrics.byType.unknown.generatedCards, 2);
});

test('the report adds one line per idea type', () => {
  const report = formatReport(computeMetrics(typed));
  assert.match(report, /hook: kept 10\.0% \(2\/20\), feedback 5\.0% \(1\/20\)/);
  assert.match(report, /on_screen_text: kept 10\.0% \(1\/10\), feedback 0\.0% \(0\/10\)/);
});
