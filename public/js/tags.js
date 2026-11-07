// Provisional tag set (see spec); edit here only.
export const LIKED_TAGS = Object.freeze([
  { id: 'short', label: 'Short' },
  { id: 'emotion', label: 'Emotion' },
  { id: 'question', label: 'Question' },
  { id: 'number', label: 'Number' },
  { id: 'humor', label: 'Humor' },
  { id: 'tone', label: 'Tone' },
]);

export const tagLabel = (id) => LIKED_TAGS.find((tag) => tag.id === id)?.label ?? id;
