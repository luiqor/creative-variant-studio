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

createApp().listen(config.port, () => {
  process.stdout.write(`Listening on http://localhost:${config.port}\n`);
});
