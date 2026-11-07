import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderWorkspace } from '../public/js/render.js';
import { initialState, addType, applyBatch, toggleType } from '../public/js/workspace.js';

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
