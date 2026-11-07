import { reportEvent } from './metrics.js';

export function eventForAction(action, card, tag = null, comment = '') {
  if (action === 'comment' && comment.trim()) {
    return { type: 'feedback', data: { cardId: card.id, kind: 'comment' } };
  }
  if (action === 'keep') return { type: 'kept', data: { cardId: card.id } };
  if (action === 'reject') return { type: 'rejected', data: { cardId: card.id, rejectTag: tag } };
  if (action === 'like' && !card.likedTags.includes(tag)) {
    return { type: 'feedback', data: { cardId: card.id, kind: 'tag', tag } };
  }
  return null;
}

// Call before the action is applied: "like" depends on the card's tags prior to the toggle.
export function trackAction(cards, cardId, action, tag, comment, report = reportEvent) {
  const card = cards.find((c) => c.id === cardId);
  const event = card && eventForAction(action, card, tag ?? null, comment ?? '');
  if (event) report(event.type, event.data);
}

export function trackExport(format, cards, report = reportEvent) {
  report('exported', { format, count: cards.filter((c) => c.state === 'kept').length });
}
