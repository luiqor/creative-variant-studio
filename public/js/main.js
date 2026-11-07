import { renderPreviewBody, renderWorkspace } from './render.js';
import { getTokenStatus, requestBatch, requestMore, saveToken } from './api.js';
import { createSession } from './session.js';
import {
  applyTokenStatus,
  cancelTokenEdit,
  editToken,
  startSavingToken,
  tokenFailed,
  tokenRejected,
  tokenSaved,
} from './token.js';
import { eventForAction, exportEvent, feedbackEvent, reportEvent } from './events.js';
import { buildAeScript, hasKept, jsonExport, wideCsv } from './export.js';
import {
  addType,
  applyBatch,
  canGenerate,
  canSubmitMore,
  closeMore,
  generateRequest,
  dropIndex,
  keepIdea,
  moreRequest,
  moveKept,
  newScript,
  openMore,
  rejectIdea,
  restoreIdea,
  setCount,
  setMoreInstruction,
  setPreview,
  toggleMoreTag,
  toggleType,
  unkeepIdea,
} from './workspace.js';

const root = document.getElementById('app');
const session = createSession(window.localStorage);
let state = session.load();

function render() {
  const scrollTop = window.scrollY;
  root.innerHTML = renderWorkspace(state);
  window.scrollTo(0, scrollTop);
}

function track(event) {
  if (event) reportEvent(event.type, event.data);
}

function update(next) {
  state = next;
  session.save(state);
  render();
}

const TOKEN_CODES = ['token_missing', 'token_rejected'];

function handleRequestError(err) {
  if (TOKEN_CODES.includes(err.code)) {
    update(tokenRejected(state, err.message));
    return;
  }
  update({ ...state, loading: false, error: err.message });
}

function generate() {
  if (!canGenerate(state)) return;
  update({ ...state, loading: true, error: '' });
  requestBatch(generateRequest(state))
    .then((batch) => update({ ...applyBatch(state, batch), loading: false }))
    .catch(handleRequestError);
}

function submitMore() {
  if (!canSubmitMore(state)) return;
  track(feedbackEvent(state));
  update({ ...state, loading: true, error: '' });
  requestMore(moreRequest(state))
    .then((batch) => update({ ...closeMore(applyBatch(state, batch)), loading: false }))
    .catch(handleRequestError);
}

function download(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportAeScript() {
  fetch('/ae/duplicate-from-csv.jsx')
    .then((response) => {
      if (!response.ok) throw new Error('missing template');
      return response.text();
    })
    .then((template) => {
      download('modifications.jsx', buildAeScript(template, wideCsv(state)), 'text/plain');
      track(exportEvent(state, 'jsx'));
    })
    .catch(() => update({ ...state, error: 'Could not build the AE script.' }));
}

function exportFile(filename, build, type, format) {
  if (!hasKept(state)) return;
  download(filename, build(state), type);
  track(exportEvent(state, format));
}

function submitToken() {
  const value = root.querySelector('[data-token-input]')?.value.trim() ?? '';
  if (!value) {
    update(tokenFailed(state, 'Paste your Gemini token.'));
    return;
  }
  update(startSavingToken(state));
  saveToken(value)
    .then(() => update(tokenSaved(state)))
    .catch((err) => update(tokenFailed(state, err.message)));
}

function startNewScript() {
  session.clear();
  update(newScript());
}

const ACTIONS = {
  'change-token': () => update(editToken(state)),
  'cancel-token': () => update(cancelTokenEdit(state)),
  'save-token': submitToken,
  'export-jsx': () => hasKept(state) && exportAeScript(),
  'export-csv': () => exportFile('ideas.csv', wideCsv, 'text/csv', 'csv'),
  'export-json': () => exportFile('ideas.json', jsonExport, 'application/json', 'json'),
  'new-script': startNewScript,
  more: (el) => update(openMore(state, el.dataset.id)),
  'more-tag': (el) => update(toggleMoreTag(state, el.dataset.tag)),
  'more-close': () => update(closeMore(state)),
  'more-submit': submitMore,
  'toggle-type': (el) => update(toggleType(state, el.dataset.type)),
  'add-type': () => update(addType(state, root.querySelector('[data-new-type]').value)),
  'count-up': () => update(setCount(state, state.count + 1)),
  'count-down': () => update(setCount(state, state.count - 1)),
  keep: (el) => {
    track(eventForAction(state, 'keep', el.dataset.id));
    update(keepIdea(state, el.dataset.id));
  },
  unkeep: (el) => update(unkeepIdea(state, el.dataset.id)),
  reject: (el) => {
    track(eventForAction(state, 'reject', el.dataset.id));
    update(rejectIdea(state, el.dataset.id));
  },
  restore: (el) => update(restoreIdea(state, el.dataset.id)),
  generate,
};

root.addEventListener('click', (event) => {
  const el = event.target.closest('[data-action]');
  if (!el || el.disabled || !ACTIONS[el.dataset.action]) return;
  if (el.dataset.self !== undefined && event.target !== el) return;
  ACTIONS[el.dataset.action](el);
  el.closest('details')?.removeAttribute('open');
});

root.addEventListener('input', (event) => {
  const { field, moreInstruction } = event.target.dataset;
  if (moreInstruction !== undefined) {
    state = setMoreInstruction(state, event.target.value);
    return;
  }
  if (!field) return;
  state = { ...state, [field]: event.target.value };
  session.save(state);
  const button = root.querySelector('[data-action="generate"]');
  button.disabled = !canGenerate(state);
});

root.addEventListener('mouseover', (event) => {
  const el = event.target.closest('[data-idea-id]');
  if (!el || el.dataset.ideaId === state.previewId) return;
  state = setPreview(state, el.dataset.ideaId);
  root.querySelector('[data-preview]').innerHTML = renderPreviewBody(state);
});

const drag = { current: null };

const clearDropMarks = () =>
  root.querySelectorAll('.drop-before, .drop-after').forEach((el) => el.classList.remove('drop-before', 'drop-after'));

const isAfter = (event, item) => {
  const rect = item.getBoundingClientRect();
  return event.clientY > rect.top + rect.height / 2;
};

function dropTarget(event) {
  const item = event.target.closest('.kept-item');
  const valid = item && drag.current && item.dataset.type === drag.current.type && item.dataset.ideaId !== drag.current.id;
  return valid ? item : null;
}

root.addEventListener('dragstart', (event) => {
  const item = event.target.closest('.kept-item');
  if (!item) return;
  drag.current = { id: item.dataset.ideaId, type: item.dataset.type };
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', drag.current.id);
});

root.addEventListener('dragover', (event) => {
  const target = dropTarget(event);
  if (!target) return;
  event.preventDefault();
  clearDropMarks();
  target.classList.add(isAfter(event, target) ? 'drop-after' : 'drop-before');
});

root.addEventListener('drop', (event) => {
  const target = dropTarget(event);
  clearDropMarks();
  if (!target) return;
  event.preventDefault();
  const { id, type } = drag.current;
  const index = dropIndex(state.kept[type] ?? [], id, target.dataset.ideaId, isAfter(event, target));
  drag.current = null;
  if (index !== null) update(moveKept(state, type, id, index));
});

root.addEventListener('dragend', () => {
  clearDropMarks();
  drag.current = null;
});

root.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  if (event.target.matches('[data-new-type]')) update(addType(state, event.target.value));
  if (event.target.matches('[data-token-input]')) submitToken();
});

getTokenStatus()
  .then((status) => {
    state = applyTokenStatus(state, status);
  })
  .catch(() => {
    state = { ...state, error: 'Could not reach the server.' };
  })
  .finally(render);
