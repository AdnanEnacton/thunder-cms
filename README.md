# THUNDER-CMS

Git-based headless CMS for static site generators — a Sitepins-style clone.

Connect your GitHub repository, pick content and media folders, and edit Markdown content visually. No code changes required in your site.

## Stack

- **Monorepo:** Turborepo + pnpm
- **Web app:** Next.js 15 (App Router)
- **Database:** SQLite + Prisma (dev)
- **Auth:** Auth.js (email/password + GitHub OAuth)

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

## Current features (Phase 0–2)

- [x] Landing page
- [x] Register / login (email + GitHub)
- [x] Dashboard shell
- [x] GitHub repo picker
- [x] 4-step setup wizard (content, media, optional paths, review)
- [x] Framework detection (Astro, Next.js, Hugo, etc.)
- [x] Commits `.thunder/config.json` to connected repo
- [x] Content folder scan → sidebar collections (blog, pages, etc.)
- [x] Auto-detected frontmatter fields → editing forms
- [x] Visual + Markdown editor
- [x] Create / save / delete entries → Git commits
- [x] Left sidebar: Content, Media Library, Config Files
- [x] Media library (browse, upload, delete, copy public path)
- [x] Config file editor (JSON/YAML visual + raw, TS/JS raw)

## Next (Phase 3)

- Team invites and roles
- Activity log UI
- Rich text editor (TipTap)

## Project structure

```
apps/web/          Next.js dashboard + API routes
packages/database/ Prisma schema + client
packages/types/    Shared TypeScript types
```