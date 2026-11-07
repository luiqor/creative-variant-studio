import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderCards } from '../public/js/render.js';

const card = (type, text, id = text) => ({ id, type, text, state: 'new', likedTags: [], rejectTag: null, comment: '' });

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

test('a card has Keep, Reject and Copy actions, plus reject tag options', () => {
  const html = renderCards([card('hook', 'Hi', 'abc')]);
  for (const action of ['keep', 'reject', 'copy']) {
    assert.ok(html.includes(`data-action="${action}" data-card-id="abc"`), action);
  }
  assert.ok(html.includes('data-action="reject" data-card-id="abc" data-tag="too_long"'));
});

test('liked tags show pressed state and the comment box shows the escaped comment', () => {
  const html = renderCards([{ ...card('hook', 'Hi', 'abc'), likedTags: ['humor'], comment: 'a "b" <i>' }]);
  assert.ok(html.includes('data-action="like" data-card-id="abc" data-tag="humor" aria-pressed="true"'));
  assert.ok(html.includes('data-action="like" data-card-id="abc" data-tag="short" aria-pressed="false"'));
  assert.ok(html.includes('data-action="comment" data-card-id="abc"'));
  assert.ok(html.includes('a &quot;b&quot; &lt;i&gt;</textarea>'));
});

test('rejected cards leave the groups and collapse into a section with Restore', () => {
  const html = renderCards([card('hook', 'Live'), { ...card('hook', 'Gone'), state: 'rejected', rejectTag: 'too_long' }]);
  const [main, rejected] = html.split('<details class="rejected">');
  assert.ok(main.includes('Live') && !main.includes('Gone'));
  assert.ok(rejected.includes('Gone'));
  assert.ok(rejected.includes('data-action="restore" data-card-id="Gone"'));
  assert.ok(rejected.includes('Too long'));
  assert.ok(!html.includes('<details class="rejected" open'));
});

test('kept cards are listed in a Kept section', () => {
  const html = renderCards([card('hook', 'Mine'), { ...card('hook', 'Keeper'), state: 'kept' }]);
  const kept = html.slice(html.indexOf('<section class="kept">'));
  assert.ok(kept.includes('Keeper') && !kept.includes('Mine'));
});

test('no cards renders nothing', () => {
  assert.equal(renderCards([]), '');
});
