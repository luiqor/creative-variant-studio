import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/ae/duplicate-from-csv.jsx', import.meta.url), 'utf8').replace(/^#target.*\r?\n/, '');
const script = vm.createContext({ app: { project: null }, alert: () => {} });
vm.runInContext(source, script);

const plain = (value) => JSON.parse(JSON.stringify(value));
const layers = (...names) => names.map((name) => ({ name }));
const matched = (layerNames, headers) => plain(script.mapColumnsToLayers(layers(...layerNames), headers)).map((p) => [p.header, p.layerName]);

test('the on_screen_text column finds a layer however the designer spelled its name', () => {
  for (const layerName of ['Screen Text', 'On-screen text', 'on screen text', 'ON_SCREEN_TEXT', 'on_screen_text']) {
    assert.deepEqual(matched(['Hook', layerName], ['hook', 'on_screen_text']), [['hook', 'Hook'], ['on_screen_text', layerName]], layerName);
  }
});

test('columns still match layers by the exact name, case-insensitively', () => {
  assert.deepEqual(matched(['HOOK', 'first_line', 'OST'], ['hook', 'first_line', 'ost']), [['hook', 'HOOK'], ['first_line', 'first_line'], ['ost', 'OST']]);
});

test('a column is never matched to a layer with an unrelated name', () => {
  assert.deepEqual(matched(['Hook', 'Subtitle'], ['hook', 'on_screen_text']), [['hook', 'Hook']]);
});

test('columns without a matching text layer are reported instead of silently dropped', () => {
  const headers = ['hook', 'on_screen_text', 'cta', ''];
  const pairs = script.mapColumnsToLayers(layers('Hook', 'Subtitle'), headers);
  assert.deepEqual(plain(script.unmatchedHeaders(pairs, headers)), ['on_screen_text', 'cta']);
});

test('when every column has a layer nothing is reported', () => {
  const headers = ['hook', 'on_screen_text'];
  const pairs = script.mapColumnsToLayers(layers('Hook', 'Screen Text'), headers);
  assert.deepEqual(plain(script.unmatchedHeaders(pairs, headers)), []);
});

test('the confirm dialog lists the unmatched columns', () => {
  assert.match(source, /unmatchedHeaders\(pairs, headers\)/);
  assert.match(source, /No text layer found for/);
});
