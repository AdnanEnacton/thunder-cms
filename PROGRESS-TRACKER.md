# THUNDER-CMS — Progress Tracker

> **Single source of truth for build status.** Update this file every time a task is started, completed, or blocked.
> Last full audit: see git blame on this line.
> Legend: `[x]` done · `[~]` partial / has known gaps · `[ ]` not started · `[!]` blocked

---

## Phase summary

| Phase | Name | Status | % |
|---|---|---|---|
| 0 | Foundation | `[x]` Done | 100% |
| 1 | Git connect & configure | `[x]` Done | 100% |
| 2 | Content CRUD | `[x]` Done | 98% |
| 3 | Media & team | `[~]` Partial | 98% |
| 4 | Pro features | `[x]` Done | 100% |
| 5 | Polish & scale | `[ ]` Not started | 0% |

Headline: Phases 0, 1, 2, 4 are **done**. Phase 3 is effectively complete — SMTP invites, conflict-resolution UX, and entry-list pagination all shipped (only presence/soft-lock, a Phase-5 item, remains). Phase 5 untouched. Phase 4 delivered: custom commit messages, branch targeting, version history/rollback, live preview iframe, Cmd+K search, BYOK AI assistant. (PR creation intentionally dropped — deployment is handled by GitHub Actions on the `editor` branch via `deploy.json` trigger bumps.)

---

## Phase 0 — Foundation  ·  `[x]` 100%

| # | Task | Status | Evidence / Notes |
|---|---|---|---|
| 0.1 | Monorepo scaffold (Turborepo + pnpm) | `[x]` | `turbo.json`, `pnpm-workspace.yaml`, `apps/web`, `packages/database`, `packages/types` |
| 0.2 | Prisma schema (users, orgs, projects, +Phase 3 tables) | `[x]` | `packages/database/prisma/schema.prisma` |
| 0.3 | Email + password auth (register/login) | `[x]` | `apps/web/src/app/api/auth/register/route.ts`, `components/auth-form.tsx` |
| 0.4 | GitHub OAuth | `[x]` | `apps/web/src/lib/auth.ts` (GitHub provider, `signIn` syncs token to org) |
| 0.5 | JWT sessions + middleware guard | `[x]` | `apps/web/src/lib/auth.config.ts`, `apps/web/src/middleware.ts` |
| 0.6 | Auto-create org on register / first GitHub login | `[x]` | `register/route.ts`, `auth.ts` |
| 0.7 | Dashboard shell + sidebar + landing page | `[x]` | `dashboard-layout-client.tsx`, `dashboard-sidebar.tsx`, `app/dashboard/page.tsx`, `app/page.tsx` |
| 0.8 | **Dark mode** | `[x]` | Implemented: `@custom-variant dark` + dark CSS-variable overrides in `globals.css`, no-flash script in `app/layout.tsx`, `ThemeToggle` in both sidebar headers (persists to localStorage). |
| 0.9 | PostgreSQL | `[x]` | **Migrated to PostgreSQL (Neon).** `schema.prisma` provider = postgresql; auth via better-auth. |

### Phase 0 pending
- [x] **P0-A** Implement dark mode (theme tokens + toggle + persist), OR remove the dark-mode claim from README. — **Done.** Toggle in sidebar header; dark palette via CSS-variable overrides.
- [x] **P0-B** Migrate SQLite → PostgreSQL (Neon) — **Done.** Also migrated Auth.js → better-auth. Token encryption added: `Account` OAuth tokens via better-auth `encryptOAuthTokens`; `Organization.githubAccessToken` via `lib/token-crypto` (symmetric, keyed by `BETTER_AUTH_SECRET`). Both encrypted at rest.

---

## Phase 1 — Git connect & configure  ·  `[x]` 100%

