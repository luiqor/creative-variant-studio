import { LIMITS } from './config.js';
// Shared with the browser so tag ids and labels have one source of truth.
import { tagLabel } from '../public/js/tags.js';
import { DEFAULT_COUNT, TYPE_NAME } from '../public/js/idea-types.js';
import { buildSystemPrompt, ideaLabel, requestIdeas } from './generation.js';

const bullets = (items) => items.map((t) => `- ${t}`).join('\n');

export function moreLikeThisParams(cards, cardId) {
  const chosen = Array.isArray(cards) ? cards.find((c) => c?.id === cardId) : null;
  if (!chosen || typeof chosen.type !== 'string' || !TYPE_NAME.test(chosen.type)) return null;
  return {
    type: chosen.type,
    existingTexts: cards.map((c) => c.text),
    likedTags: chosen.likedTags ?? [],
    comment: chosen.comment ?? '',
    rejectedFeedback: cards
      .filter((c) => c.state === 'rejected')
      .map((c) => ({ text: c.text, rejectTag: c.rejectTag })),
  };
}

export async function generateMore({
  client,
  model,
  type,
  existingTexts,
  likedTags = [],
  comment = '',
  rejectedFeedback = [],
  limits = LIMITS,
}) {
  const fields = { [type]: DEFAULT_COUNT };
  const sections = [
    `Produce ${DEFAULT_COUNT} new ${ideaLabel(type, limits)}.`,
    `Do not repeat any of these existing texts:\n${bullets(existingTexts)}`,
  ];
  if (likedTags.length) {
    sections.push(`The designer liked these qualities in the chosen card: ${likedTags.map(tagLabel).join(', ')}.`);
  }
  if (comment.trim()) sections.push(`Designer's comment on the chosen card: ${comment.trim()}`);
  const hints = rejectedFeedback.filter((r) => r.rejectTag);
  if (hints.length) {
    sections.push(
      `Avoid the problems the designer flagged in rejected cards:\n${bullets(
        hints.map((r) => `"${r.text}" (${tagLabel(r.rejectTag)})`),
      )}`,
    );
  }
  return requestIdeas({
    client,
    model,
    system: buildSystemPrompt([type], limits),
    userPrompt: sections.join('\n\n'),
    fields,
  });
}
