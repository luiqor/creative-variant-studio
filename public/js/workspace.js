import {
  DEFAULT_COUNT,
  MAX_COUNT,
  MAX_TYPES,
  MIN_COUNT,
  TYPE_NAME,
  normaliseTypeName,
  typeLabel,
  wordLimit,
} from './idea-types.js';
import { fitsSafeZone } from './safe-zone.js';
import { LIKED_TAGS } from './tags.js';

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
    kept: {},
    previewId: null,
    more: null,
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
    texts.map((text) => ({ id: crypto.randomUUID(), type, text, status: 'new' })),
  );
  return { ...state, ideas: [...state.ideas, ...added] };
}

export function groupIdeas(state) {
  return state.types
    .map(({ name }) => ({
      type: name,
      label: typeLabel(name),
      items: state.ideas.filter((idea) => idea.type === name && idea.status === 'new'),
    }))
    .filter((group) => group.items.length > 0);
}

export const findIdeaById = (state, id) => findIdea(state, id);

const findIdea = (state, id) => state.ideas.find((idea) => idea.id === id) ?? null;

const setStatus = (state, id, status) => ({
  ...state,
  ideas: state.ideas.map((idea) => (idea.id === id ? { ...idea, status } : idea)),
});

const withoutKept = (kept, type, id) => ({ ...kept, [type]: (kept[type] ?? []).filter((x) => x !== id) });

export function keepIdea(state, id) {
  const idea = findIdea(state, id);
  if (!idea || idea.status === 'kept') return state;
  const list = [...(state.kept[idea.type] ?? []), id];
  return { ...setStatus(state, id, 'kept'), kept: { ...state.kept, [idea.type]: list } };
}

export function unkeepIdea(state, id) {
  const idea = findIdea(state, id);
  if (!idea || idea.status !== 'kept') return state;
  return { ...setStatus(state, id, 'new'), kept: withoutKept(state.kept, idea.type, id) };
}

export function rejectIdea(state, id) {
  const idea = findIdea(state, id);
  if (!idea || idea.status === 'rejected') return state;
  return { ...setStatus(state, id, 'rejected'), kept: withoutKept(state.kept, idea.type, id) };
}

export function restoreIdea(state, id) {
  const idea = findIdea(state, id);
  if (!idea || idea.status !== 'rejected') return state;
  return setStatus(state, id, 'new');
}

export function keptLists(state) {
  return state.types
    .filter(({ name }) => state.ideas.some((idea) => idea.type === name))
    .map(({ name }) => ({
      type: name,
      label: typeLabel(name),
      items: (state.kept[name] ?? []).map((id) => findIdea(state, id)).filter((idea) => idea !== null),
    }));
}

export function rejectedIdeas(state) {
  return state.ideas.filter((idea) => idea.status === 'rejected');
}

export function moveKept(state, type, id, toIndex) {
  const list = state.kept[type] ?? [];
  const from = list.indexOf(id);
  if (from < 0) return state;
  const target = Math.min(list.length - 1, Math.max(0, toIndex));
  if (target === from) return state;
  const rest = list.filter((x) => x !== id);
  return { ...state, kept: { ...state.kept, [type]: [...rest.slice(0, target), id, ...rest.slice(target)] } };
}

export function dropIndex(list, id, targetId, after) {
  const from = list.indexOf(id);
  const at = list.indexOf(targetId);
  if (from < 0 || at < 0 || id === targetId) return null;
  const insert = after ? at + 1 : at;
  return from < insert ? insert - 1 : insert;
}

export function setPreview(state, id) {
  if (state.previewId === id) return state;
  return { ...state, previewId: id };
}

export function previewIdea(state) {
  return findIdea(state, state.previewId);
}

export function previewWarning(idea) {
  const count = idea.text.split(/\s+/).filter(Boolean).length;
  const limit = wordLimit(idea.type);
  if (count > limit) return `${count} words, over the ${limit}-word limit`;
  if (!fitsSafeZone(idea.text)) return 'Text may not fit the safe zone';
  return null;
}

export function openMore(state, id) {
  if (!findIdea(state, id)) return state;
  return { ...state, more: { id, tags: [], instruction: '' } };
}

export function closeMore(state) {
  return { ...state, more: null };
}

export function toggleMoreTag(state, tag) {
  if (!state.more || !LIKED_TAGS.some((t) => t.id === tag)) return state;
  const tags = state.more.tags.includes(tag) ? state.more.tags.filter((t) => t !== tag) : [...state.more.tags, tag];
  return { ...state, more: { ...state.more, tags } };
}

export function setMoreInstruction(state, instruction) {
  if (!state.more) return state;
  return { ...state, more: { ...state.more, instruction } };
}

export const canSubmitMore = (state) => state.more !== null && !state.loading;

export function moreRequest(state) {
  const idea = findIdea(state, state.more.id);
  return {
    type: idea.type,
    source: idea.text,
    texts: state.ideas.map((i) => i.text),
    likedTags: state.more.tags,
    instruction: state.more.instruction.trim(),
    count: state.count,
  };
}

export function newScript() {
  return initialState();
}
