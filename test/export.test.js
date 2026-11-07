import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportJson, exportCsv } from '../public/js/export.js';

const card = (type, text, state = 'kept') => ({ id: text, type, text, state });

test('exportJson lists kept hooks and on-screen texts as independent lists', () => {
  const cards = [
    card('hook', 'H1'),
    card('on_screen_text', 'T1'),
    card('hook', 'H2'),
    card('hook', 'rejected one', 'rejected'),
    card('on_screen_text', 'new one', 'new'),
  ];
  assert.deepEqual(JSON.parse(exportJson(cards)), { hooks: ['H1', 'H2'], on_screen_texts: ['T1'] });
});

test('exportCsv quotes cells containing commas, quotes or newlines and doubles inner quotes', () => {
  const cards = [card('hook', 'Wait, what?'), card('on_screen_text', 'He said "hi"'), card('hook', 'two\nlines')];
  assert.equal(exportCsv(cards), 'hook,on_screen_text\r\n"Wait, what?","He said ""hi"""\r\n"two\nlines",\r\n');
});

test('exportCsv leaves cells empty where the lists differ in length', () => {
  const longerTexts = [card('hook', 'H1'), card('on_screen_text', 'T1'), card('on_screen_text', 'T2')];
  assert.equal(exportCsv(longerTexts), 'hook,on_screen_text\r\nH1,T1\r\n,T2\r\n');
  assert.equal(exportCsv([card('hook', 'H1', 'rejected')]), 'hook,on_screen_text\r\n');
});

test('exportCsv aligns hooks and on-screen texts by index with a header row', () => {
  const cards = [card('hook', 'H1'), card('on_screen_text', 'T1'), card('hook', 'H2'), card('on_screen_text', 'T2')];
  assert.equal(exportCsv(cards), 'hook,on_screen_text\r\nH1,T1\r\nH2,T2\r\n');
});
