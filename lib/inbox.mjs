// Approval inbox (결재함): anything that leaves the building waits here as a draft until a person approves it,
// unless that role is allowed to send on its own in config.autoSend.
import path from 'node:path';
import {readJson, writeJson} from './paths.mjs';

const file = (h) => path.join(h, 'inbox', 'approvals.json');
export const list = (h) => readJson(file(h), []);
export function add(h, item) {
  const all = list(h);
  const id = 'a' + (all.reduce((m, x) => Math.max(m, +x.id.slice(1) || 0), 0) + 1);
  const rec = {id, status: 'waiting', created: new Date().toISOString(), ...item};
  all.push(rec); writeJson(file(h), all);
  return rec;
}
export function setStatus(h, id, status, extra = {}) {
  const all = list(h);
  const r = all.find((x) => x.id === id);
  if (!r) throw new Error('No approval ' + id);
  Object.assign(r, {status, updated: new Date().toISOString(), ...extra});
  writeJson(file(h), all);
  return r;
}
