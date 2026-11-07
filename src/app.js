import express from 'express';
import { fileURLToPath } from 'node:url';
import { generateBatch, GenerationError, TokenRejectedError, parseGenerateRequest } from './generation.js';
import { setupEvents } from './events-route.js';
import { generateMore, parseMoreLikeThisRequest } from './more-like-this.js';

function respondWithBatch(res, events, produce) {
  return produce()
    .then((batch) => {
      events.recordGenerated(batch);
      res.json(batch);
    })
    .catch((err) => {
      if (err instanceof TokenRejectedError) {
        return res.status(401).json({ error: err.message, code: 'token_rejected' });
      }
      if (err instanceof GenerationError) return res.status(502).json({ error: err.message });
      res.status(500).json({ error: 'Unexpected server error.' });
    });
}

const MAX_TOKEN_LENGTH = 512;

const tokenMissing = (res) =>
  res.status(401).json({ error: 'Add your Gemini token first.', code: 'token_missing' });

export function createApp({ client, model, eventsPath, tokens } = {}) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  const events = setupEvents(app, eventsPath);
  const activeClient = () => (tokens ? tokens.getClient() : client);
  app.use(express.static(fileURLToPath(new URL('../public', import.meta.url))));

  app.post('/api/generate', (req, res) => {
    const { value, error } = parseGenerateRequest(req.body);
    if (error) return res.status(400).json({ error });
    if (tokens && !activeClient()) return tokenMissing(res);
    return respondWithBatch(res, events, () => generateBatch({ client: activeClient(), model, ...value }));
  });

  app.post('/api/more-like-this', (req, res) => {
    const { value, error } = parseMoreLikeThisRequest(req.body);
    if (error) return res.status(400).json({ error });
    if (tokens && !activeClient()) return tokenMissing(res);
    return respondWithBatch(res, events, () => generateMore({ client: activeClient(), model, ...value }));
  });

  app.get('/api/token', (req, res) => {
    res.json({ required: Boolean(tokens), configured: tokens ? tokens.configured() : true });
  });

  if (tokens) {
    app.put('/api/token', (req, res) => {
      const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
      if (!token || token.length > MAX_TOKEN_LENGTH) {
        return res.status(400).json({ error: 'Paste your Gemini token.' });
      }
      try {
        tokens.save(token);
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
      return res.json({ configured: true });
    });
  }

  return app;
}
