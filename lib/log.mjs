// Work log per role. Loops check it first so the same comment never gets two replies.
import path from 'node:path';
import {readJson, writeJson} from './paths.mjs';
const file = (h, role) => path.join(h, 'logs', role + '.json');
export const read = (h, role) => readJson(file(h, role), {});
export function mark(h, role, key, value) {
  const l = read(h, role); l[key] = {...value, at: new Date().toISOString()}; writeJson(file(h, role), l); return l;
}
