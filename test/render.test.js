import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderWorkspace } from '../public/js/render.js';
import { initialState, addType, applyBatch, toggleType, keepIdea, rejectIdea } from '../public/js/workspace.js';

const ready = { ...initialState(), script: 'Hook: hi' };
const generateButton = (html) => html.match(/<button[^>]*data-action="generate"[^>]*>[^<]*<\/button>/)[0];

test('shows the script and the note in their fields, escaped', () => {
  const html = renderWorkspace({ ...ready, script: 'a <b> & "c"', note: '<i>x</i>' });
  assert.match(html, /<textarea[^>]*data-field="script"[^>]*>a &lt;b&gt; &amp; &quot;c&quot;<\/textarea>/);
  assert.match(html, /data-field="note"[^>]*value="&lt;i&gt;x&lt;\/i&gt;"/);
});

test('shows every idea type as a chip, pressed when chosen', () => {
  const state = toggleType(addType(ready, 'cta'), 'hook');
  const html = renderWorkspace(state);
  assert.match(html, /data-action="toggle-type" data-type="hook" aria-pressed="false"[^>]*>Hook</);
  assert.match(html, /data-action="toggle-type" data-type="on_screen_text" aria-pressed="true"[^>]*>On-screen text</);
  assert.match(html, /data-action="toggle-type" data-type="cta" aria-pressed="true"[^>]*>CTA</);
});

test('shows the count per type', () => {
  assert.match(renderWorkspace({ ...ready, count: 7 }), /<output[^>]*data-count[^>]*>7<\/output>/);
});

test('Generate is enabled when the script and a type are present', () => {
  assert.doesNotMatch(generateButton(renderWorkspace(ready)), /disabled/);
  assert.match(generateButton(renderWorkspace(ready)), />Generate</);
});

test('Generate is disabled without a script, without a chosen type and while loading', () => {
  assert.match(generateButton(renderWorkspace(initialState())), /disabled/);
  const noTypes = toggleType(toggleType(ready, 'hook'), 'on_screen_text');
  assert.match(generateButton(renderWorkspace(noTypes)), /disabled/);
  const loading = generateButton(renderWorkspace({ ...ready, loading: true }));
  assert.match(loading, /disabled/);
  assert.match(loading, />Generating/);
});

test('shows a hint instead of ideas before the first Generate', () => {
  const html = renderWorkspace(ready);
  assert.match(html, /No ideas yet/);
  assert.doesNotMatch(html, /class="idea"/);
});

test('shows ideas as rows grouped under their idea type, escaped', () => {
  const state = applyBatch(ready, { hook: ['Lost a <sock>?', 'Again?'], on_screen_text: ['Never lose one'] });
  const html = renderWorkspace(state);
  const hookGroup = html.match(/<section class="group" data-type="hook">[\s\S]*?<\/section>/)[0];
  const textGroup = html.match(/<section class="group" data-type="on_screen_text">[\s\S]*?<\/section>/)[0];
  assert.match(hookGroup, /<h2>Hook<\/h2>/);
  assert.match(hookGroup, /Lost a &lt;sock&gt;\?/);
  assert.equal(hookGroup.match(/class="idea"/g).length, 2);
  assert.match(textGroup, /<h2>On-screen text<\/h2>/);
  assert.equal(textGroup.match(/class="idea"/g).length, 1);
  assert.doesNotMatch(html, /No ideas yet/);
});

test('shows the error as an alert only when there is one', () => {
  assert.match(renderWorkspace({ ...ready, error: 'Could not reach the server.' }), /role="alert"[^>]*>Could not reach the server\./);
  assert.doesNotMatch(renderWorkspace(ready), /role="alert"/);
});

const batch = () => applyBatch(ready, { hook: ['H1', 'H2', 'H3'], on_screen_text: ['T1'] });
const idOf = (state, text) => state.ideas.find((i) => i.text === text).id;
const section = (html, pattern) => html.match(pattern)?.[0] ?? '';

test('every idea row has Keep and Reject buttons carrying its id, and no tags or comment', () => {
  const state = batch();
  const html = renderWorkspace(state);
  const id = idOf(state, 'H1');
  assert.match(html, new RegExp(`data-action="keep" data-id="${id}"`));
  assert.match(html, new RegExp(`data-action="reject" data-id="${id}"`));
  assert.equal(html.match(/data-action="keep"/g).length, 4);
  assert.doesNotMatch(html, /liked-tags|reject-tags|placeholder="Optional comment"/);
});

test('kept ideas leave the review rows and appear in the Kept list of their type, in kept order', () => {
  const start = batch();
  const state = keepIdea(keepIdea(start, idOf(start, 'H3')), idOf(start, 'H1'));
  const html = renderWorkspace(state);
  const review = section(html, /<main class="review">[\s\S]*<\/main>/);
  const kept = section(html, /<section class="kept-group" data-type="hook">[\s\S]*?<\/section>/);
  assert.doesNotMatch(review, /H1|H3/);
  assert.match(review, /H2/);
  assert.ok(kept.indexOf('H3') > -1 && kept.indexOf('H3') < kept.indexOf('H1'));
  assert.match(kept, new RegExp(`data-action="unkeep" data-id="${idOf(start, 'H3')}"`));
});

test('a type with no kept ideas shows an empty message in the Kept pane', () => {
  const html = renderWorkspace(batch());
  assert.match(section(html, /<section class="kept-group" data-type="on_screen_text">[\s\S]*?<\/section>/), /Nothing kept yet/);
});

test('there is no Kept pane content before the first Generate', () => {
  assert.doesNotMatch(renderWorkspace(ready), /kept-group/);
});

test('rejected ideas collapse into a closed section with a count and Restore buttons', () => {
  const start = batch();
  const state = rejectIdea(start, idOf(start, 'H2'));
  const html = renderWorkspace(state);
  const rejected = section(html, /<details class="rejected">[\s\S]*?<\/details>/);
  assert.match(rejected, /Rejected \(1\)/);
  assert.match(rejected, /H2/);
  assert.match(rejected, new RegExp(`data-action="restore" data-id="${idOf(start, 'H2')}"`));
  assert.doesNotMatch(rejected, /<details[^>]* open/);
  assert.equal((section(html, /<main class="review">[\s\S]*<\/main>/).match(/class="idea"/g) ?? []).length, 3);
});

test('there is no rejected section when nothing was rejected', () => {
  assert.doesNotMatch(renderWorkspace(batch()), /class="rejected"/);
});

test('when every idea has been kept or rejected the review pane says so instead of "No ideas yet"', () => {
  const start = applyBatch(ready, { hook: ['H1', 'H2'] });
  const state = rejectIdea(keepIdea(start, idOf(start, 'H1')), idOf(start, 'H2'));
  const html = renderWorkspace(state);
  assert.match(html, /All ideas reviewed/);
  assert.doesNotMatch(html, /No ideas yet/);
});

test('kept items are draggable and carry their type so they can only be dropped within it', () => {
  const start = batch();
  const state = keepIdea(keepIdea(start, idOf(start, 'H1')), idOf(start, 'T1'));
  const html = renderWorkspace(state);
  const id = idOf(start, 'H1');
  assert.match(html, new RegExp(`<li class="kept-item" draggable="true" data-idea-id="${id}" data-type="hook"`));
  assert.match(html, /<li class="kept-item" draggable="true" data-idea-id="[^"]+" data-type="on_screen_text"/);
  assert.doesNotMatch(section(html, /<main class="review">[\s\S]*<\/main>/), /draggable/);
});
