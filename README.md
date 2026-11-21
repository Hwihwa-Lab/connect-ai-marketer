# connect-ai-marketer

**A marketing team of AI employees that works in your own logged-in browser.**
Source available by CONNECT AI LAB · MIT + Commons Clause (free to use, not for resale) · runs on [Ego Lite](https://lite.ego.app)

```bash
npx connect-ai-marketer setup
```

Each role is one AI employee with one job. A team lead runs them in order when something happens (a new video, a new day). Your agent (Claude Code, Codex, Antigravity) writes the words; the kit scans, checks, queues and types in Ego Lite, so your own tabs stay yours.

| Role | Job | Status |
|---|---|---|
| comment-replier | collect new Instagram comments, post replies in each commenter's language | v0.1 |
| listener | search X and Threads for your keywords, rank by reach, write a report | v0.1 |
| studio-finisher | reload a YouTube Studio video and diff saved title, description, playlists, tags with your sheet | v0.1 (reads only) |
| crossposter | per-channel drafts, X weighted length check, approval inbox, types the post | v0.1 |
| benchmarker, analyst, tagger, form-filler | | next |

## How the team works

```
team new-video ─▶ studio-finisher ─▶ crossposter (drafts → inbox) ─▶ comment-replier
team daily     ─▶ listener ─▶ comment-replier ─▶ desk
```

- **Roles** live in `roles/<id>/` (`role.json` + `run.mjs`) and pass work as JSON files in your work folder.
- **Team plan** `team.json` is the order. Copy it to your work folder and change it to make your own team.
- **Approval inbox**: every post and reply waits until you run `approve <id>`. List a role in `config.autoSend` only when you trust it to send alone.
- **Desk**: `desk` opens one page with today's approvals, replies, upload checks and what people are saying.
- **Human gates**: your logins, every post, and the final Post click (unless you turn on `crossposter.finalClick`).

## Commands

```bash
npx connect-ai-marketer roles
npx connect-ai-marketer run listener listen --kw "your product"
npx connect-ai-marketer run comment-replier scan
npx connect-ai-marketer run comment-replier send --file replies.json
npx connect-ai-marketer team new-video --video <id> --sheet sheet.json --post post.json
npx connect-ai-marketer inbox
npx connect-ai-marketer approve a3
npx connect-ai-marketer desk
npx connect-ai-marketer xcount "새 영상 올렸어요 https://youtu.be/..."
```

Work folder: `~/.connect-ai-marketer` (`config.json`, `team.json`, `out/`, `logs/`, `inbox/`). Nothing is written inside the kit.

## Add your own role
Copy `roles/listener/`, edit `role.json` and `run.mjs`, register it in `lib/team.mjs`, add a step to `team.json`. The agent skill (`skill/SKILL.md`) tells your agent how the team works.

## License
MIT with the Commons Clause. Use it, change it, share it, and use it to market your own business. Do not sell it, sell access to it, or sell a paid course or service built mainly on it. See LICENSE.

## Requirements
Node 18+, macOS or Windows, Ego Lite installed and signed in to the sites you use. See NOTICE.md.
