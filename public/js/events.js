import { findIdeaById, keptLists } from './workspace.js';

export function eventForAction(state, action, id) {
  const idea = findIdeaById(state, id);
  if (!idea) return null;
  const data = { ideaId: idea.id, ideaType: idea.type };
  if (action === 'keep' && idea.status !== 'kept') return { type: 'kept', data };
  if (action === 'reject' && idea.status !== 'rejected') return { type: 'rejected', data };
  return null;
}

export function feedbackEvent(state) {
  if (!state.more) return null;
  const idea = findIdeaById(state, state.more.id);
  const hasInstruction = state.more.instruction.trim() !== '';
  if (!idea || (state.more.tags.length === 0 && !hasInstruction)) return null;
  return {
    type: 'feedback',
    data: {
      ideaId: idea.id,
      ideaType: idea.type,
      kind: 'more_like_this',
      tags: state.more.tags,
      hasInstruction,
    },
  };
}

export function exportEvent(state, format) {
  const lists = keptLists(state).filter(({ items }) => items.length > 0);
  return {
    type: 'exported',
    data: {
      format,
      count: lists.reduce((sum, { items }) => sum + items.length, 0),
      ideaTypes: lists.map(({ type }) => type),
    },
  };
}

export function reportEvent(type, data, fetchFn = fetch) {
  return fetchFn('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, ...data }),
  })
    .then(() => undefined)
    .catch(() => undefined);
}
