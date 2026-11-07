const STORAGE_KEY = 'idea-generator-session';

const isCard = (value) =>
  value !== null &&
  typeof value === 'object' &&
  typeof value.id === 'string' &&
  typeof value.type === 'string' &&
  typeof value.text === 'string' &&
  typeof value.state === 'string' &&
  Array.isArray(value.likedTags) &&
  typeof value.comment === 'string';

function parseCards(raw) {
  try {
    const parsed = JSON.parse(raw ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isCard) : [];
  } catch {
    return [];
  }
}

function ignoreFailure(action) {
  try {
    return action();
  } catch {
    return null;
  }
}

export function createSession(storage) {
  return {
    save: (cards) => ignoreFailure(() => storage.setItem(STORAGE_KEY, JSON.stringify(cards))),
    clear: () => ignoreFailure(() => storage.removeItem(STORAGE_KEY)),
    load: () => parseCards(ignoreFailure(() => storage.getItem(STORAGE_KEY))),
  };
}
