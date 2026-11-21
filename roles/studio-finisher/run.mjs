// 업로드 마무리 담당 v0.1 = verify. "Changes saved" is not proof; a fresh load of the edit page is.
import path from 'node:path';
import {wrap, run} from '../../lib/ego.mjs';
import {writeJson, readJson, today} from '../../lib/paths.mjs';

export const id = 'studio-finisher';

const READ = `
await page.goto('https://studio.youtube.com/video/' + P.videoId + '/edit', {timeout: 60000}); await W(6000);
const more = await page.$('ytcp-button#toggle-button'); if (more) { await more.click().catch(() => {}); await W(1200); }
done(await page.evaluate(() => {
  const t = (sel) => { const e = document.querySelector(sel); return e ? e.innerText.trim() : null; };
  return {
    title: t('#title-textarea #textbox'),
    description: t('#description-textarea #textbox'),
    playlists: (t('ytcp-video-metadata-playlists ytcp-dropdown-trigger') || '').split(',').map(s => s.trim()).filter(s => s && s !== 'Select'),
    tags: [...document.querySelectorAll('ytcp-chip-bar ytcp-chip')].map(c => c.innerText.trim()).filter(Boolean),
    visibility: (t('ytcp-video-metadata-visibility') || '').split('\\n').filter(Boolean)[1] || t('ytcp-video-metadata-visibility'),
  };
}));
`;

const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();

export function compare(saved, sheet = {}) {
  const diffs = [];
  if (sheet.title && norm(saved.title) !== norm(sheet.title)) diffs.push({field: 'title', saved: saved.title, want: sheet.title});
  if (sheet.description && norm(saved.description) !== norm(sheet.description)) diffs.push({field: 'description', saved: (saved.description || '').slice(0, 120), want: sheet.description.slice(0, 120)});
  for (const p of sheet.playlists || []) if (!(saved.playlists || []).includes(p)) diffs.push({field: 'playlist', missing: p});
  const have = new Set((saved.tags || []).map((x) => x.toLowerCase()));
  for (const g of sheet.tags || []) if (!have.has(g.toLowerCase())) diffs.push({field: 'tag', missing: g});
  return diffs;
}

export async function check(h, cfg, {videoId, sheet}) {
  if (!videoId) throw new Error('Need --video <videoId>');
  const want = typeof sheet === 'string' ? readJson(sheet, {}) : sheet || {};
  const saved = await run(wrap(READ, {videoId}), {timeoutMs: 120000});
  const diffs = compare(saved, want);
  const file = path.join(h, 'out', `studio-${videoId}-${today()}.json`);
  writeJson(file, {videoId, saved, diffs});
  return {file, saved, diffs};
}
