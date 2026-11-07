import { test } from 'node:test';
import assert from 'node:assert/strict';
import { windowOptions, isAppUrl } from '../electron/window.js';

test('the page cannot reach Node or the main process', () => {
  const { webPreferences } = windowOptions();
  assert.equal(webPreferences.nodeIntegration, false);
  assert.equal(webPreferences.contextIsolation, true);
  assert.equal(webPreferences.sandbox, true);
  assert.equal(webPreferences.preload, undefined);
  assert.equal(webPreferences.webSecurity, undefined);
});

test('the window can be created hidden for a startup check', () => {
  assert.equal(windowOptions().show, true);
  assert.equal(windowOptions({ hidden: true }).show, false);
});

test('only pages of the local server may be shown in the window', () => {
  const app = 'http://127.0.0.1:4321';
  assert.equal(isAppUrl('http://127.0.0.1:4321/', app), true);
  assert.equal(isAppUrl('http://127.0.0.1:4321/js/main.js?x=1#y', app), true);
  assert.equal(isAppUrl('http://127.0.0.1:9999/', app), false);
  assert.equal(isAppUrl('http://localhost:4321/', app), false);
  assert.equal(isAppUrl('https://example.com/', app), false);
  assert.equal(isAppUrl('file:///etc/passwd', app), false);
  assert.equal(isAppUrl('not a url', app), false);
});
