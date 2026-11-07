import { keepCard, rejectCard, restoreCard, toggleLikedTag, setComment } from './cards.js';
import { renderCards } from './render.js';
import { requestBatch } from './api.js';
import { requestMore, createMoreCards } from './more-like-this.js';
import { createSession } from './session.js';
import { setupExport } from './export-ui.js';
import { trackAction, trackExport } from './action-events.js';

const scriptInput = document.getElementById('script');
const generateButton = document.getElementById('generate');
const errorBox = document.getElementById('error');
const cardsRoot = document.getElementById('cards');

const session = createSession(window.localStorage);
const newScriptButton = document.getElementById('new-script');

const state = { cards: session.load(), loading: false };

newScriptButton.addEventListener('click', () => {
  state.cards = [];
  scriptInput.value = '';
  showError('');
  session.clear();
  render();
});

function render() {
  session.save(state.cards);
  newScriptButton.disabled = state.loading;
  cardsRoot.innerHTML = renderCards(state.cards, { loading: state.loading });
  generateButton.disabled = state.loading;
  generateButton.textContent = state.loading ? 'Generating...' : 'Generate';
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = !message;
}

const ACTIONS = {
  keep: keepCard,
  reject: rejectCard,
  restore: restoreCard,
  like: toggleLikedTag,
};

function runRequest(request) {
  showError('');
  state.loading = true;
  render();
  request
    .then((batch) => {
      state.cards = createMoreCards(state.cards, batch);
    })
    .catch((err) => showError(err.message))
    .finally(() => {
      state.loading = false;
      render();
    });
}

cardsRoot.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, cardId, tag } = button.dataset;
  if (action === 'copy') {
    const card = state.cards.find((c) => c.id === cardId);
    navigator.clipboard.writeText(card.text).catch((err) => showError(`Copy failed: ${err.message}`));
    return;
  }
  trackAction(state.cards, cardId, action, tag);
  if (action === 'more') {
    if (!state.loading) runRequest(requestMore(state.cards, cardId));
    return;
  }
  state.cards = ACTIONS[action](state.cards, cardId, tag);
  render();
});

cardsRoot.addEventListener('change', (event) => {
  const field = event.target.closest('textarea[data-action="comment"]');
  if (!field) return;
  trackAction(state.cards, field.dataset.cardId, 'comment', null, field.value);
  state.cards = setComment(state.cards, field.dataset.cardId, field.value);
  session.save(state.cards);
});

generateButton.addEventListener('click', () => {
  if (!state.loading) runRequest(requestBatch(scriptInput.value));
});

setupExport({
  getCards: () => state.cards,
  onExported: trackExport,
  onNothingKept: () => showError('Keep at least one card before exporting.'),
});

render();
