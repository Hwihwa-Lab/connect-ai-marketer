// 벤치마크 담당. Read only: YouTube search, recent videos, ranked by views, title patterns counted.
import fs from 'node:fs';
import path from 'node:path';
import {wrap, run} from '../../lib/ego.mjs';
import {writeJson, today} from '../../lib/paths.mjs';

export const id = 'benchmarker';
const SEARCH = `
await page.goto('https://www.youtube.com/results?search_query=' + encodeURIComponent(P.kw), {timeout: 40000}); await W(4000);
for (let s = 0; s < P.screens; s++) { await page.mouse.move(700, 500); await page.mouse.wheel(0, 3000); await W(1400); }
done(await page.evaluate(() => [...document.querySelectorAll('ytd-video-renderer')].map(v => {
  const a = v.querySelector('a#video-title'); const meta = [...v.querySelectorAll('#metadata-line span')].map(s => s.innerText.trim());
  return {title: a ? a.innerText.trim() : '', url: a ? a.href.split('&')[0] : '', channel: ((v.querySelector('ytd-channel-name') || {}).innerText || '').split('\\n').map(x => x.trim()).filter(Boolean)[0] || '',
    viewsText: meta[0] || '', ageText: meta[1] || '', thumb: ((v.querySelector('img') || {}).src || '')};
}).filter(x => x.url.includes('watch'))));
`;
export function views(t) {
  t = (t || '').replace(/,/g, '').toLowerCase().trim();
  let m = t.match(/([\d.]+)\s*([kmb])?\s*(views?)?$/) || t.match(/([\d.]+)\s*([kmb])\b/); if (m && !/[천만억]/.test(t)) return +m[1] * ({k: 1e3, m: 1e6, b: 1e9}[m[2]] || 1);
  m = t.match(/([\d.]+)\s*(천|만|억)?\s*회?/); if (m) return +m[1] * ({'천': 1e3, '만': 1e4, '억': 1e8}[m[2]] || 1);
  return 0;
}
export function ageDays(t) {
  t = (t || '').toLowerCase();
  const m = t.match(/(\d+)\s*(seconds?|minutes?|hours?|days?|weeks?|months?|years?|mo|min|s|m|h|d|w|y|초|분|시간|일|주|개월|년)\b/) || t.match(/(\d+)\s*(초|분|시간|일|주|개월|년)/); if (!m) return 9999;
  const k = m[2].replace(/s$/, '');
  const u = {second: 0, minute: 0, min: 0, hour: 0, h: 0, m: 0, day: 1, d: 1, week: 7, w: 7, month: 30, mo: 30, year: 365, y: 365, '': 0, '초': 0, '분': 0, '시간': 0, '일': 1, '주': 7, '개월': 30, '년': 365}[k];
  return +m[1] * (u ?? 9999);
}
export function patterns(titles) {
  const tests = {'has a number': /\d/, 'question': /\?|까요|나요|인가/, 'brackets or quotes': /[\[\]()「」"“”']/, 'how-to': /how to|방법|하는 법|만들기/i, 'vs / comparison': /\bvs\b|비교/i, 'free / 0': /free|무료|0원/i, 'short (under 30 chars)': /^.{1,29}$/u};
  return Object.entries(tests).map(([k, re]) => ({pattern: k, count: titles.filter((t) => re.test(t)).length})).sort((a, b) => b.count - a.count);
}
export async function bench(h, cfg, {kw, days = 14} = {}) {
  kw = kw || (cfg.bench?.keywords || [])[0];
  if (!kw) throw new Error('Need --kw "<keyword>"');
  const raw = await run(wrap(SEARCH, {kw, screens: 4}), {timeoutMs: 120000});
  const seen = new Set();
  const rows = raw.filter((r) => !seen.has(r.url) && seen.add(r.url)).map((r) => ({...r, views: views(r.viewsText), days: ageDays(r.ageText)}))
    .filter((r) => r.days <= days).sort((a, b) => b.views - a.views).slice(0, 20);
  const pats = patterns(rows.map((r) => r.title));
  const slug = kw.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase();
  const json = path.join(h, 'out', `bench-${slug}-${today()}.json`);
  writeJson(json, {kw, days, rows, patterns: pats});
  const md = [`# Benchmark "${kw}", last ${days} days, ${today()}`, '', '| # | Title | Channel | Views | Uploaded |', '|---|---|---|---|---|',
    ...rows.map((r, i) => `| ${i + 1} | [${r.title.replace(/\|/g, '/')}](${r.url}) | ${r.channel} | ${r.viewsText} | ${r.ageText} |`), '', '## Title patterns', '',
    ...pats.map((p) => `- ${p.pattern}: ${p.count}/${rows.length}`), '', 'Thumbnail links are in the JSON. Next: ask your agent to read the thumbnails and pick the 3 patterns that win most often.'];
  fs.writeFileSync(json.replace(/\.json$/, '.md'), md.join('\n'));
  return {json, md: json.replace(/\.json$/, '.md'), kept: rows.length, seen: raw.length};
}
