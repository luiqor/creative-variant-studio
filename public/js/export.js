function keptTexts(cards, type) {
  return cards.filter((c) => c.state === 'kept' && c.type === type).map((c) => c.text);
}

function csvCell(value) {
  const text = value ?? '';
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function exportCsv(cards) {
  const hooks = keptTexts(cards, 'hook');
  const texts = keptTexts(cards, 'on_screen_text');
  const rows = Array.from({ length: Math.max(hooks.length, texts.length) }, (_, i) => [hooks[i], texts[i]]);
  return [['hook', 'on_screen_text'], ...rows].map((row) => `${row.map(csvCell).join(',')}\r\n`).join('');
}

export function exportJson(cards) {
  return JSON.stringify(
    { hooks: keptTexts(cards, 'hook'), on_screen_texts: keptTexts(cards, 'on_screen_text') },
    null,
    2,
  );
}