| # | Task | Status | Evidence / Notes |
|---|---|---|---|
| 1.1 | GitHub OAuth + token storage | `[x]` | `lib/github-token.ts`, `lib/org-github.ts`, stored in `Organization.githubAccessToken` |
| 1.2 | Repo list (paginated, searchable) | `[x]` | `app/api/github/repos/route.ts`, `lib/github.ts` `listUserRepos` |
| 1.3 | Repo picker UI | `[x]` | `components/new-project-form.tsx` |
| 1.4 | Repo tree browser (API) | `[x]` | `app/api/github/tree/route.ts`, `lib/github.ts` `getRepoTree` (recursive) |
| 1.5 | 4-step configuration wizard | `[x]` | `components/setup-wizard.tsx` — Content / Media / Optional paths / Review |
| 1.6 | Framework detection (all 7 SSGs) | `[x]` | `lib/framework.ts` `detectFramework` + `getFrameworkDefaults` + `listDirectories` |
| 1.7 | Write `.thunder/config.json` (first commit) | `[x]` | `app/api/projects/[id]/configure/route.ts` → `lib/github.ts` `commitThunderConfig` (+ activity log) |
| 1.8 | Post-configure redirect to workspace | `[x]` | `app/dashboard/projects/[id]/page.tsx` guards on `isConfigured` |

### Phase 1 pending (polish, non-blocking)
- [ ] **P1-A** Replace native `<select>` folder picker with a true visual tree browser (better for deep repos).
- [ ] **P1-B** Expose **multiple content roots** in the wizard (Blog + Docs sections). Schema/types already support it; wizard hardcodes a single root labeled "Content".

---

## Phase 2 — Content CRUD  ·  `[x]` 98%

| # | Task | Status | Evidence / Notes |
|---|---|---|---|
| 2.1 | Content scanner (nested collections + groups + counts) | `[x]` | `lib/content/scan.ts` `buildScannedCollections`, `listEntriesInCollection`, `summarizeEntry` |
| 2.2 | Schema inference (union of fields, type detection) | `[x]` | `lib/content/schema.ts` `inferFieldsFromEntries` |
| 2.3 | Field → UI control mapping | `[x]` | `lib/content/field-ui.ts` |
| 2.4 | Multi-format parser/serializer (md/mdx/json/yaml/toml/ts/js) | `[x]` | `lib/content/parser.ts` `parseContentFile`, `serializeContentFile` |
| 2.5 | Entry list (title, path, date, draft badge) | `[x]` | `components/project/content-panel.tsx`. Now has **sort** (updated/title/date-desc/date-asc), **filter-by-draft** (all/drafts/published), and **search**. |
| 2.6 | Visual + Markdown editor (synced) | `[x]` | `components/content/notion-editor/*` — custom "Notion-style" editor, **NOT TipTap**. Complete: slash commands, toolbar, tables, image insert, md↔html sync. |
| 2.7 | Markdown↔HTML conversion | `[x]` | `lib/markdown/convert.ts` (marked + turndown + gfm) |
| 2.8 | Save → Git commit (auto messages) | `[x]` | `app/api/projects/[id]/content/entry/route.ts` PUT → `commitFile`; msgs `Update/Create/Delete: "title"` |
| 2.9 | New entry (slug from title) | `[x]` | `app/api/projects/[id]/content/entries/route.ts` POST |
| 2.10 | Delete entry | `[x]` | `entry/route.ts` DELETE → `deleteFile` |
| 2.11 | Config file editing (JSON/YAML visual+raw, TS/JS raw) | `[x]` | `components/project/config-file-editor.tsx`, `app/api/projects/[id]/configs/route.ts`, `lib/config/scan.ts` |
| 2.12 | Collections list endpoint | `[x]` | `app/api/projects/[id]/content/collections/route.ts` |

### Phase 2 pending
- [x] **P2-A** Add **sort controls** + **filter-by-draft** toggle to the entry list. — **Done.** Sort dropdown + draft-filter segmented control + search in `content-panel.tsx`.
- [x] **P2-B** Add **pagination** to `entries/route.ts` GET. — **Done.** Route accepts `offset`/`limit` (default 30, max 100) and returns `total`/`hasMore`; `content-panel.tsx` has a **Load more** button ("N of total") and notes that client-side search/filter apply to loaded entries only.
- [ ] **P2-C** Decide TipTap-vs-custom-editor for the long term. Custom editor uses deprecated `document.execCommand`. Either keep & document, or migrate to TipTap later.
- [ ] **P2-D** Remove dead "Legacy MDX (removed)" CSS block in `globals.css` (lines ~785–1011) once confirmed unused.

---

## Phase 3 — Media & team  ·  `[~]` 92%

