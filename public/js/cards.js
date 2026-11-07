const BATCH_FIELDS = [
  ['hooks', 'hook'],
  ['on_screen_texts', 'on_screen_text'],
];

export function createCards(batch) {
  return BATCH_FIELDS.flatMap(([field, type]) =>
    (batch[field] ?? []).map((text) => ({ id: crypto.randomUUID(), type, text, state: 'new' })),
  );
}
