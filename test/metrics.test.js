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
  });
  assert.match(formatReport(computeMetrics('')), /n\/a/);
});
