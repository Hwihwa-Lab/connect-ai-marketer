// 팀장. Reads team.json (yours in the work folder first, else the kit's) and calls each role in order.
// A step that needs something you did not give is skipped with a note, never guessed.
import fs from 'node:fs';
import path from 'node:path';
import {KIT, readJson, writeJson, today} from './paths.mjs';
import * as replier from '../roles/comment-replier/run.mjs';
import * as listener from '../roles/listener/run.mjs';
import * as finisher from '../roles/studio-finisher/run.mjs';
import * as crossposter from '../roles/crossposter/run.mjs';

export const ROLES = {
  'comment-replier': {mod: replier, actions: {scan: (h, c) => replier.scan(h, c), send: (h, c, a) => replier.queueOrSend(h, c, readJson(a.file, []))}, approve: (h, c, item) => replier.sendApproved(h, c, item)},
  listener: {mod: listener, actions: {listen: (h, c, a) => listener.listen(h, c, {keywords: a.kw ? [].concat(a.kw) : undefined})}},
  'studio-finisher': {mod: finisher, actions: {check: (h, c, a) => finisher.check(h, c, {videoId: a.video, sheet: a.sheet})}},
  crossposter: {mod: crossposter, actions: {draft: (h, c, a) => crossposter.draft(h, c, readJson(a.post, {})), send: (h, c, a) => crossposter.send(h, c, a.id)}, approve: (h, c, item) => crossposter.send(h, c, item.id)},
};

export function roleInfo() {
  return Object.keys(ROLES).map((id) => readJson(path.join(KIT, 'roles', id, 'role.json')));
}

export function plan(h) {
  return readJson(path.join(h, 'team.json')) || readJson(path.join(KIT, 'team.json'));
}

export async function runEvent(h, cfg, event, args = {}, log = console.log) {
  const steps = plan(h).events[event];
  if (!steps) throw new Error(`No event "${event}" in team.json. Events: ${Object.keys(plan(h).events).join(', ')}`);
  const results = [];
  for (const s of steps) {
    const missing = (s.needs || []).filter((n) => !args[n]);
    if (missing.length) { log(`  ${s.role} ${s.action}: skipped (needs --${missing.join(' --')})`); results.push({...s, skipped: missing}); continue; }
    const fn = ROLES[s.role]?.actions[s.action];
    if (!fn) { log(`  ${s.role} ${s.action}: unknown role or action`); results.push({...s, error: 'unknown'}); continue; }
    log(`  ${s.role} ${s.action} ...`);
    try {
      const r = await fn(h, cfg, args);
      results.push({...s, ok: true, result: summarize(r)});
      log(`    done ${JSON.stringify(summarize(r)).slice(0, 160)}`);
    } catch (e) {
      results.push({...s, error: e.message});
      log(`    stopped: ${e.message.split('\n')[0]}`);
    }
  }
  const file = path.join(h, 'out', `team-${event}-${today()}.json`);
  writeJson(file, {event, at: new Date().toISOString(), results});
  return {file, results};
}

function summarize(r) {
  if (Array.isArray(r)) return {count: r.length, ids: r.map((x) => x.id || x.commentId).filter(Boolean).slice(0, 10)};
  if (r && typeof r === 'object') {
    const o = {};
    for (const [k, v] of Object.entries(r)) o[k] = Array.isArray(v) ? v.length : v;
    return o;
  }
  return r;
}
