import { keptLists } from './workspace.js';

const DATA_BLOCK = /\/\/ DATA-BEGIN[\s\S]*?\/\/ DATA-END/;

function keptColumns(state) {
  return keptLists(state)
    .filter(({ items }) => items.length > 0)
    .map(({ type, items }) => ({ type, texts: items.map((idea) => idea.text) }));
}

export const hasKept = (state) => keptColumns(state).length > 0;

const csvCell = (text) => (/[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text);

export function wideCsv(state) {
  const columns = keptColumns(state);
  const rows = Math.max(0, ...columns.map((column) => column.texts.length));
  const lines = Array.from({ length: rows }, (_, i) =>
    columns.map((column) => csvCell(column.texts[i] ?? '')).join(','),
  );
  return [columns.map((column) => column.type).join(','), ...lines].join('\n');
}

export function jsonExport(state) {
  const data = Object.fromEntries(keptColumns(state).map((column) => [column.type, column.texts]));
  return JSON.stringify(data, null, 2);
}

// ExtendScript reads the file in the system encoding, so only ASCII goes into the literal.
const toAscii = (json) =>
  json.replace(/[\u007f-￿]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`);

export function buildAeScript(template, csv) {
  if (!DATA_BLOCK.test(template)) throw new Error('The AE script template has no data markers.');
  const block = `// DATA-BEGIN\nvar CSV_DATA = ${toAscii(JSON.stringify(csv))};\n// DATA-END`;
  return template.replace(DATA_BLOCK, () => block);
}
