import {
  canGenerate,
  groupIdeas,
  keptLists,
  previewIdea,
  previewWarning,
  rejectedIdeas,
  typeLabel,
} from './workspace.js';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);

function renderTypeChips(state) {
  const chips = state.types
    .map(({ name, on }) => {
      const cls = on ? 'chip on' : 'chip';
      return `<button type="button" class="${cls}" data-action="toggle-type" data-type="${escapeHtml(name)}" aria-pressed="${on}">${escapeHtml(typeLabel(name))}</button>`;
    })
    .join('');
  return `<div class="chips">${chips}</div>
    <div class="add-type">
      <input data-new-type placeholder="Add a type, e.g. CTA" maxlength="24" aria-label="New idea type">
      <button type="button" class="btn ghost small" data-action="add-type">Add</button>
    </div>`;
}

function renderGenerate(state) {
  const disabled = canGenerate(state) ? '' : ' disabled';
  const text = state.loading ? 'Generating…' : 'Generate';
  return `<button type="button" class="btn primary wide" data-action="generate"${disabled}>${text}</button>`;
}

function renderInputs(state) {
  return `<aside class="panel inputs">
    <h1>Idea Generator</h1>
    <label class="field-label" for="script">Winning script</label>
    <textarea id="script" data-field="script" rows="11" placeholder="Paste the winning script here">${escapeHtml(state.script)}</textarea>
    <span class="field-label">Idea types</span>
    ${renderTypeChips(state)}
    <span class="field-label">Ideas per type</span>
    <div class="stepper">
      <button type="button" data-action="count-down" aria-label="Fewer ideas">−</button>
      <output data-count>${state.count}</output>
      <button type="button" data-action="count-up" aria-label="More ideas">+</button>
    </div>
    <label class="field-label" for="note">Note for the model (optional)</label>
    <input id="note" data-field="note" value="${escapeHtml(state.note)}" placeholder="e.g. keep it playful">
    <div class="generate">${renderGenerate(state)}</div>
  </aside>`;
}

function renderIdea(idea) {
  const id = escapeHtml(idea.id);
  return `<li class="idea" data-idea-id="${id}">
    <span class="idea-text">${escapeHtml(idea.text)}</span>
    <span class="idea-actions">
      <button type="button" class="icon good" data-action="keep" data-id="${id}" title="Keep" aria-label="Keep">✓</button>
      <button type="button" class="icon bad" data-action="reject" data-id="${id}" title="Reject" aria-label="Reject">✕</button>
    </span>
  </li>`;
}

function renderGroups(state) {
  const groups = groupIdeas(state);
  if (groups.length === 0 && state.ideas.length > 0) {
    return '<div class="empty"><h2>All ideas reviewed</h2><p>Keep the ones you want, or generate another batch.</p></div>';
  }
  if (groups.length === 0) {
    return '<div class="empty"><h2>No ideas yet</h2><p>Paste a winning script, choose the idea types and press Generate.</p></div>';
  }
  return groups
    .map(
      ({ type, label, items }) =>
        `<section class="group" data-type="${escapeHtml(type)}"><h2>${escapeHtml(label)}</h2><ul class="ideas">${items.map(renderIdea).join('')}</ul></section>`,
    )
    .join('');
}

function renderRejected(state) {
  const rejected = rejectedIdeas(state);
  if (rejected.length === 0) return '';
  const rows = rejected
    .map(
      (idea) =>
        `<li class="rejected-row"><span>${escapeHtml(idea.text)}</span><button type="button" class="link" data-action="restore" data-id="${escapeHtml(idea.id)}">Restore</button></li>`,
    )
    .join('');
  return `<details class="rejected"><summary>Rejected (${rejected.length})</summary><ul>${rows}</ul></details>`;
}

function renderKeptItem(idea) {
  const id = escapeHtml(idea.id);
  const type = escapeHtml(idea.type);
  return `<li class="kept-item" draggable="true" data-idea-id="${id}" data-type="${type}"><span class="grip" aria-hidden="true">⋮⋮</span><span class="kept-text">${escapeHtml(idea.text)}</span><button type="button" class="icon" data-action="unkeep" data-id="${id}" title="Remove from kept" aria-label="Remove from kept">✕</button></li>`;
}

export function renderPreviewBody(state) {
  const idea = previewIdea(state);
  if (!idea) return '<div class="frame empty"><p>Hover an idea to preview it</p></div>';
  const warning = previewWarning(idea);
  const note = warning ? `<p class="warning" role="alert">${escapeHtml(warning)}</p>` : '';
  return `<div class="frame" data-type="${escapeHtml(idea.type)}"><div class="safe-zone"><p class="frame-text">${escapeHtml(idea.text)}</p></div></div>${note}`;
}

function renderKept(state) {
  const preview = `<section class="preview" data-preview>${renderPreviewBody(state)}</section>`;
  const lists = keptLists(state);
  if (lists.length === 0) return `<aside class="panel kept">${preview}<p class="hint">Kept ideas appear here.</p></aside>`;
  const groups = lists
    .map(({ type, label, items }) => {
      const body = items.length > 0 ? items.map(renderKeptItem).join('') : '<li class="empty-note">Nothing kept yet</li>';
      return `<section class="kept-group" data-type="${escapeHtml(type)}"><h3>${escapeHtml(label)} <span class="count">${items.length}</span></h3><ol class="kept-list">${body}</ol></section>`;
    })
    .join('');
  return `<aside class="panel kept">${preview}<h2>Kept</h2>${groups}</aside>`;
}

function renderError(state) {
  return state.error ? `<p class="error" role="alert">${escapeHtml(state.error)}</p>` : '';
}

export function renderWorkspace(state) {
  return `<div class="workspace">${renderInputs(state)}<main class="review">${renderError(state)}${renderGroups(state)}${renderRejected(state)}</main>${renderKept(state)}</div>`;
}
