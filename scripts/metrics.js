import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function parseEvents(text) {
  return text.split('\n').flatMap((line) => {
    try {
      return line.trim() ? [JSON.parse(line)] : [];
    } catch {
      return [];
    }
  });
}

const distinctCards = (events, type) =>
  new Set(events.filter((e) => e.type === type && e.cardId).map((e) => e.cardId)).size;

const share = (part, whole) => (whole > 0 ? part / whole : null);

export function computeMetrics(text) {
  const events = parseEvents(text);
  const generatedCards = events
    .filter((e) => e.type === 'generated')
    .reduce((sum, e) => sum + (Number(e.count) || 0), 0);
  const keptCards = distinctCards(events, 'kept');
  const cardsWithFeedback = distinctCards(events, 'feedback');
  return {
    generatedCards,
    keptCards,
    cardsWithFeedback,
    keptShare: share(keptCards, generatedCards),
    feedbackShare: share(cardsWithFeedback, generatedCards),
  };
}

const percent = (value) => (value === null ? 'n/a' : `${(value * 100).toFixed(1)}%`);

export function formatReport(m) {
  return [
    `Kept share: ${percent(m.keptShare)} (${m.keptCards} distinct cards kept / ${m.generatedCards} cards generated)`,
    `Feedback share: ${percent(m.feedbackShare)} (${m.cardsWithFeedback} distinct cards with a liked tag or comment / ${m.generatedCards} cards generated)`,
    'A card counts as kept if it was ever Kept, even if later rejected or restored. Cards generated = sum of "generated" event counts.',
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const path = process.argv[2] ?? process.env.EVENTS_PATH ?? 'events.jsonl';
  const text = readFileSync(path, 'utf8');
  process.stdout.write(`${formatReport(computeMetrics(text))}\n`);
}
