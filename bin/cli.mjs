#!/usr/bin/env node
// connect-ai-marketer: a marketing team of AI employees on Ego Lite. One role = one job; the team lead runs them in order.
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {KIT, NAME, home, config, readJson, writeJson} from '../lib/paths.mjs';
import {egoInstalled} from '../lib/ego.mjs';
import {xLength, X_LIMIT} from '../lib/xcount.mjs';
import * as inbox from '../lib/inbox.mjs';
import {ROLES, roleInfo, runEvent, plan} from '../lib/team.mjs';
import {desk} from '../lib/desk.mjs';
import {installSkill, removeSkill} from '../lib/install.mjs';

const argv = process.argv.slice(2);
const VALUED = ['home', 'agent', 'dir', 'video', 'sheet', 'post', 'file', 'kw', 'id'];
const opt = (n, d = null) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const flag = (n) => argv.includes('--' + n);
const pos = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && VALUED.includes(argv[i - 1].slice(2))));
const cmd = pos[0] || 'help';
const log = (...a) => console.log(...a);
const args = Object.fromEntries(VALUED.map((k) => [k, opt(k)]).filter(([, v]) => v));
const H = () => home(opt('home'));

function openFile(f) {
  const c = process.platform === 'darwin' ? ['open', [f]] : process.platform === 'win32' ? ['cmd', ['/c', 'start', '', f]] : ['xdg-open', [f]];
  spawn(c[0], c[1], {detached: true, stdio: 'ignore'}).unref();
}

const HELP = `${NAME}: your marketing team of AI employees, working in Ego Lite.

  setup                      make your work folder + config, install the skill for your agents
  doctor                     check Ego Lite, config, and the team plan
  roles                      list the AI employees and what each one does
  team <event>               run an event from team.json (new-video, daily)
                             new-video takes --video <id> --sheet <sheet.json> --post <post.json>
  run <role> <action>        run one role, e.g. run listener listen --kw "ego lite"
                             run comment-replier scan | send --file replies.json
                             run studio-finisher check --video <id> --sheet sheet.json
                             run crossposter draft --post post.json
  inbox                      what is waiting for your approval
  approve <id>               let one waiting item go out
  reject <id>                drop one waiting item
  desk                       today's page: approvals, replies, checks, what people say
  xcount "<text>"            X weighted length (Korean, Japanese, Chinese count 2, links 23)
  skill [--agent claude|codex|antigravity] [--remove]

  Work folder: ~/.connect-ai-marketer (or --home, or CONNECT_AI_MARKETER_HOME). Nothing is kept inside the kit.
  Every post and reply waits in the inbox unless you list that role in config.autoSend.`;

async function main() {
  if (cmd === 'help' || flag('help')) return log(HELP);
  if (cmd === 'xcount') { const t = pos.slice(1).join(' ') || fs.readFileSync(0, 'utf8'); const n = xLength(t); return log(`${n}/${X_LIMIT} ${n <= X_LIMIT ? 'fits' : 'too long by ' + (n - X_LIMIT)}`); }
  if (cmd === 'roles') { for (const r of roleInfo()) log(`  ${r.id.padEnd(16)} ${r.name.en} · ${r.name.ko}\n  ${''.padEnd(16)} ${r.duty.en}\n  ${''.padEnd(16)} human gates: ${r.humanGates.join('; ')}\n`); return; }
  if (cmd === 'skill') { return flag('remove') ? removeSkill({agent: opt('agent', 'all'), dir: opt('dir'), dryRun: flag('dry-run')}) : installSkill({agent: opt('agent', 'all'), dir: opt('dir'), dryRun: flag('dry-run')}); }
  const h = H();
  if (cmd === 'setup') {
    const c = path.join(h, 'config.json');
    if (!fs.existsSync(c)) { fs.copyFileSync(path.join(KIT, 'config.example.json'), c); log(`  config: ${c} (edit your handle and keywords)`); } else log(`  config: kept ${c}`);
    const t = path.join(h, 'team.json');
    if (!fs.existsSync(t)) { fs.copyFileSync(path.join(KIT, 'team.json'), t); log(`  team plan: ${t} (change the order to make it your team)`); }
    log('  skill:'); installSkill({agent: opt('agent', 'all'), dir: opt('dir'), dryRun: flag('dry-run')});
    log(egoInstalled() ? '  Ego Lite: found' : '  Ego Lite: not found. Install it from https://lite.ego.app, then sign in to your sites inside it.');
    return;
  }
  if (cmd === 'doctor') {
    log(`  Ego Lite (ego-browser): ${egoInstalled() ? 'ok' : 'missing, see https://lite.ego.app'}`);
    let c = null; try { c = config(h); log(`  config: ok (${path.join(h, 'config.json')})`); } catch (e) { log('  config: ' + e.message); }
    const p = plan(h); log(`  team plan: ${Object.keys(p.events).join(', ')}`);
    for (const [ev, steps] of Object.entries(p.events)) for (const s of steps) if (!ROLES[s.role]?.actions[s.action]) log(`  WARNING ${ev}: ${s.role} ${s.action} does not exist`);
    if (c && !(c.listen?.keywords || []).length) log('  note: listen.keywords is empty');
    log(`  waiting approvals: ${inbox.list(h).filter((x) => x.status === 'waiting').length}`);
    return;
  }
  if (cmd === 'inbox') { const w = inbox.list(h).filter((x) => ['waiting', 'typed'].includes(x.status)); if (!w.length) return log('  nothing waiting'); for (const x of w) log(`  ${x.id}  ${x.status.padEnd(7)} ${x.role} · ${x.channel}\n      ${x.text.replace(/\n/g, '\n      ')}`); return; }
  if (cmd === 'reject') { const r = inbox.setStatus(h, pos[1], 'rejected'); return log(`  ${r.id} rejected`); }
  if (cmd === 'desk') { const f = desk(h); log('  ' + f); if (!flag('no-open')) openFile(f); return; }
  const cfg = config(h);
  if (cmd === 'approve') {
    const item = inbox.list(h).find((x) => x.id === pos[1]);
    if (!item) throw new Error('No approval ' + pos[1] + '. See: inbox');
    const fn = ROLES[item.role]?.approve;
    if (!fn) throw new Error('Role ' + item.role + ' has no approve step');
    const r = await fn(h, cfg, item);
    return log(`  ${item.id}: ${r.status}${r.status === 'typed-waiting-for-you' ? ' (the post is typed in Ego Lite; press Post yourself)' : ''}`);
  }
  if (cmd === 'team') { const r = await runEvent(h, cfg, pos[1], args, log); return log('  log: ' + r.file); }
  if (cmd === 'run') {
    const [, role, action] = pos;
    const fn = ROLES[role]?.actions[action];
    if (!fn) throw new Error(`Unknown: ${role} ${action}. Roles: ${Object.entries(ROLES).map(([k, v]) => k + ' (' + Object.keys(v.actions).join('|') + ')').join(', ')}`);
    const r = await fn(h, cfg, args);
    return log(JSON.stringify(r, null, 1).slice(0, 4000));
  }
  log(HELP);
}

main().catch((e) => { console.error('  ' + e.message); process.exit(1); });
