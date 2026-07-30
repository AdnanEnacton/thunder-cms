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
- [x] **P2-E** **Last updated by / when** — **Done.** New `GET /api/projects/[id]/content/entries/last-updated?paths=a,b,c` (bulk, `requireProjectMember`) queries `ActivityLog` for `entry.updated`/`entry.created` rows matching the given paths, returns the latest per path with `user.name || user.email` — activity-log-attributed, not Git-author-attributed, so invited Editors show correctly. Wired into `content-panel.tsx` (each row now shows "Name · Mon D" instead of the frontmatter date when activity data exists, falling back to the old date display otherwise) **and fixed a latent bug**: the "Last updated" sort option was the default but had no actual sort branch — it now really sorts by this data. `entry-editor.tsx` header shows "Updated by X on <date>" next to the file path, refreshed on load and after each save. No dedicated test (thin Prisma query, consistent with the rest of the route layer which has no test coverage yet — see X-3).

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
| 4.3 | PR creation (staging → main) | `[x]` | **Re-added.** `app/api/projects/[id]/pull-request/route.ts` (GET status + POST open); `getOpenPullRequest`/`compareBranches`/`createPullRequest` in `lib/github.ts`; `PullRequestButton` in `project-sidebar.tsx` — only shows when target branch ≠ default, disabled when nothing to publish, links to an already-open PR. Logs `pull_request.opened` activity. |
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
- [x] **P4-H** Wire custom commit messages + branch targeting into config-file save and media upload. — **Done.** Branch targeting was already correct for both (both routes already called `getProjectBranch(project)`; config-file saves already route through the entry PUT endpoint, which already respected it). The actual gap was custom commit messages: `config-file-editor.tsx` and `media-library.tsx` never showed `CommitMessageDialog` or sent a `message`, so both silently used the auto-generated message even in "ask me before each save" projects. Fixed: both now check `project.commitMessageMode` and show `CommitMessageDialog` before saving/uploading when `"custom"`; media route POST now accepts an optional `message` form field. `CommitMessageDialog` gained an optional `defaultMessage` prop (was hardcoded to `Update: "..."`, wrong verb for uploads) so callers can seed context-appropriate text (`Upload: "photo.png"`).

---

## npm + config-driven blocks (THUNDER-COMPONENTS-NPM-MODEL.md)  ·  `[~]` in progress

> Implements the phases defined in `THUNDER-COMPONENTS-NPM-MODEL.md` §12. Tracked here as work lands.

