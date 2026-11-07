import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { wideCsv, jsonExport, buildAeScript, hasKept } from '../public/js/export.js';
import { initialState, addType, applyBatch, keepIdea, moveKept } from '../public/js/workspace.js';

const template = readFileSync(new URL('../public/ae/duplicate-from-csv.jsx', import.meta.url), 'utf8');

const idOf = (state, text) => state.ideas.find((i) => i.text === text).id;

function withKept(batch, keptTexts, extraType = null) {
  const base = extraType ? addType(initialState(), extraType) : initialState();
  const start = applyBatch(base, batch);
  return keptTexts.reduce((state, text) => keepIdea(state, idOf(start, text)), start);
}

test('nothing is exportable until something is kept', () => {
  assert.equal(hasKept(initialState()), false);
  assert.equal(hasKept(withKept({ hook: ['A'] }, [])), false);
  assert.equal(hasKept(withKept({ hook: ['A'] }, ['A'])), true);
});

test('the CSV has one column per type with kept ideas and one row per position in the kept order', () => {
  const state = withKept({ hook: ['A', 'B', 'C'], on_screen_text: ['T1', 'T2'] }, ['B', 'A', 'T1']);
  assert.equal(wideCsv(state), 'hook,on_screen_text\nB,T1\nA,');
});

test('the CSV leaves out types with nothing kept and follows the order after dragging', () => {
  const start = withKept({ hook: ['A', 'B', 'C'], on_screen_text: ['T1'], cta: ['X'] }, ['A', 'B', 'C', 'X'], 'cta');
  const moved = moveKept(start, 'hook', idOf(start, 'C'), 0);
  assert.equal(wideCsv(moved), 'hook,cta\nC,X\nA,\nB,');
});

test('the CSV quotes commas, quotes and line breaks', () => {
  const state = withKept({ hook: ['Hi, you', 'Say "hi"', 'two\nlines'] }, ['Hi, you', 'Say "hi"', 'two\nlines']);
  assert.equal(wideCsv(state), 'hook\n"Hi, you"\n"Say ""hi"""\n"two\nlines"');
});

test('the JSON has one array per type with kept ideas, in kept order', () => {
  const state = withKept({ hook: ['A', 'B'], on_screen_text: ['T1'], cta: ['X'] }, ['B', 'A', 'T1'], 'cta');
  assert.deepEqual(JSON.parse(jsonExport(state)), { hook: ['B', 'A'], on_screen_text: ['T1'] });
});

test('the template has exactly one data block and no file dialog', () => {
  assert.equal(template.match(/^\/\/ DATA-BEGIN$/gm).length, 1);
  assert.equal(template.match(/^\/\/ DATA-END$/gm).length, 1);
  assert.ok(template.indexOf('// DATA-BEGIN') < template.indexOf('// DATA-END'));
  assert.doesNotMatch(template, /openDialog/);
  assert.match(template, /^#target aftereffects/);
});

test('the template stays in ExtendScript style: no const, let or arrow functions', () => {
  const code = template.split('\n').filter((line) => !line.trim().startsWith('//')).join('\n');
  assert.doesNotMatch(code, /\b(const|let)\s/);
  assert.doesNotMatch(code, /=>/);
  assert.doesNotMatch(code, /`/);
});

test('the AE script embeds the CSV between the markers and leaves everything else untouched', () => {
  const first = buildAeScript(template, 'hook\nA');
  const second = buildAeScript(template, 'hook,cta\nB,X');
  const outside = (script) => script.replace(/\/\/ DATA-BEGIN[\s\S]*\/\/ DATA-END/, '');
  assert.match(first, /\/\/ DATA-BEGIN\nvar CSV_DATA = "hook\\nA";\n\/\/ DATA-END/);
  assert.match(second, /var CSV_DATA = "hook,cta\\nB,X";/);
  assert.equal(outside(first), outside(second));
  assert.equal(outside(first), outside(template));
});

test('the embedded text is a safe ASCII string literal', () => {
  const script = buildAeScript(template, 'hook\n"café" —   end');
  const literal = script.match(/var CSV_DATA = (.*);\n\/\/ DATA-END/)[1];
  assert.match(literal, /^[\x20-\x7e]*$/);
  assert.equal(JSON.parse(literal), 'hook\n"café" —   end');
});

test('building twice from the same template is repeatable', () => {
  const once = buildAeScript(template, 'hook\nA');
  assert.equal(buildAeScript(once, 'hook\nA'), once);
  assert.equal(buildAeScript(once, 'hook\nB'), buildAeScript(template, 'hook\nB'));
});

test('a template without markers is rejected', () => {
  assert.throws(() => buildAeScript('no markers here', 'hook\nA'), /markers/i);
});
