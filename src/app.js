import express from 'express';
import { fileURLToPath } from 'node:url';

export function createApp() {
  const app = express();
  app.use(express.static(fileURLToPath(new URL('../public', import.meta.url))));
  return app;
}
