import { createCards } from './cards.js';
import { renderCards } from './render.js';
import { requestBatch } from './api.js';

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

render();
