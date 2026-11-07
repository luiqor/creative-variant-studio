import Anthropic from '@anthropic-ai/sdk';
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

const client = new Anthropic({ apiKey: config.apiKey });

createApp({ client, model: config.model }).listen(config.port, () => {
  process.stdout.write(`Listening on http://localhost:${config.port}\n`);
});
