import 'dotenv/config';
import path from 'node:path';
import { app, BrowserWindow } from 'electron';
import { GoogleGenAI } from '@google/genai';
import { startServer } from '../src/server.js';
import { isAppUrl, windowOptions } from './window.js';

const smokeTest = process.argv.includes('--smoke-test');
const apiKey = (process.env.GEMINI_API_KEY ?? '').trim();
const client = apiKey ? new GoogleGenAI({ apiKey }) : null;
const model = process.env.MODEL || 'gemini-3.5-flash-lite';

app.whenReady().then(async () => {
  const server = await startServer({
    client,
    model,
    eventsPath: path.join(app.getPath('userData'), 'events.jsonl'),
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
        .executeJavaScript("document.querySelector('h1')?.textContent ?? ''")
        .then((title) => process.stdout.write(`SMOKE_OK ${title}\n`))
        .catch((err) => process.stdout.write(`SMOKE_FAIL ${err.message}\n`))
        .finally(() => app.quit());
    });
  }
  win.loadURL(server.url);
});

app.on('window-all-closed', () => app.quit());
