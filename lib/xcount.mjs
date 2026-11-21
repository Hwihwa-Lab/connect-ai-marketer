// X (Twitter) weighted length: most Latin text counts 1, CJK / Hangul / emoji count 2, every URL counts 23. Limit 280.
// Ranges follow the public twitter-text v3 config (weight 100 ranges), re-implemented here.
const LIGHT = [[0x0000, 0x10ff], [0x2000, 0x200d], [0x2010, 0x201f], [0x2032, 0x2037]];
const URL_RE = /https?:\/\/[^\s]+/g;
export function xLength(text) {
  let n = 0;
  const urls = text.match(URL_RE) || [];
  const rest = text.replace(URL_RE, '');
  for (const ch of rest) {
    const cp = ch.codePointAt(0);
    n += LIGHT.some(([a, b]) => cp >= a && cp <= b) ? 1 : 2;
  }
  return n + urls.length * 23;
}
export const X_LIMIT = 280;
export const fitsX = (t) => xLength(t) <= X_LIMIT;
