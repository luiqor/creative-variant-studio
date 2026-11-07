import { LIMITS } from './config.js';
// Shared with the browser so tag ids and labels have one source of truth.
import { LIKED_TAGS, tagLabel } from '../public/js/tags.js';
import { DEFAULT_COUNT, MAX_COUNT, TYPE_NAME } from '../public/js/idea-types.js';
import { MAX_NOTE_LENGTH, buildSystemPrompt, ideaLabel, requestIdeas } from './generation.js';

export const MAX_EXISTING_TEXTS = 500;

const bullets = (items) => items.map((t) => `- ${t}`).join('\n');
const isText = (value) => typeof value === 'string';

export function parseMoreLikeThisRequest(body) {
  const { type, source, texts, likedTags = [], instruction = '', count = DEFAULT_COUNT } = body ?? {};
  if (!isText(type) || !TYPE_NAME.test(type)) return { error: 'Unknown idea type.' };
  if (!isText(source) || !source.trim()) return { error: 'Choose an idea first.' };
  if (!Array.isArray(texts) || texts.length > MAX_EXISTING_TEXTS || !texts.every(isText)) {
    return { error: 'The existing ideas must be a list of up to 500 texts.' };
  }
  const knownTags = LIKED_TAGS.map((tag) => tag.id);
  if (!Array.isArray(likedTags) || !likedTags.every((tag) => knownTags.includes(tag))) {
    return { error: 'Unknown liked tag.' };
  }
  if (!Number.isInteger(count) || count < 1 || count > MAX_COUNT) {
    return { error: `The number of ideas must be a whole number from 1 to ${MAX_COUNT}.` };
  }
  return {
    value: {
      type,
      source: source.trim(),
      existingTexts: texts,
      likedTags,
      instruction: isText(instruction) ? instruction.trim().slice(0, MAX_NOTE_LENGTH) : '',
      count,
    },
  };
}

export async function generateMore({
  client,
  model,
  type,
  source,
  existingTexts,
  likedTags = [],
  instruction = '',
  count = DEFAULT_COUNT,
  limits = LIMITS,
}) {
  const sections = [
    `Produce ${count} new ${ideaLabel(type, limits)}.`,
    `The designer chose this idea as the example to build on:\n"${source}"`,
    `Do not repeat any of these existing texts:\n${bullets(existingTexts)}`,
  ];
  if (likedTags.length) {
    sections.push(`The designer liked these qualities in the chosen idea: ${likedTags.map(tagLabel).join(', ')}.`);
  }
  if (instruction.trim()) sections.push(`Designer's instruction: ${instruction.trim()}`);
  return requestIdeas({
    client,
    model,
    system: buildSystemPrompt([type], limits),
    userPrompt: sections.join('\n\n'),
    fields: { [type]: count },
  });
}
