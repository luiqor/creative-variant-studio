import { DEFAULT_COUNT, MAX_COUNT, MAX_TYPES, MIN_COUNT, TYPE_NAME } from './idea-types.js';
import { initialState } from './workspace.js';

const KEY = 'idea-generator-session';
const VERSION = 1;
const STATUSES = ['new', 'kept', 'rejected'];

const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value) => typeof value === 'string';

function cleanTypes(saved) {
  const names = new Set();
  const types = [];
  for (const entry of Array.isArray(saved) ? saved : []) {
    const valid = isObject(entry) && isText(entry.name) && TYPE_NAME.test(entry.name) && !names.has(entry.name);
    if (valid && types.length < MAX_TYPES) {
      names.add(entry.name);
      types.push({ name: entry.name, on: entry.on === true });
    }
  }
  return types.length > 0 ? types : initialState().types;
}

function cleanIdeas(saved) {
  return saved.filter(
    (idea) =>
      isObject(idea) &&
      isText(idea.id) &&
      isText(idea.text) &&
      isText(idea.type) &&
      TYPE_NAME.test(idea.type) &&
      STATUSES.includes(idea.status),
  );
}

function cleanKept(saved, ideas, types) {
  const savedLists = isObject(saved) ? saved : {};
  return Object.fromEntries(
    types.map(({ name }) => {
      const keptIdeas = ideas.filter((idea) => idea.type === name && idea.status === 'kept');
      const keptIds = new Set(keptIdeas.map((idea) => idea.id));
      const listed = (Array.isArray(savedLists[name]) ? savedLists[name] : []).filter((id) => keptIds.has(id));
      const ordered = [...new Set(listed)];
      const missing = keptIdeas.map((idea) => idea.id).filter((id) => !ordered.includes(id));
      return [name, [...ordered, ...missing]];
    }),
  );
}

function restore(saved) {
  const base = initialState();
  if (!isObject(saved) || saved.version !== VERSION || !Array.isArray(saved.ideas)) return base;
  const ideas = cleanIdeas(saved.ideas);
  const known = cleanTypes(saved.types);
  const orphanTypes = [...new Set(ideas.map((idea) => idea.type))]
    .filter((type) => !known.some((t) => t.name === type))
    .map((name) => ({ name, on: false }));
  const types = [...known, ...orphanTypes];
  const count = Number.isFinite(saved.count) ? Math.round(saved.count) : DEFAULT_COUNT;
  return {
    ...base,
    script: isText(saved.script) ? saved.script : '',
    note: isText(saved.note) ? saved.note : '',
    types,
    count: Math.min(MAX_COUNT, Math.max(MIN_COUNT, count)),
    ideas,
    kept: cleanKept(saved.kept, ideas, types),
  };
}

export function createSession(storage) {
  return {
    load() {
      try {
        const raw = storage.getItem(KEY);
        return raw ? restore(JSON.parse(raw)) : initialState();
      } catch {
        return initialState();
      }
    },
    save(state) {
      const { script, note, types, count, ideas, kept } = state;
      try {
        storage.setItem(KEY, JSON.stringify({ version: VERSION, script, note, types, count, ideas, kept }));
      } catch {
        // Saving is best effort: a full or blocked storage must not break the page.
      }
    },
    clear() {
      try {
        storage.removeItem(KEY);
      } catch {
        // Nothing to forget if the storage is unavailable.
      }
    },
  };
}
