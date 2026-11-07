// Shared by the browser and the server so both enforce the same rules.
export const TYPE_NAME = /^[a-z][a-z0-9_]{0,23}$/;
export const MAX_TYPES = 8;
export const DEFAULT_COUNT = 10;
export const MIN_COUNT = 1;
export const MAX_COUNT = 30;

export const WORD_LIMITS = Object.freeze({ hook: 8, on_screen_text: 15 });
export const DEFAULT_WORD_LIMIT = 15;

export const wordLimit = (type, limits = WORD_LIMITS) => limits[type] ?? DEFAULT_WORD_LIMIT;

const NAMES = { hook: 'Hook', on_screen_text: 'On-screen text', cta: 'CTA' };

export function typeLabel(type) {
  if (NAMES[type]) return NAMES[type];
  const spaced = type.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function normaliseTypeName(raw) {
  return String(raw)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
