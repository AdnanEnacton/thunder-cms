# AGENTS.md — Working rules for AI agents on thunder-cms

This file gives opencode (and any other AI coding agent) the project-specific rules. **Read it before doing any work.**

## Project context

`thunder-cms` is a Git-based headless CMS (a Sitepins clone). It's a Turborepo + pnpm monorepo: `apps/web` (Next.js 15 App Router) + `packages/database` (Prisma, SQLite in dev) + `packages/types`.

- Master plan: `SITEPINS-CLONE-PLAN.md` (phases 0–5, full feature inventory).
- Blueprint: `sitepins-clone-blueprint.md`.
- **Live status of every phase and pending task: `PROGRESS-TRACKER.md`.** This is the single source of truth for what is done vs pending. **Do not re-audit the codebase to find out what's left — read the tracker first.**

## The one rule that matters most

### ALWAYS keep `PROGRESS-TRACKER.md` in sync

Every time you make a change that affects build status, you **must** update `PROGRESS-TRACKER.md` in the same change. No exceptions.

Specifically, update the tracker whenever you do any of the following:

1. **Start** a pending task (`[ ]` → `[~]`, move it to an "in progress" note).
2. **Complete** a task or sub-item (`[~]`/`[ ]` → `[x]`).
3. **Block** a task (add a `[!]` and a one-line note on the blocker).
4. **Discover** a new pending item, bug, or deviation during work (add a row under the right phase + a `P#-X` pending bullet).
5. **Change** the scope/plan of a phase (edit the phase's table + summary %).
6. **Fix a bug** that was listed as a pending bullet — mark it done and remove the bullet (or strike it).

When you edit the tracker:

- Keep the table format intact (markdown tables, `[x]`/`[~]`/`[ ]`/`[!]` legend).
- Update the phase's **Status** and **%** in the Phase summary table at the top.
- If a whole phase moves status (e.g. Phase 3 goes `[~]` → `[x]`), update the summary row.
- **Always append a row to the "Changelog (tracker updates)" table at the bottom** with today's date, your agent name/handle, and a short summary of what changed.
- If you don't know the exact status, mark `[~]` and add a note rather than guessing `[x]`.

### Verification before marking `[x]`

Do not mark a task `[x]` from intent alone. Confirm by at least one of:
- the code file exists and is wired into a route/component the user can reach,
- a build/lint/typecheck passes for the changed code,
- a test (if any) passes.

If only the code exists but it's not reachable/wired, mark `[~]` with a note.

## Where things live (quick map)

| Area | Path |
|---|---|
| Auth | `apps/web/src/lib/auth.ts`, `auth.config.ts`, `app/api/auth/*`, `middleware.ts` |
| Git integration | `apps/web/src/lib/github.ts`, `github-token.ts`, `org-github.ts`, `app/api/github/*` |
| Setup wizard | `apps/web/src/components/setup-wizard.tsx`, `app/api/projects/[id]/configure/route.ts` |
| Content | `apps/web/src/lib/content/*`, `app/api/projects/[id]/content/*`, `components/content/*` |
| Editor (visual+md) | `apps/web/src/components/content/notion-editor/*` (custom, NOT TipTap) |
| Media | `apps/web/src/lib/media/*`, `app/api/projects/[id]/media/*`, `components/project/media-library.tsx` |
| Team / RBAC | `apps/web/src/lib/rbac.ts`, `project-auth.ts`, `app/api/projects/[id]/team/*`, `app/api/invite/*` |
| Activity log | `app/api/projects/[id]/activity/route.ts`, `app/dashboard/projects/[id]/activity/page.tsx` |
| Config files | `components/project/config-file-editor.tsx`, `app/api/projects/[id]/configs/*`, `lib/config/scan.ts` |
| Branch targeting / PRs | `lib/github.ts` (listBranches/createBranch/createPullRequest), `app/api/projects/[id]/branches/route.ts`, `app/api/projects/[id]/pulls/route.ts`, `components/project/branch-selector.tsx`, `lib/project-auth.ts` `getProjectBranch` |
| Version history | `lib/github.ts` (listCommitsForFile/getFileAtRef), `app/api/projects/[id]/content/entry/history|restore/route.ts`, `components/content/version-history.tsx` |
| Live preview | `previewUrl` column, `app/api/projects/[id]/route.ts`, preview pane in `components/content/entry-editor.tsx` |
| Cmd+K search | `components/command-palette.tsx`, `app/api/projects/[id]/search/route.ts` |
| AI assistant | `lib/ai/client.ts`, `components/content/ai-assistant.tsx`, `components/ai-key-settings.tsx` |
| DB schema | `packages/database/prisma/schema.prisma` |
| Shared types | `packages/types/src/index.ts` |

## Conventions

- **No comments** in code unless explicitly requested.
- Config dir in repos is `.thunder/` (not `.sitepins/`).
- Follow existing code style in the file you're editing; use the libraries already in `apps/web/package.json` (do **not** introduce a new library without checking first).
- Prisma is SQLite in dev — avoid Postgres-only features until the X-1/P0-B migration happens.
- Run `pnpm lint` and `pnpm build` (or the relevant workspace lint/typecheck) after non-trivial changes; fix what you broke before marking a tracker item `[x]`.

## Don'ts

- Do **not** commit unless the user explicitly asks.
- Do **not** re-audit the whole codebase to answer "what's pending" — read `PROGRESS-TRACKER.md`. Only re-audit a specific area if you suspect the tracker is stale, and if it is, fix the tracker.
- Do **not** edit `SITEPINS-CLONE-PLAN.md` or `sitepins-clone-blueprint.md` as a status tracker — those are the *plan*, the *tracker* is `PROGRESS-TRACKER.md`.
- Do **not** mark README claims as truth — verify against code; the README is known to drift (e.g. it currently claims dark mode which does not exist).

## Suggested next work order (from the tracker)

Phase 4 is **done**. Remaining polish/next-phase items:

1. **P3-E** Improve conflict UX (on 409, offer Reload/Discard/Overwrite instead of bare toast).
2. **P4-H** Wire custom commit messages + branch targeting into config-file save and media upload (entry save only today).
3. **P2-B** Pagination on `entries/route.ts` GET.
4. **P4-E2** Real-time draft preview (preview worker) — current preview shows deployed staging site only.
5. **X-4** Set up ESLint config (`eslint-config-next` + `.eslintrc`) so `pnpm lint` runs non-interactively.
6. Then start **Phase 5** (begin with P5-A i18n or P5-B GitLab provider).

> Note: the dev server was stopped to run the Prisma migration (`+targetBranch`, `+previewUrl`). Run `pnpm dev` to restart.