| # | Task | Status | Evidence / Notes |
|---|---|---|---|
| A | Types + `thunder.config.ts` static parser | `[x]` | `packages/types/src/index.ts` (+`BlockImportSpec`/`BlockConfigEntry`/`ThunderBlocksConfig`, `BlockSource` `"package"` kind); `apps/web/src/lib/blocks/resolve-config.ts` (Babel-AST literal parser: object/array literals, local `const` spreads, import-identifier spreads flagged as `unresolvedRefs` for Phase B, `props` treated as opaque/dynamic-OK). 7/7 vitest tests (`resolve-config.test.ts`). |
| B | npm manifest resolver + `/blocks/effective` wiring | `[x]` | `apps/web/src/lib/blocks/npm-manifest.ts` (lockfile version pin resolution for pnpm/npm/yarn + package.json range fallback; manifest fetch via unpkg CDN — reads `blocks.manifest.json`/`dist/blocks/<key>.json` straight off the published tarball, no tar extraction needed; in-memory TTL cache). `resolveConfigDrivenBlocks()` added to `lib/blocks/effective.ts` (merges config + manifest + local-file discovery → `BlockDef[]`, never throws, collects `warnings[]`). `blocks/effective/route.ts` now reads `thunder.config.ts` from Git first; when present, resolves package.json + first found lockfile and returns config-driven blocks (`source: "config"`); when absent, unchanged folder-scan fallback (`source: "folder-scan"`). 21/21 vitest tests (`npm-manifest.test.ts` + `resolve-effective.test.ts`). `tsc --noEmit` + `next build` pass. |
| C | First-party block package(s) (minimal) | `[x]` | New workspace packages: `packages/blocks-config` (`defineThunderConfig()`, `validateThunderConfig()` zod schema, re-exports `@thunder/types`), `packages/blocks-runtime` (`createBlocksRenderer(config, components)` — explicit component map, merges `defaults → content → props`), `packages/blocks-marketing` (Hero + FeatureGrid: React components in `src/react/`, `src/blocks.ts` dev-time exports for the `...hero` spread pattern, `blocks.manifest.json` at package root — the file Thunder's `npm-manifest.ts` fetches in production). End-to-end proof in `apps/web/src/lib/blocks/e2e-npm-model.test.tsx`: Thunder's static parser + manifest resolver process a real `thunder.config.ts` source string (manifest served from the actual `blocks.manifest.json`, not a hand-rolled mock) to build the CMS field schema, **and** the real `Hero`/`FeatureGrid` components render real HTML via `createBlocksRenderer` from the same config — proves install→config→edit(schema)→render end to end within the monorepo. 12 new tests (`blocks-config` 5, `blocks-runtime` 4, `blocks-marketing` 3) + 2 e2e tests in `apps/web`. `pnpm test` (turbo, all 4 test-having packages) = 42/42 passing. `tsc --noEmit` + `next build` pass. Root gained a `test` script/turbo task. |
| C-3 | Real build + real external-install proof | `[x]` | Added `tsup` builds to `@thunder/types`, `blocks-config`, `blocks-runtime`, `blocks-marketing` — dual ESM/CJS + `.d.ts`, `main`/`module`/`types`/`exports` all point at `dist/`, `files: ["dist"]` (+ `blocks.manifest.json` for blocks-marketing). `@thunder/types` stays a real `dependencies` entry (not inlined into consumers' `.d.ts` — tsup's dts bundler leaves external package imports as bare specifiers, confirmed by inspection; a types-only companion dependency is normal npm practice anyway). Verified with `pnpm pack` on all four packages (confirms `workspace:*` → real pinned version rewrite, e.g. `@thunder/types: "0.0.0"`, exactly as a real `pnpm publish` would do) **and a standalone external consumer project outside the monorepo** installing the four `.tgz` files via `file:` (plus a `pnpm.overrides` redirect for the transitive `@thunder/types` dependency, since it isn't on a real registry — this override is a local-testing-only substitute for "it's actually published", not something a real consumer needs). That project's own `tsc --noEmit` passes against the shipped `.d.ts` files, and running its `thunder.config.ts`-equivalent + `createBlocksRenderer` renders real HTML with `defaults` correctly applied — proving the whole install→config→render loop works via genuine `node_modules` resolution, not monorepo source. **Still not done:** actually publishing to a real npm registry (the `@thunder` npm scope hasn't been checked/claimed) — `pnpm add @thunder/blocks-marketing` from a fresh project will still 404 until that happens; see `thunder-integration.md` for the caveat. |
| D | CMS UX (config detection, generate, palette status) | `[~]` | `lib/blocks/config-template.ts` (starter template, round-trips through Thunder's own parser with 0 issues — tested). New `GET/POST /api/projects/[id]/blocks/config` — GET reports whether `thunder.config.ts` exists (+ template preview when missing), POST commits it via `commitFile` (409 if it already exists and `overwrite` isn't set) and logs `project.configured` activity. `project-settings-client.tsx` gained a "Config-driven blocks (npm model)" card: status line, **Generate thunder.config.ts** button, collapsible template preview. `block-palette.tsx`/`page-builder.tsx` now surface `source: "config"` (badge) and resolver `warnings[]` (amber banner) from the effective route instead of discarding them. **Descoped for this pass (documented, not silently dropped):** a setup-wizard step (existing 4-step wizard has no components/blocks step at all today — adding one is a larger UX redesign than this pass); a live "browse `@thunder/*` packages" picker (would need a real npm-search backend/registry integration, not just UI — the palette already lists package-sourced blocks once they're in `thunder.config.ts`, it just can't discover *new* packages to install). Reusing `config-file-editor.tsx` for `thunder.config.ts` works today via its existing raw-text fallback once the path is added to a project's `configPaths` — no new editor code needed. |
| C-2 | Expand `@thunder/blocks-marketing` | `[x]` | Added `Cta` and `Testimonials` React components (`src/react/Cta.tsx`, `Testimonials.tsx`), their `src/blocks.ts` dev-time exports, and `blocks.manifest.json` entries — same pattern as Hero/FeatureGrid. 6 new tests. **Descoped:** additional theme/industry packs beyond `@thunder/blocks-marketing` (e.g. a second `@thunder/blocks-blog` package) — no concrete demand for a second pack yet; the pattern established here (component + `blocks.ts` entry + manifest entry + tests) is the template to follow when one is needed. |
| E | Migrate-to-config + folder-scan deprecation notice | `[x]` | `lib/blocks/migrate-to-config.ts` — pure `generateMigratedConfigSource(blocks, pageTypes)` drafts a `thunder.config.ts` from a project's **current** effective blocks (folder-discovered components + DB registry overrides), not a blank template: component-backed blocks get `import: { from }` with their discovered fields inlined (nothing lost in the switch), manual blocks become content-only entries, built-in page types (`markdown`/`component`) are stripped, custom ones kept. 6 tests, all verifying the output round-trips through Thunder's own `parseThunderConfigSource` with zero issues/unresolved refs. `POST /api/projects/[id]/blocks/config` gained a `mode: "template" \| "migrate"` param — migrate mode re-runs the same folder-scan (`getRepoTree` + `buildDiscoveredBlocks` + `mergeEffectiveBlocks`) used by `/blocks/effective` and commits the drafted config. `project-settings-client.tsx` now offers both **Generate starter template** and **Migrate existing blocks** buttons. Folder-scan deprecation notice: `block-palette.tsx` shows a persistent "Folder scan (legacy) — set up thunder.config.ts in Settings" banner whenever `source: "folder-scan"` (vs. the existing green `thunder.config.ts` badge for `source: "config"`) — folder scan itself is intentionally **not removed** (doc §10.3: deprecate, don't delete immediately). **Descoped:** an actual standalone `pnpm thunder migrate-to-config` **CLI package** the doc names — Thunder's real mutation surface is its hosted API (same pattern as the existing "commit generated renderer" and "Generate thunder.config.ts" actions), so this shipped as an in-app action instead; a real redistributable CLI would need its own npm package + auth flow, out of scope for this pass. |

**Test infra note:** X-3 said "no tests exist anywhere in the repo" — that's now addressed for this feature area: `apps/web` has `vitest` (`pnpm test` / `pnpm test:watch`, `vitest.config.ts`), 28 passing tests under `src/lib/blocks/*.test.ts`. No test infra exists yet for the rest of the app (content/media/team/etc.) — only blocks-related modules are covered so far.

---

## Phase 5 — Polish & scale  ·  `[~]` in progress

> 5.5 (deployment status) and 5.6 (SEO) shipped. 5.1/5.2/5.3/5.4 in active build this session.

| # | Task | Status | Notes |
|---|---|---|---|
| 5.1 | i18n (12 locales) | `[ ]` | In progress — `next-intl` plumbing + English messages + `LocaleSwitcher`; other 11 locales stubbed for translators. |
| 5.2 | GitLab provider | `[ ]` | In progress — abstracting Git behind a `GitProvider` interface + GitLab client. |
| 5.3 | Collaborative cursors (WebSocket presence) | `[ ]` | In progress — `apps/ws-server` (socket.io) + client hook + editor cursors. |
| 5.4 | Shortcode / block editor (MDX components) | `[ ]` | In progress — shortcode insertion (Callout/YouTube/etc.) in the notion-editor body. |
| 5.5 | Deployment status (Vercel/Netlify webhook) | `[x]` | `getLatestDeploymentStatus` reads GitHub Deployments / commit-status that Vercel/Netlify publish (no webhook receiver needed); `GET /api/projects/[id]/deployment` + `DeploymentStatus` in `project-sidebar.tsx` (polls while a build is `pending`, links to the live/log URL). |
| 5.6 | SEO suggestions | `[x]` | `lib/seo/analyze.ts` — client-side 0–100 score + actionable checks (title/description/length/headings/alt/slug); `SeoPanel` modal wired into `entry-editor.tsx`. No AI key required. |

### Phase 5 pending
- [ ] **P5-A** i18n setup (`next-intl`) + locale files.
- [ ] **P5-B** Abstract Git provider behind `GitProvider` interface; add GitLab client (`@gitbeaker/rest`).
- [ ] **P5-C** WebSocket presence + cursors.
- [ ] **P5-D** MDX shortcode/component block editor.
- [x] **P5-E** Deploy-status webhooks (Vercel/Netlify). — **Done** (via GitHub Deployments/commit-status, no receiver needed).
- [x] **P5-F** SEO suggestions on save. — **Done** (`SeoPanel`, live client-side analysis).

---

## Cross-cutting issues (not phase-bound)

- [x] **X-1** **README is out of date.** — **Fixed.** README now lists Phase 0-3 features accurately (incl. dark mode, sort/filter, media picker, list-view toggle).
- [x] **X-2** `.env.example` has `SMTP_*` + `EMAIL_FROM` vars. — **Done** (with P3-D).
- [ ] **X-3** No tests exist anywhere in the repo. Decide on a test strategy (Vitest?) before Phase 4.
- [x] **X-4** No CI/lint gate documented. — **Done.** Added `eslint@^9`, `eslint-config-next@^15.3.3`, `@eslint/eslintrc` + `apps/web/eslint.config.mjs` (flat config, `next/core-web-vitals` + `next/typescript` via `FlatCompat`, matching current `create-next-app` output for Next 15). `pnpm lint` now runs non-interactively and **exits 0** — fixed all 11 pre-existing `Error`-level violations it surfaced (4× `no-explicit-any` in `app/api/projects/route.ts` + `dashboard/page.tsx` + `dashboard/projects/page.tsx` + `lib/auth.ts`, all were unnecessary — removing the annotation let Prisma's inferred return type flow through correctly; 2× in `team/page.tsx` fixed properly by serializing `expiresAt` to ISO string before passing to the client component instead of `as any`-ing past the mismatch; 3× unescaped-entity JSX text; and **one real bug** — `command-palette.tsx` called `useMemo` after a conditional early return, violating Rules of Hooks, fixed by reordering). Remaining ~20 items are `Warning`-level (unused imports, `<img>` vs `next/image`, one `exhaustive-deps`) — pre-existing, don't fail the gate, left as-is; fixing all of them is a separate, much larger cleanup unrelated to "make lint reliable."
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
| 2026-07-16 | cursor | **P2-E backlog note (not built yet):** show **last updated by** (team user) + **last updated at** (date/time) on entry list / editor. Attribute via activity log so Editors are credited correctly. |
| 2026-07-16 | cursor | Added **`THUNDER-COMPONENTS-NPM-MODEL.md`** — architecture proposal to replace folder-scan blocks with npm-installed packages + `thunder.config.ts` registry (defaults/props). Not implemented yet. |
| 2026-07-16 | cursor | Expanded **`THUNDER-COMPONENTS-NPM-MODEL.md` §17** — page editor UX: prop fields on select, content-only blocks, reorder, duplicate/same component multiple times. |
| 2026-07-16 | cursor | **Finalized `THUNDER-COMPONENTS-NPM-MODEL.md`** — TOC, three block tiers, optional `import`, §18 decisions locked, page builder diagram, appendix templates; cross-linked from `COMPONENT-PAGES-PLAN.md`. |

| 2026-07-16 | claude | **Session summary: npm+config blocks Phases A-E + P2-E + P4-H + X-4 all done, Phase 5 deferred per user decision.** Added `vitest` test infra (first in the repo) and `eslint` (first CI-lint gate, non-interactive, exits 0). Shipped 3 new workspace packages (`blocks-config`, `blocks-runtime`, `blocks-marketing` with Hero/FeatureGrid/Cta/Testimonials). `thunder.config.ts` is now a first-class config source (static parser + npm manifest resolver + local-file discovery), config-first with folder-scan fallback, surfaced in the page-builder UI (source badge, warnings, legacy-mode notice) and Project Settings (generate template / migrate existing blocks). Fixed two real latent bugs found along the way: entry-list "Last updated" sort had no effect (P2-E), and `command-palette.tsx` called a hook after a conditional early return (X-4 lint fix). 52/52 tests passing, `tsc --noEmit`/`next build`/`pnpm lint` all clean. See `16-07-Testing.md` for the manual test walkthrough. Phase 5 (i18n/GitLab/WebSocket presence/MDX shortcodes/deploy webhooks/SEO) intentionally not started — user chose to stop and get a tested, documented deliverable rather than a thin pass across six unrelated large features; needs its own dedicated planning session. |
| 2026-07-16 | claude | **npm+config blocks Phase A+B done.** Added `vitest` test infra to `apps/web` (`pnpm test`, `vitest.config.ts` — first test runner in the repo, resolves X-3 for this feature area). Phase A: `BlockImportSpec`/`BlockConfigEntry`/`ThunderBlocksConfig` types + `BlockSource` `"package"` kind (`packages/types`); `lib/blocks/resolve-config.ts` static Babel-AST parser for `thunder.config.ts` (handles literal blocks, local-const spreads, and flags import-identifier spreads as `unresolvedRefs`). Phase B: `lib/blocks/npm-manifest.ts` (pnpm/npm/yarn lockfile version resolution + unpkg-CDN manifest fetch/cache); `resolveConfigDrivenBlocks()` in `lib/blocks/effective.ts` merges config+manifest+local-discovery into `BlockDef[]`; `blocks/effective/route.ts` now prefers `thunder.config.ts` over folder-scan when present, falls back otherwise. 28/28 vitest tests pass. `tsc --noEmit` + `next build` pass. |

| 2026-07-16 | claude | **C-3: real build + real external-install proof.** Added `tsup` builds (dual ESM/CJS + bundled `.d.ts`) to `@thunder/types`/`blocks-config`/`blocks-runtime`/`blocks-marketing`, switched `main`/`exports` to `dist/`. Verified with `pnpm pack` (confirms `workspace:*` → pinned-version rewrite) and a standalone external project installing the four tarballs via `file:` + a documented `pnpm.overrides` workaround for the not-yet-published `@thunder/types` transitive dep — that project's own `tsc --noEmit` and a real render both passed against genuine `node_modules`-resolved packages, no monorepo source involved. `thunder-integration.md` updated with an honest "not published yet" callout in §3 and a step-by-step appendix for reproducing this test. Publishing to a real npm registry is still not done (scope not claimed) — that's the only remaining gap before `pnpm add @thunder/blocks-marketing` works as literally written. |
| 2026-07-20 | claude | **Auth.js → better-auth + SQLite → PostgreSQL (Neon), P0-B done.** `schema.prisma` provider = postgresql (+`directUrl`); auth models reshaped to better-auth (`Verification`, `Account.password`, `Boolean emailVerified`, DB sessions). `lib/auth.ts` = `betterAuth()` (prismaAdapter, emailAndPassword, GitHub `repo` scope, `databaseHooks` for org-bootstrap + GitHub-token sync, `nextCookies`) + back-compat `auth()`; new `lib/auth-client.ts`, `api/auth/[...all]`, `getSessionCookie` middleware; deleted `auth.config.ts`/`[...nextauth]`/`register`/`next-auth.d.ts`. Token encryption: `Account` tokens via better-auth `encryptOAuthTokens` (read back through `getAccessToken`); `Organization.githubAccessToken` via `lib/token-crypto` (symmetric, `BETTER_AUTH_SECRET`). `zod` → ^4. `tsc --noEmit` + `next build` pass; email sign-up/sign-in/session verified live against Neon. |

| 2026-07-30 | claude | **Phase 5 push started — 5.5, 5.6, PR (4.3) landed.** SEO suggestions (`lib/seo/analyze.ts` + `SeoPanel` in the editor, client-side scoring, no AI key). Deployment status (`getLatestDeploymentStatus` off GitHub Deployments/commit-status → `GET .../deployment` + `DeploymentStatus` sidebar widget that polls while building). PR creation re-added (`.../pull-request` route + `PullRequestButton`, staging→default, activity-logged). Full-page `PreviewPanel` in the workspace. `next build` + type-check pass. 5.1/5.2/5.3/5.4 building next this session. |

> **Append a row here every time this file is edited** (see `AGENTS.md`).
