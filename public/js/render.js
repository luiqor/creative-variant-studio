import { fitsSafeZone } from './safe-zone.js';
import { LIKED_TAGS, REJECT_TAGS } from './tags.js';

const GROUPS = [
  { type: 'hook', title: 'Hooks' },
  { type: 'on_screen_text', title: 'On-screen text' },
];

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);

function renderActions(card, loading) {
  const id = escapeHtml(card.id);
  const rejectTags = REJECT_TAGS.map(
    (tag) =>
      `<button type="button" data-action="reject" data-card-id="${id}" data-tag="${tag.id}">${tag.label}</button>`,
  ).join('');
  return `<div class="actions">
    <button type="button" data-action="keep" data-card-id="${id}">Keep</button>
    <button type="button" data-action="reject" data-card-id="${id}">Reject</button>
    <button type="button" data-action="copy" data-card-id="${id}">Copy</button>
    <button type="button" data-action="more" data-card-id="${id}"${loading ? ' disabled' : ''}>More like this</button>
  </div>
  <div class="reject-tags">${rejectTags}</div>`;
}

function renderFeedback(card) {
  const id = escapeHtml(card.id);
  const tags = LIKED_TAGS.map(
    (tag) =>
      `<button type="button" data-action="like" data-card-id="${id}" data-tag="${tag.id}" aria-pressed="${card.likedTags.includes(tag.id)}">${tag.label}</button>`,
  ).join('');
  return `<div class="liked-tags">${tags}</div>
  <textarea data-action="comment" data-card-id="${id}" rows="2" placeholder="Optional comment">${escapeHtml(card.comment)}</textarea>`;
}

function renderCard(card, loading) {
  const warning = fitsSafeZone(card.text)
    ? ''
    : '<p class="warning" role="alert">Text may not fit the safe zone</p>';
  return `<article class="card" data-card-id="${escapeHtml(card.id)}" data-state="${escapeHtml(card.state)}">
  <div class="frame"><div class="safe-zone"><p class="card-text">${escapeHtml(card.text)}</p></div></div>
  ${warning}
  ${renderActions(card, loading)}
  ${renderFeedback(card)}
</article>`;
}

function renderGroups(cards, loading) {
  return GROUPS.map(({ type, title }) => ({ title, items: cards.filter((card) => card.type === type) }))
    .filter(({ items }) => items.length > 0)
    .map(
      ({ title, items }) =>
        `<section class="group"><h2>${title}</h2><div class="cards">${items.map((card) => renderCard(card, loading)).join('')}</div></section>`,
    )
    .join('');
}

function renderKept(cards) {
  if (cards.length === 0) return '';
  const items = cards.map((card) => `<li data-card-id="${escapeHtml(card.id)}">${escapeHtml(card.text)}</li>`).join('');
  return `<section class="kept"><h2>Kept (${cards.length})</h2><ul>${items}</ul></section>`;
}

function renderRejected(cards) {
  if (cards.length === 0) return '';
  const rejectLabels = new Map(REJECT_TAGS.map((tag) => [tag.id, tag.label]));
  const items = cards
    .map((card) => {
      const label = rejectLabels.get(card.rejectTag);
      const tag = label ? ` <span class="reject-tag">${label}</span>` : '';
      return `<li data-card-id="${escapeHtml(card.id)}">${escapeHtml(card.text)}${tag} <button type="button" data-action="restore" data-card-id="${escapeHtml(card.id)}">Restore</button></li>`;
    })
    .join('');
  return `<details class="rejected"><summary>Rejected (${cards.length})</summary><ul>${items}</ul></details>`;
}

export function renderCards(cards, { loading = false } = {}) {
  const active = cards.filter((card) => card.state !== 'rejected');
  const kept = cards.filter((card) => card.state === 'kept');
  const rejected = cards.filter((card) => card.state === 'rejected');
  return renderGroups(active, loading) + renderKept(kept) + renderRejected(rejected);
}
