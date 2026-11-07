import { canGenerate, groupIdeas, typeLabel } from './workspace.js';

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
  return `<li class="idea" data-idea-id="${escapeHtml(idea.id)}"><span class="idea-text">${escapeHtml(idea.text)}</span></li>`;
}

function renderGroups(state) {
  const groups = groupIdeas(state);
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

function renderError(state) {
  return state.error ? `<p class="error" role="alert">${escapeHtml(state.error)}</p>` : '';
}

export function renderWorkspace(state) {
  return `<div class="workspace">${renderInputs(state)}<main class="review">${renderError(state)}${renderGroups(state)}</main></div>`;
}
