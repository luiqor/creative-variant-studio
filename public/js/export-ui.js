import { exportJson, exportCsv } from './export.js';

const FORMATS = {
  json: { build: exportJson, mime: 'application/json', filename: 'ideas.json' },
  csv: { build: exportCsv, mime: 'text/csv;charset=utf-8', filename: 'ideas.csv' },
};

function download({ build, mime, filename }, cards) {
  const url = URL.createObjectURL(new Blob([build(cards)], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// onExported(format, cards) is the seam for the "exported" event (ticket 08).
export function setupExport({ getCards, onExported = () => {} }) {
  Object.entries(FORMATS).forEach(([format, spec]) => {
    document.getElementById(`export-${format}`).addEventListener('click', () => {
      const cards = getCards();
      download(spec, cards);
      onExported(format, cards);
    });
  });
}
