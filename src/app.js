import express from 'express';
import { fileURLToPath } from 'node:url';
import { generateBatch, GenerationError, parseGenerateRequest } from './generation.js';
import { setupEvents } from './events-route.js';
import { generateMore, moreLikeThisParams } from './more-like-this.js';

function respondWithBatch(res, events, produce) {
  return produce()
    .then((batch) => {
      events.recordGenerated(batch);
      res.json(batch);
    })
    .catch((err) => {
      if (err instanceof GenerationError) return res.status(502).json({ error: err.message });
      res.status(500).json({ error: 'Unexpected server error.' });
    });
}

export function createApp({ client, model, eventsPath } = {}) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  const events = setupEvents(app, eventsPath);
  app.use(express.static(fileURLToPath(new URL('../public', import.meta.url))));

  app.post('/api/generate', (req, res) => {
    const { value, error } = parseGenerateRequest(req.body);
    if (error) return res.status(400).json({ error });
    return respondWithBatch(res, events, () => generateBatch({ client, model, ...value }));
  });

  app.post('/api/more-like-this', (req, res) => {
    const params = moreLikeThisParams(req.body?.cards, req.body?.cardId);
    if (!params) return res.status(400).json({ error: 'Unknown card.' });
    return respondWithBatch(res, events, () => generateMore({ client, model, ...params }));
  });

  return app;
}
