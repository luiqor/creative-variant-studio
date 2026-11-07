import { GoogleGenAI } from '@google/genai';
import { loadConfig } from './config.js';
import { createApp } from './app.js';

const config = (() => {
  try {
    return loadConfig(process.env);
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
  }
})();

const client = new GoogleGenAI({ apiKey: config.apiKey });

createApp({ client, model: config.model, eventsPath: process.env.EVENTS_PATH ?? 'events.jsonl' }).listen(config.port, () => {
  process.stdout.write(`Listening on http://localhost:${config.port}\n`);
});
