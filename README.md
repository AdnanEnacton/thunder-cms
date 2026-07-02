# THUNDER-CMS

Git-based headless CMS for static site generators — a Sitepins-style clone.

Connect your GitHub repository, pick content and media folders, and edit Markdown content visually. No code changes required in your site.

## Stack

- **Monorepo:** Turborepo + pnpm
- **Web app:** Next.js 15 (App Router)
- **Database:** SQLite + Prisma (dev) — PostgreSQL planned for production
- **Auth:** Auth.js (email/password + GitHub OAuth)
- **Editor:** Custom Notion-style visual editor + Markdown (not TipTap)
- **Git:** Octokit (GitHub only for now)

## Quick start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Environment variables

Copy `.env.example` to `apps/web/.env.local`:

```bash
cp .env.example apps/web/.env.local
```

Fill in:

- `AUTH_SECRET` — run `openssl rand -base64 32`
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — from [GitHub OAuth Apps](https://github.com/settings/developers)
  - Callback URL: `http://localhost:3000/api/auth/callback/github`

Set `DATABASE_URL` in `apps/web/.env.local` (use absolute path on Windows):

```
DATABASE_URL="file:C:/Development/AD/sitepins-clone/packages/database/prisma/dev.db"
```

### 3. Database

```bash
pnpm db:push
```

### 4. Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Current features

### Phase 0 — Foundation
- [x] Landing page
- [x] Register / login (email + GitHub)
- [x] Dashboard shell with sidebar
- [x] Organizations (auto-created on register)
- [x] **Dark mode** (light/dark toggle in the sidebar header, persisted to localStorage)

### Phase 1 — Git connect & configure
- [x] GitHub repo picker
- [x] 4-step setup wizard (content, media, optional paths, review)
- [x] Framework detection (Astro, Next.js, Hugo, Eleventy, Jekyll, Nuxt, SvelteKit)
- [x] Commits `.thunder/config.json` to connected repo

### Phase 2 — Content CRUD
- [x] Content folder scan → sidebar collections (nested + grouped)
- [x] Auto-detected frontmatter fields → editing forms
- [x] Custom visual + Markdown editor (Notion-style: slash commands, toolbar, tables, callouts, code blocks)
- [x] Create / save / delete entries → Git commits
- [x] Left sidebar: Content, Media Library, Config Files
- [x] Config file editor (JSON/YAML visual + raw, TS/JS raw)
- [x] Entry list with **sort** (updated / title / date) + **filter by draft** + search

### Phase 3 — Media & team
- [x] Media library (browse, upload, delete, copy public path) with **grid + list views**
- [x] Media picker in body editor (upload / library / URL)
- [x] Media picker in frontmatter image fields (Browse button)
- [x] Team invites (email-based, copy-link flow; no SMTP yet)
- [x] RBAC (Owner vs Editor) enforced on all routes
- [x] Activity log (audit trail UI + API, written on every save/upload/configure)
- [x] SHA-based conflict detection on save (GitHub 409 on stale blob)

## Next (Phase 4 — Pro features)

- [ ] Custom commit messages (modal on save)
- [ ] Branch targeting (save to staging)
- [ ] PR creation (staging → main)
- [ ] Version history / rollback
- [ ] Live preview iframe
- [ ] Global search (Cmd+K)
- [ ] AI assistant (BYOK)

## Project structure

```
apps/web/          Next.js dashboard + API routes
packages/database/ Prisma schema + client
packages/types/    Shared TypeScript types
```

## Status tracking

See `PROGRESS-TRACKER.md` for the live status of every phase and pending task. See `AGENTS.md` for the rules AI agents follow when working on this repo.
