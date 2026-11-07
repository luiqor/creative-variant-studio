import { createEventLog } from './events.js';

export const CLIENT_EVENT_TYPES = ['kept', 'rejected', 'feedback', 'exported'];

export function setupEvents(app, eventsPath) {
  const log = eventsPath ? createEventLog(eventsPath) : null;

  app.post('/api/events', (req, res) => {
    const { type, ...data } = req.body ?? {};
    if (!CLIENT_EVENT_TYPES.includes(type)) return res.status(400).json({ error: 'Unknown event type.' });
    log?.append(type, data);
    res.status(204).end();
  });

  return {
    recordGenerated(batch) {
      const counts = Object.fromEntries(Object.entries(batch).map(([type, ideas]) => [type, ideas.length]));
      const count = Object.values(counts).reduce((sum, n) => sum + n, 0);
      try {
        log?.append('generated', { count, counts });
      } catch {
        // Metrics must never break generation.
      }
    },
  };
}
