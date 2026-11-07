import express from 'express';
import { fileURLToPath } from 'node:url';
import { generateBatch, GenerationError } from './generation.js';
import { generateMore, moreLikeThisParams } from './more-like-this.js';

export function createApp({ client, model } = {}) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(express.static(fileURLToPath(new URL('../public', import.meta.url))));

  app.post('/api/generate', async (req, res) => {
    const script = typeof req.body?.script === 'string' ? req.body.script.trim() : '';
    if (!script) return res.status(400).json({ error: 'Paste a winning script first.' });
    try {
      res.json(await generateBatch({ client, model, script }));
    } catch (err) {
      if (err instanceof GenerationError) return res.status(502).json({ error: err.message });
      res.status(500).json({ error: 'Unexpected server error.' });
    }
  });

  app.post('/api/more-like-this', async (req, res) => {
    const params = moreLikeThisParams(req.body?.cards, req.body?.cardId);
    if (!params) return res.status(400).json({ error: 'Unknown card.' });
    try {
      res.json(await generateMore({ client, model, ...params }));
    } catch (err) {
      if (err instanceof GenerationError) return res.status(502).json({ error: err.message });
      res.status(500).json({ error: 'Unexpected server error.' });
    }
  });

  return app;
}
