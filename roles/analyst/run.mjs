// 숫자 담당. Read only: your X profile, your recent posts with their numbers, replies under the best 5.
import fs from 'node:fs';
import path from 'node:path';
import {wrap, run} from '../../lib/ego.mjs';
import {writeJson, today} from '../../lib/paths.mjs';

export const id = 'analyst';
const READ = `
await page.goto('https://x.com/' + P.handle, {timeout: 40000}); await W(4500);
const posts = new Map();
for (let s = 0; s < P.screens; s++) {
  for (const p of await page.evaluate((h) => [...document.querySelectorAll('article[data-testid="tweet"]')].map(a => {
    const link = [...a.querySelectorAll('a[href*="/status/"]')].find(x => x.querySelector('time'));
    const g = a.querySelector('[role="group"]');
    return {url: link ? link.href.split('?')[0] : '', mine: !!(link && link.getAttribute('href').toLowerCase().startsWith('/' + h.toLowerCase() + '/')),
      text: (a.querySelector('[data-testid="tweetText"]') || {}).innerText || '', time: (a.querySelector('time') || {}).dateTime || '', stats: g ? g.getAttribute('aria-label') || '' : ''};
  }), P.handle)) if (p.url && p.mine) posts.set(p.url, p);
  await page.mouse.move(600, 500); await page.mouse.wheel(0, 2400); await W(1500);
}
done([...posts.values()]);
`;
const REPLIES = `
const out = [];
for (const u of P.urls) {
  await page.goto(u, {timeout: 40000}); await W(4000);
  out.push({url: u, replies: await page.evaluate(() => [...document.querySelectorAll('article[data-testid="tweet"]')].slice(1, 16).map(a => ({
    user: ((a.querySelector('[data-testid="User-Name"]') || {}).innerText || '').split('\\n')[0], text: (a.querySelector('[data-testid="tweetText"]') || {}).innerText || ''})).filter(r => r.text))});
}
done(out);
`;
const n = (s, k) => { const m = (s || '').match(new RegExp('([\\d,.]+)\\s*' + k)); return m ? +m[1].replace(/,/g, '') : 0; };
export const numbers = (p) => ({...p, views: n(p.stats, 'view'), likes: n(p.stats, 'like'), replies: n(p.stats, 'repl'), reposts: n(p.stats, 'repost')});

export async function read(h, cfg, {handle, screens} = {}) {
  handle = handle || cfg.x?.handle;
  if (!handle) throw new Error('Set x.handle in config.json (your X handle without @)');
  const posts = (await run(wrap(READ, {handle, screens: screens || 4}), {timeoutMs: 180000})).map(numbers);
  const best = [...posts].sort((a, b) => (b.likes * 10 + b.replies * 20 + b.views / 100) - (a.likes * 10 + a.replies * 20 + a.views / 100)).slice(0, 5);
  const replies = best.length ? await run(wrap(REPLIES, {urls: best.map((b) => b.url)}), {timeoutMs: 60000 * (1 + best.length)}) : [];
  const res = {handle, posts: posts.length, totals: {views: posts.reduce((s, p) => s + p.views, 0), likes: posts.reduce((s, p) => s + p.likes, 0), replies: posts.reduce((s, p) => s + p.replies, 0)}, best, replies};
  const json = path.join(h, 'out', `analyst-${today()}.json`);
  writeJson(json, res);
  const md = [`# Your numbers on X, ${today()}`, '', `@${handle}: ${posts.length} recent posts read. Views ${res.totals.views}, likes ${res.totals.likes}, replies ${res.totals.replies} (as X showed them now).`, '', '## Best 5', ''];
  for (const b of best) { md.push(`- ${b.views} views · ${b.likes} likes · ${b.replies} replies · ${b.text.replace(/\s+/g, ' ').slice(0, 140)}`, `  ${b.url}`); const r = replies.find((x) => x.url === b.url); for (const x of (r?.replies || []).slice(0, 5)) md.push(`  > ${x.user}: ${x.text.replace(/\s+/g, ' ').slice(0, 140)}`); }
  md.push('', 'Next: ask your agent which topics got the most replies and what people asked for.');
  fs.writeFileSync(json.replace(/\.json$/, '.md'), md.join('\n'));
  return {json, md: json.replace(/\.json$/, '.md'), posts: posts.length, best: best.length};
}
