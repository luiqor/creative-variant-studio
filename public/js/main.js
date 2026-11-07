import { createCards, keepCard, rejectCard, restoreCard, toggleLikedTag, setComment } from './cards.js';
import { renderCards } from './render.js';
import { requestBatch } from './api.js';
import { setupExport } from './export-ui.js';

const scriptInput = document.getElementById('script');
const generateButton = document.getElementById('generate');
const errorBox = document.getElementById('error');
const cardsRoot = document.getElementById('cards');

const state = { cards: [], loading: false };

function render() {
  cardsRoot.innerHTML = renderCards(state.cards);
  generateButton.disabled = state.loading;
  generateButton.textContent = state.loading ? 'Generating...' : 'Generate';
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = !message;
}

const ACTIONS = {
  keep: (cards, id) => keepCard(cards, id),
  reject: (cards, id, tag) => rejectCard(cards, id, tag ?? null),
  restore: (cards, id) => restoreCard(cards, id),
  like: (cards, id, tag) => toggleLikedTag(cards, id, tag),
};

cardsRoot.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, cardId, tag } = button.dataset;
  if (action === 'copy') {
    const card = state.cards.find((c) => c.id === cardId);
    navigator.clipboard.writeText(card.text).catch((err) => showError(`Copy failed: ${err.message}`));
    return;
  }
  state.cards = ACTIONS[action](state.cards, cardId, tag);
  render();
});

cardsRoot.addEventListener('change', (event) => {
  const field = event.target.closest('textarea[data-action="comment"]');
  if (!field) return;
  state.cards = setComment(state.cards, field.dataset.cardId, field.value);
});

generateButton.addEventListener('click', () => {
  showError('');
  state.loading = true;
  render();
  requestBatch(scriptInput.value)
    .then((batch) => {
      state.cards = [...state.cards, ...createCards(batch)];
    })
    .catch((err) => showError(err.message))
    .finally(() => {
      state.loading = false;
      render();
    });
});

setupExport({ getCards: () => state.cards });

render();