| # | Task | Status | Evidence / Notes |
|---|---|---|---|
| 3.1 | Media library — browse | `[x]` | `components/project/media-library.tsx`, `lib/media/scan.ts` `getMediaFolders`, `listMediaFiles` |
| 3.2 | Media library — upload (multi) | `[x]` | `media-library.tsx` + `app/api/projects/[id]/media/route.ts` POST |
| 3.3 | Media library — delete (confirm) | `[x]` | `media-library.tsx` + media route DELETE |
| 3.4 | Media library — copy public path | `[x]` | `lib/media/scan.ts` `toPublicPath`/`fromPublicPath` (root↔public mapping per plan §4.5) |
| 3.5 | Media library — raw binary serving | `[x]` | `app/api/projects/[id]/media/raw/route.ts` |
| 3.6 | Media picker in body editor | `[x]` | `components/content/notion-editor/image-insert-dialog.tsx` (Upload/Library/URL tabs) |
| 3.7 | Media library — **grid/list toggle** | `[x]` | `media-library.tsx` now has grid + list (table) view toggle in the header. |
| 3.8 | Media picker in **frontmatter image fields** | `[x]` | `image-field-input.tsx` now has a **Browse** button that opens the `ImageInsertDialog` (upload/library/URL) + clear button. |
| 3.9 | Email invites (data model + flow) | `[x]` | `team/route.ts` POST (7-day expiry, cuid token), `app/invite/[token]/page.tsx`, `api/invite/[token]/accept/route.ts` |
| 3.10 | Invitation revoke | `[x]` | `api/projects/[id]/team/invitations/[token]/route.ts` DELETE |
| 3.11 | Roles (Owner vs Editor) | `[x]` | `lib/rbac.ts` `getUserRoleForProject`, `requireRole` |
| 3.12 | RBAC enforcement on team routes | `[x]` | invite/role-change/remove/revoke all call `requireRole(..., "owner")`; self-demotion prevented |
| 3.13 | RBAC enforcement on content/media/config routes | `[x]` | `lib/project-auth.ts` `requireProjectMember` + `getProjectForUser` on all routes |
| 3.14 | Activity log — write on mutations | `[x]` | `entry.created/updated/deleted`, `media.uploaded/deleted`, `project.configured` |
| 3.15 | Activity log — API (cursor pagination) | `[x]` | `app/api/projects/[id]/activity/route.ts` |
| 3.16 | Activity log — UI (timeline) | `[x]` | `app/dashboard/projects/[id]/activity/page.tsx`. Label-key mismatch fixed (`entry.*` keys now match the API). |
| 3.17 | Concurrent edit lock (SHA-based) | `[x]` | `entry/route.ts` PUT requires `sha`; GitHub returns 409 on stale blob → route now returns a distinct `409 {conflict:true}`. Editor shows `ConflictDialog` (Reload latest / Overwrite / Keep editing). Soft lock + presence still Phase 5. |
| 3.18 | Actual email sending for invites | `[x]` | `lib/email.ts` (nodemailer, generic SMTP env vars) + `sendInviteEmail`. `team/route.ts` emails the invite when `SMTP_*` is configured and returns `emailSent`; otherwise the copy-link fallback remains. |

### Phase 3 pending
- [x] **P3-A** **Fix activity-log label bug** — align `ACTION_META` keys in `activity/page.tsx` with the `entry.*` / `media.*` / `project.*` action strings written by the API. — **Done.**
- [x] **P3-B** Add **list-view toggle** to media library (grid/list). — **Done.**
- [x] **P3-C** Add **media picker** to frontmatter image fields (`image-field-input.tsx`). — **Done.**
- [x] **P3-D** Add **SMTP/email sending** for invites. — **Done.** `lib/email.ts` (nodemailer + `SMTP_*`/`EMAIL_FROM` env vars + HTML template). Sends on invite when configured; copy-link fallback when not.
- [x] **P3-E** Improve **conflict UX** — on 409, offer "Reload latest / Overwrite / Keep editing". — **Done.** `ConflictDialog` in the editor; PUT returns a distinct 409; overwrite refetches the latest SHA and re-saves. (Soft lock + presence are Phase 5.)
- [x] **P3-F** Update README to reflect reality. — **Done.** README now lists Phase 0-3 features accurately.

---

## Phase 4 — Pro features  ·  `[x]` 100%

