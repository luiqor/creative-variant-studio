import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createEventLog } from '../src/events.js';

const tmpLog = () => join(mkdtempSync(join(tmpdir(), 'events-')), 'events.jsonl');
const lines = (path) => readFileSync(path, 'utf8').trim().split('\n').map((l) => JSON.parse(l));

test('appends each event as one JSON line with a timestamp', () => {
  const path = tmpLog();
  const log = createEventLog(path, () => new Date('2026-01-02T03:04:05Z'));
  log.append('kept', { cardId: 'c1' });
  log.append('exported', { format: 'csv', count: 2 });
  assert.deepEqual(lines(path), [
    { type: 'kept', cardId: 'c1', timestamp: '2026-01-02T03:04:05.000Z' },
    { type: 'exported', format: 'csv', count: 2, timestamp: '2026-01-02T03:04:05.000Z' },
  ]);
});
