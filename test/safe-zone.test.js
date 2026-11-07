import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitsSafeZone } from '../public/js/safe-zone.js';

const zone = { charsPerLine: 10, maxLines: 2 };

test('text that wraps within the allowed lines fits', () => {
  assert.equal(fitsSafeZone('Never lose a sock', zone), true);
});

test('text that needs more lines than allowed overflows', () => {
  assert.equal(fitsSafeZone('one two three four five six', zone), false);
});

test('a single word wider than the line overflows', () => {
  assert.equal(fitsSafeZone('Supercalifragilistic', zone), false);
});

test('empty text fits', () => {
  assert.equal(fitsSafeZone('   ', zone), true);
});
