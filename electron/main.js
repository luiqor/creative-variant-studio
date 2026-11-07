import path from 'node:path';
import { app, BrowserWindow, safeStorage } from 'electron';
import { GoogleGenAI } from '@google/genai';
import { startServer } from '../src/server.js';
import { createTokenService } from '../src/tokens.js';
import { createTokenStore } from './token-store.js';
import { isAppUrl, windowOptions } from './window.js';

const smokeTest = process.argv.includes('--smoke-test');
const WAIT_FOR_HEADING = `new Promise((resolve) => {
  const timer = setInterval(() => {
    const heading = document.querySelector('h1');
    if (heading) {
      clearInterval(timer);
      resolve(heading.textContent);
    }
  }, 50);
  setTimeout(() => resolve(''), 5000);
})`;

app.whenReady().then(async () => {
  if (!app.isPackaged) await import('dotenv/config');
  const model = process.env.MODEL || 'gemini-3.5-flash-lite';
  const userData = app.getPath('userData');
  const tokens = createTokenService({
    store: createTokenStore({ safeStorage, file: path.join(userData, 'token.bin') }),
    createClient: (apiKey) => new GoogleGenAI({ apiKey }),
    env: app.isPackaged ? {} : process.env,
  });
  const server = await startServer({
    tokens,
    model,
    eventsPath: path.join(userData, 'events.jsonl'),
  });
  app.on('before-quit', () => server.close());

  const win = new BrowserWindow(windowOptions({ hidden: smokeTest }));
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => {
    if (!isAppUrl(url, server.url)) event.preventDefault();
  });

  if (smokeTest) {
    win.webContents.on('did-finish-load', () => {
      win.webContents
        .executeJavaScript(WAIT_FOR_HEADING)
        .then((title) => process.stdout.write(`SMOKE_OK ${title}\n`))
        .catch((err) => process.stdout.write(`SMOKE_FAIL ${err.message}\n`))
        .finally(() => app.quit());
    });
  }
  win.loadURL(server.url);
});

app.on('window-all-closed', () => app.quit());
