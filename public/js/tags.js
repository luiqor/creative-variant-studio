// Provisional tag sets (see spec); edit here only.
export const LIKED_TAGS = Object.freeze([
  { id: 'short', label: 'Short' },
  { id: 'emotion', label: 'Emotion' },
  { id: 'question', label: 'Question' },
  { id: 'number', label: 'Number' },
  { id: 'humor', label: 'Humor' },
  { id: 'tone', label: 'Tone' },
]);

export const REJECT_TAGS = Object.freeze([
  { id: 'too_long', label: 'Too long' },
  { id: 'off_brand', label: 'Off-brand' },
  { id: 'similar_to_another', label: 'Similar to another' },
  { id: 'unnatural', label: 'Unnatural' },
]);

const ALL_TAGS = [...LIKED_TAGS, ...REJECT_TAGS];

export const tagLabel = (id) => ALL_TAGS.find((tag) => tag.id === id)?.label ?? id;
