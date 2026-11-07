import { fitsSafeZone } from './safe-zone.js';

const GROUPS = [
  { type: 'hook', title: 'Hooks' },
  { type: 'on_screen_text', title: 'On-screen text' },
];

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);

function renderCard(card) {
  const warning = fitsSafeZone(card.text)
    ? ''
    : '<p class="warning" role="alert">Text may not fit the safe zone</p>';
  return `<article class="card" data-card-id="${escapeHtml(card.id)}" data-state="${escapeHtml(card.state)}">
  <div class="frame"><div class="safe-zone"><p class="card-text">${escapeHtml(card.text)}</p></div></div>
  ${warning}
</article>`;
}

export function renderCards(cards) {
  return GROUPS.map(({ type, title }) => ({ title, items: cards.filter((card) => card.type === type) }))
    .filter(({ items }) => items.length > 0)
    .map(
      ({ title, items }) =>
        `<section class="group"><h2>${title}</h2><div class="cards">${items.map(renderCard).join('')}</div></section>`,
    )
    .join('');
}
