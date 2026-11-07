const BATCH_FIELDS = [
  ['hooks', 'hook'],
  ['on_screen_texts', 'on_screen_text'],
];

export function createCards(batch) {
  return BATCH_FIELDS.flatMap(([field, type]) =>
    (batch[field] ?? []).map((text) => ({
      id: crypto.randomUUID(),
      type,
      text,
      state: 'new',
      likedTags: [],
      rejectTag: null,
      comment: '',
    })),
  );
}

const updateCard = (cards, id, change) =>
  cards.map((card) => (card.id === id ? { ...card, ...change } : card));

export function toggleLikedTag(cards, id, tag) {
  return cards.map((card) => {
    if (card.id !== id) return card;
    const likedTags = card.likedTags.includes(tag)
      ? card.likedTags.filter((t) => t !== tag)
      : [...card.likedTags, tag];
    return { ...card, likedTags };
  });
}

export function setComment(cards, id, comment) {
  return updateCard(cards, id, { comment });
}

export function keepCard(cards, id) {
  return updateCard(cards, id, { state: 'kept' });
}

export function rejectCard(cards, id, rejectTag = null) {
  return updateCard(cards, id, { state: 'rejected', rejectTag });
}

export function restoreCard(cards, id) {
  return updateCard(cards, id, { state: 'new', rejectTag: null });
}
