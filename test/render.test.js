import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderCards } from '../public/js/render.js';

const card = (type, text, id = text) => ({ id, type, text, state: 'new' });

test('cards are grouped under a heading per type, hooks first', () => {
  const html = renderCards([card('on_screen_text', 'T1'), card('hook', 'H1')]);
  assert.ok(html.indexOf('Hooks') < html.indexOf('H1'));
  assert.ok(html.indexOf('H1') < html.indexOf('On-screen text'));
  assert.ok(html.indexOf('On-screen text') < html.indexOf('T1'));
});

test('card text is HTML-escaped', () => {
  const html = renderCards([card('hook', '<img src=x onerror=alert(1)>')]);
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&lt;img'));
});

test('only overflowing cards show the safe-zone warning', () => {
  const long = 'supercalifragilisticexpialidocious';
  const html = renderCards([card('hook', long), card('hook', 'Short one')]);
  assert.equal(html.split('Text may not fit the safe zone').length - 1, 1);
});

test('each card carries its id and sits in a 9:16 frame', () => {
  const html = renderCards([card('hook', 'Hi', 'abc')]);
  assert.ok(html.includes('data-card-id="abc"'));
  assert.ok(html.includes('class="frame"'));
});

test('no cards renders nothing', () => {
  assert.equal(renderCards([]), '');
});
