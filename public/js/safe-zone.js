export const SAFE_ZONE = Object.freeze({ charsPerLine: 16, maxLines: 6 });

export function fitsSafeZone(text, { charsPerLine, maxLines } = SAFE_ZONE) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.some((word) => word.length > charsPerLine)) return false;
  const lines = words.reduce((acc, word) => {
    const last = acc[acc.length - 1];
    if (last !== undefined && last.length + 1 + word.length <= charsPerLine) {
      acc[acc.length - 1] = `${last} ${word}`;
      return acc;
    }
    acc.push(word);
    return acc;
  }, []);
  return lines.length <= maxLines;
}