> Delivered. All 7 sub-features built and wired. `tsc --noEmit` + `next build` pass. New API routes: `/api/projects/[id]` (GET+PATCH), `/branches`, `/pulls`, `/search`, `/content/entry/history`, `/content/entry/restore`. Schema gained `targetBranch` + `previewUrl` columns.

| # | Task | Status | Notes |
|---|---|---|---|
| 4.1 | Custom commit messages (modal on save) | `[x]` | `commitMessageMode` toggle in setup wizard + project settings. Editor shows `CommitMessageDialog` on save when "custom". PUT accepts `message`. |
| 4.2 | Branch targeting (save to staging) | `[x]` | `BranchSelector` in sidebar; `getProjectBranch(project)` helper; all content/media/configs routes use target branch; can create a new branch from the selector. Switching reloads the page. |
| 4.3 | PR creation (staging → main) | `[!]` | **REMOVED per user request.** No Open PR button/route. Branch targeting only (save to selected branch). `pulls/route.ts` + `createPullRequest` deleted. Re-add later if needed. |
| 4.4 | Version history / rollback | `[x]` | `listCommitsForFile` + `getFileAtRef` in `lib/github.ts`; `GET .../entry/history`; `POST .../entry/restore`; `VersionHistory` dialog in editor with Restore. Activity logged. |
| 4.5 | Live preview iframe | `[x]` | `previewUrl` column; set in setup wizard + project settings; Eyeball toggle in editor opens an iframe pane. **Staging-URL preview (not real-time draft) — plan MVP.** |
| 4.6 | Global search (Cmd+K) | `[x]` | Custom `CommandPalette` mounted in root layout (no `cmdk` dep). Nav + collections + entry search via `GET /api/projects/[id]/search`. Capped at 20 results. |
| 4.7 | AI assistant (BYOK OpenAI first) | `[x]` | `lib/ai/client.ts` calls OpenAI directly with key in localStorage; `AiAssistant` dialog in editor (improve/grammar/shorter/longer/titles/summary + custom); key also settable in dashboard settings. OpenAI only (multi-provider = Phase 5). |

### Phase 4 pending
- [x] **P4-A** Custom commit-message modal on save. — **Done.**
- [x] **P4-B** Branch targeting. — **Done.**
- [x] **P4-C** PR creation UI. — **Done.**
- [x] **P4-D** Version history + restore. — **Done.**
- [x] **P4-E** Live preview iframe. — **Done.** (staging-URL approach; real-time draft preview deferred)
- [x] **P4-F** Global search (Cmd+K). — **Done.** (custom palette, no cmdk dep)
- [x] **P4-G** AI assistant (BYOK). — **Done.** (OpenAI only)

### Phase 4 known limitations / follow-ups
- [ ] **P4-E2** Real-time draft preview (preview worker / branch-less draft state) — current preview shows the deployed staging site only.
- [ ] **P4-F2** Full-text content search (currently title + path match; large repos fetch file contents so capped at 20).
- [ ] **P4-G2** Multi-provider AI (Gemini/Claude/Grok) + in-editor selection-scoped actions — OpenAI only for now.
- [ ] **P4-H** Wire custom commit messages + branch targeting into config-file save and media upload (currently entry save only).

---

## Phase 5 — Polish & scale  ·  `[ ]` 0%

> Nothing implemented. No i18n, no GitLab, no WebSocket, no MDX shortcodes, no deploy webhooks, no SEO.

