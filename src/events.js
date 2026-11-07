import { appendFileSync } from 'node:fs';

export function createEventLog(path, now = () => new Date()) {
  return {
    append(type, data = {}) {
      const event = { type, ...data, timestamp: now().toISOString() };
      appendFileSync(path, `${JSON.stringify(event)}\n`);
    },
  };
}
