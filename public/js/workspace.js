import {
  DEFAULT_COUNT,
  MAX_COUNT,
  MAX_TYPES,
  MIN_COUNT,
  TYPE_NAME,
  normaliseTypeName,
  typeLabel,
} from './idea-types.js';

export { typeLabel };

export function initialState() {
  return {
    script: '',
    note: '',
    types: [
      { name: 'hook', on: true },
      { name: 'on_screen_text', on: true },
    ],
    count: DEFAULT_COUNT,
    ideas: [],
    loading: false,
    error: '',
  };
}

export function toggleType(state, name) {
  return { ...state, types: state.types.map((t) => (t.name === name ? { ...t, on: !t.on } : t)) };
}

export function addType(state, raw) {
  const name = normaliseTypeName(raw);
  const invalid = !TYPE_NAME.test(name) || state.types.some((t) => t.name === name);
  if (invalid || state.types.length >= MAX_TYPES) return state;
  return { ...state, types: [...state.types, { name, on: true }] };
}

export function setCount(state, value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return state;
  return { ...state, count: Math.min(MAX_COUNT, Math.max(MIN_COUNT, parsed)) };
}

const chosenTypes = (state) => state.types.filter((t) => t.on).map((t) => t.name);

export function canGenerate(state) {
  return !state.loading && state.script.trim() !== '' && chosenTypes(state).length > 0;
}

export function generateRequest(state) {
  return {
    script: state.script.trim(),
    types: chosenTypes(state),
    count: state.count,
    note: state.note.trim(),
  };
}

export function applyBatch(state, batch) {
  const added = Object.entries(batch).flatMap(([type, texts]) =>
    texts.map((text) => ({ id: crypto.randomUUID(), type, text })),
  );
  return { ...state, ideas: [...state.ideas, ...added] };
}

export function groupIdeas(state) {
  return state.types
    .map(({ name }) => ({
      type: name,
      label: typeLabel(name),
      items: state.ideas.filter((idea) => idea.type === name),
    }))
    .filter((group) => group.items.length > 0);
}