| # | Task | Status | Notes |
|---|---|---|---|
| 5.1 | i18n (12 locales) | `[ ]` | No `next-intl`/locale files/`useTranslations`. (`locales` var name in sidebar is unrelated.) |
| 5.2 | GitLab provider | `[ ]` | `gitProvider` defaults "github"; `lib/github.ts` is Octokit-only. |
| 5.3 | Collaborative cursors (WebSocket presence) | `[ ]` | No WS server. |
| 5.4 | Shortcode / block editor (MDX components) | `[ ]` | No MDX component system. *(A frontmatter `sections[]` array editor with reorderable items exists — that's the deferred Section-15 page/section builder, inference-only, NOT Phase-5 MDX shortcodes.)* |
| 5.5 | Deployment status (Vercel/Netlify webhook) | `[ ]` | No webhook routes. |
| 5.6 | SEO suggestions | `[ ]` | No SEO analysis. |

### Phase 5 pending
- [ ] **P5-A** i18n setup (`next-intl`) + locale files.
- [ ] **P5-B** Abstract Git provider behind `GitProvider` interface; add GitLab client (`@gitbeaker/rest`).
- [ ] **P5-C** WebSocket presence + cursors.
- [ ] **P5-D** MDX shortcode/component block editor.
- [ ] **P5-E** Deploy-status webhooks (Vercel/Netlify).
- [ ] **P5-F** SEO suggestions on save.

---

## Cross-cutting issues (not phase-bound)

- [x] **X-1** **README is out of date.** — **Fixed.** README now lists Phase 0-3 features accurately (incl. dark mode, sort/filter, media picker, list-view toggle).
- [x] **X-2** `.env.example` has `SMTP_*` + `EMAIL_FROM` vars. — **Done** (with P3-D).
- [ ] **X-3** No tests exist anywhere in the repo. Decide on a test strategy (Vitest?) before Phase 4.
- [ ] **X-4** No CI/lint gate documented. `next lint` is interactive/broken (no ESLint config installed); `tsc --noEmit` and `next build` both pass clean. Needs an `.eslintrc` + `eslint-config-next` to make `pnpm lint` non-interactive.
- [ ] **X-5** Token encryption layer missing (plan §8.2 said "encrypted OAuth tokens"). Relevant when moving to Postgres/multi-tenant.

---

## Changelog (tracker updates)

| Date | Who | Change |
|---|---|---|
| (initial) | audit | First full audit; populated all phases from source inspection. |
| 2026-07-02 | opencode | Quick-wins batch: P3-A activity-log label fix; P0-A dark mode (toggle + dark palette + no-flash script); P3-C media picker in frontmatter image fields; P3-B media library list-view toggle; P2-A entry-list sort + filter-by-draft + search; P3-F README rewrite. `tsc --noEmit` + `next build` pass. |
| 2026-07-02 | opencode | P3-D (SMTP invites) marked ON HOLD per user. Starting Phase 4. |
| 2026-07-02 | opencode | **Phase 4 complete.** P4-A custom commit messages; P4-B branch targeting (targetBranch column + getProjectBranch + BranchSelector); P4-C PR creation; P4-D version history/rollback; P4-E live preview iframe (previewUrl column); P4-F Cmd+K command palette + search API; P4-G BYOK OpenAI AI assistant. New routes: projects/[id] GET+PATCH, branches, pulls, search, entry/history, entry/restore. Schema: +targetBranch, +previewUrl. Dev server stopped to run migration. `tsc --noEmit` + `next build` pass. |
| 2026-07-11 | claude | **P3-D + P3-E + P2-B done.** P3-D SMTP invites (`lib/email.ts` via nodemailer; `SMTP_*`/`EMAIL_FROM` in `.env.example`; `team/route.ts` sends + returns `emailSent`; copy-link fallback kept). P3-E conflict UX (PUT returns distinct `409 {conflict}`; `ConflictDialog` with Reload/Overwrite/Keep editing; overwrite refetches latest SHA). P2-B pagination (`entries/route.ts` `offset`/`limit`+`total`/`hasMore`; Load-more UI). `tsc --noEmit` + `next build` pass. PR creation & i18n remain out of scope per user (deploy handled by GitHub Actions on `editor`). |
| 2026-07-02 | opencode | **Removed PR creation (P4-C) per user** — no Open PR button/modal; deleted `pulls/route.ts` + `createPullRequest`. Branch targeting kept. Also fixed staging-content bug: `entries/route.ts` was fetching file contents from `project.defaultBranch` (line 63) instead of the target branch — now uses `branch` consistently. Added diagnostics to `collections/route.ts` (returns `scannedBranch` + `treeFileCount` + real error message) to help diagnose "No collections found" on staging. |
| 2026-07-12 | composer | **Full UI redesign (visual only).** Ink+Ember tokens (ember accent replaces blue); Outfit + Instrument Serif fonts; denser sidebars with `h-dvh`/`min-h-0` scroll chain (content area reclaim); dropped redundant Dashboard/Settings from project sidebar; brand-led landing with grid/glow motion; auth panels restyled. No functionality changes. `next build` pass. |

> **Append a row here every time this file is edited** (see `AGENTS.md`).
