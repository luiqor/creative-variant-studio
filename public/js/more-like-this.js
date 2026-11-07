import { createCards } from './cards.js';

export async function requestMore(cards, cardId, fetchFn = fetch) {
  const response = await fetchFn('/api/more-like-this', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardId, cards }),
  }).catch(() => {
    throw new Error('Could not reach the server.');
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status}).`);
  return body;
}

export const createMoreCards = (cards, batch) => [...cards, ...createCards(batch)];
