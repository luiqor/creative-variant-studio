import { renderWorkspace } from './render.js';
import { requestBatch } from './api.js';
import {
  addType,
  applyBatch,
  canGenerate,
  generateRequest,
  initialState,
  keepIdea,
  rejectIdea,
  restoreIdea,
  setCount,
  toggleType,
  unkeepIdea,
} from './workspace.js';

const root = document.getElementById('app');
let state = initialState();

function render() {
  const scrollTop = window.scrollY;
  root.innerHTML = renderWorkspace(state);
  window.scrollTo(0, scrollTop);
}

function update(next) {
  state = next;
  render();
}

function generate() {
  if (!canGenerate(state)) return;
  update({ ...state, loading: true, error: '' });
  requestBatch(generateRequest(state))
    .then((batch) => update({ ...applyBatch(state, batch), loading: false }))
    .catch((err) => update({ ...state, loading: false, error: err.message }));
}

const ACTIONS = {
  'toggle-type': (el) => update(toggleType(state, el.dataset.type)),
  'add-type': () => update(addType(state, root.querySelector('[data-new-type]').value)),
  'count-up': () => update(setCount(state, state.count + 1)),
  'count-down': () => update(setCount(state, state.count - 1)),
  keep: (el) => update(keepIdea(state, el.dataset.id)),
  unkeep: (el) => update(unkeepIdea(state, el.dataset.id)),
  reject: (el) => update(rejectIdea(state, el.dataset.id)),
  restore: (el) => update(restoreIdea(state, el.dataset.id)),
  generate,
};

root.addEventListener('click', (event) => {
  const el = event.target.closest('[data-action]');
  if (el && !el.disabled && ACTIONS[el.dataset.action]) ACTIONS[el.dataset.action](el);
});

root.addEventListener('input', (event) => {
  const { field } = event.target.dataset;
  if (!field) return;
  state = { ...state, [field]: event.target.value };
  const button = root.querySelector('[data-action="generate"]');
  button.disabled = !canGenerate(state);
});

root.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && event.target.matches('[data-new-type]')) {
    update(addType(state, event.target.value));
  }
});

render();
