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

const UNKNOWN = 'unknown';
const ideaKey = (event) => event.ideaId ?? event.cardId;
const share = (part, whole) => (whole > 0 ? part / whole : null);

function distinctByType(events, type) {
  const seen = new Map();
  for (const event of events) {
    const key = event.type === type ? ideaKey(event) : null;
    if (key && !seen.has(key)) seen.set(key, event.ideaType ?? UNKNOWN);
  }
  return seen;
}

const countByType = (seen) => {
  const counts = {};
  for (const ideaType of seen.values()) counts[ideaType] = (counts[ideaType] ?? 0) + 1;
  return counts;
};

function generatedByType(events) {
  const totals = {};
  const add = (type, n) => {
    totals[type] = (totals[type] ?? 0) + n;
  };
  for (const event of events.filter((e) => e.type === 'generated')) {
    const counts = event.counts ?? {};
    const typed = Object.values(counts).reduce((sum, n) => sum + (Number(n) || 0), 0);
    for (const [type, n] of Object.entries(counts)) add(type, Number(n) || 0);
    const rest = (Number(event.count) || 0) - typed;
    if (rest > 0) add(UNKNOWN, rest);
  }
  return totals;
}

const summary = (generatedCards, keptCards, cardsWithFeedback) => ({
  generatedCards,
  keptCards,
  cardsWithFeedback,
  keptShare: share(keptCards, generatedCards),
  feedbackShare: share(cardsWithFeedback, generatedCards),
});

export function computeMetrics(text) {
  const events = parseEvents(text);
  const generated = generatedByType(events);
  const kept = countByType(distinctByType(events, 'kept'));
  const feedback = countByType(distinctByType(events, 'feedback'));
  const types = new Set([...Object.keys(generated), ...Object.keys(kept), ...Object.keys(feedback)]);
  const sum = (counts) => Object.values(counts).reduce((total, n) => total + n, 0);
  return {
    ...summary(sum(generated), sum(kept), sum(feedback)),
    byType: Object.fromEntries(
      [...types].map((type) => [type, summary(generated[type] ?? 0, kept[type] ?? 0, feedback[type] ?? 0)]),
    ),
  };
}

const percent = (value) => (value === null ? 'n/a' : `${(value * 100).toFixed(1)}%`);

const typeLine = ([type, m]) =>
  `  ${type}: kept ${percent(m.keptShare)} (${m.keptCards}/${m.generatedCards}), feedback ${percent(m.feedbackShare)} (${m.cardsWithFeedback}/${m.generatedCards})`;

export function formatReport(m) {
  const types = Object.entries(m.byType ?? {});
  const perType = types.length > 0 ? ['By idea type ("unknown" = events from before idea types):', ...types.map(typeLine)] : [];
  return [
    `Kept share: ${percent(m.keptShare)} (${m.keptCards} distinct cards kept / ${m.generatedCards} cards generated)`,
    `Feedback share: ${percent(m.feedbackShare)} (${m.cardsWithFeedback} distinct cards with a liked tag or comment / ${m.generatedCards} cards generated)`,
    'A card counts as kept if it was ever Kept, even if later rejected or restored. Cards generated = sum of "generated" event counts.',
    ...perType,
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const path = process.argv[2] ?? process.env.EVENTS_PATH ?? 'events.jsonl';
  const text = readFileSync(path, 'utf8');
  process.stdout.write(`${formatReport(computeMetrics(text))}\n`);
}
