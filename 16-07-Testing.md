# 16-07-Testing.md — Manual Test Guide

> Everything below was built in the 2026-07-16 session implementing `THUNDER-COMPONENTS-NPM-MODEL.md`
> Phases A–E, plus P4-H, P2-E, and X-4 from `PROGRESS-TRACKER.md`. Phase 5 (i18n, GitLab provider,
> WebSocket presence, MDX shortcodes, deploy webhooks, SEO) was **explicitly deferred** to its own
> session per your decision — nothing below covers it.
>
> Automated tests (52/52) and `tsc --noEmit` / `next build` / `pnpm lint` all pass as of this write-up.
> This doc is for **you to click through manually** and confirm the UI actually behaves as intended —
> automated tests don't catch everything (see `AGENTS.md`: "Type checking and test suites verify code
> correctness, not feature correctness").

---

## 0. Before you start

```bash
pnpm install        # picks up new packages: blocks-config, blocks-runtime, blocks-marketing, eslint
pnpm db:generate     # regenerate Prisma client if you haven't already this session
pnpm dev             # starts apps/web on http://localhost:3000
```

You'll need one **GitHub-connected, configured Thunder project** to test most of this (Phases A, B, D,
E, P4-H, P2-E all touch a real repo). If you don't have one, run through the dashboard's "New project"
flow first and connect a small test repo you don't mind Thunder committing to (it will commit real
files like `thunder.config.ts`).

---

## 1. Automated checks (run these first — fastest way to catch regressions)

```bash
pnpm test     # turbo test — vitest across apps/web + packages/blocks-config/-runtime/-marketing
pnpm lint     # next lint (apps/web) — should exit 0 (warnings are OK, errors are not)
pnpm build    # next build (apps/web) — should complete with no type errors
```

**Expected:**
- `pnpm test` → 4 tasks successful, **52/52 tests passing** (blocks-config 5, blocks-runtime 4,
  blocks-marketing 6, apps/web 37 — includes the two `e2e-npm-model.test.tsx` tests that prove a real
  `thunder.config.ts` + the real `@thunder/blocks-marketing` package resolve and render end to end).
- `pnpm lint` → exits 0. You'll see a page of `Warning`s (unused imports, `<img>` vs `next/image`) —
  those are pre-existing and fine. Any `Error` means something regressed.
- `pnpm build` → completes, prints the route table, no red text.

If any of these fail, stop and report back before doing the manual steps below — the manual steps
assume a working build.

---

## 2. Phase A + B — `thunder.config.ts` parsing & npm block resolution

**What it does:** Thunder now reads `thunder.config.ts` from your repo root (if present) to build the
block palette, instead of only scanning your components folder. Falls back to folder-scan when absent.

### 2.1 Folder-scan fallback (baseline — should be unchanged behavior)
1. Open a project that has **no** `thunder.config.ts` in its repo, with some components in its
   configured components folder (Project Settings → "Components folder").
2. Open any Component Page (or create one) → the page builder should open.
3. **Expect:** left palette shows your components as blocks, with a muted **"Folder scan (legacy) —
   set up thunder.config.ts in Settings"** banner at the top of the palette.

### 2.2 Config-driven resolution (local block)
1. In your test repo, add a small React or Astro component, e.g.
   `src/components/blocks/BrandHero.tsx`:
   ```tsx
   export interface Props {
     heading: string;
     image?: string;
   }
   export default function BrandHero({ heading, image }: Props) { return null; }
   ```
2. Commit a `thunder.config.ts` at the repo root:
   ```ts
   export default {
     blocks: [
       { key: "brandHero", label: "Brand hero", import: { from: "./src/components/blocks/BrandHero.tsx" } },
     ],
   };
   ```
3. Reload the page builder for that project.
4. **Expect:** the palette header shows a **green "thunder.config.ts" badge** (not the folder-scan
   banner). "Brand hero" appears in the palette with fields `heading` (required) and `image` —
   discovered straight from your component's `Props` type, same as folder-scan would, but now sourced
   from the config file instead of scanning the whole folder.

### 2.3 Broken config → warnings surface in the UI (not a silent failure)
1. Edit `thunder.config.ts` to introduce a mistake, e.g. remove the `blocks` key entirely:
   `export default {};`
2. Commit it, reload the page builder.
3. **Expect:** an amber warning banner appears in the palette (e.g. "Missing required `blocks`
   array"). The palette should not crash — it should show whatever registry-override blocks exist (or
   be empty) rather than erroring.
4. Revert to a working config when done.

### 2.4 npm package block resolution — **honest caveat**
`@thunder/blocks-marketing` is not published to the real npm registry, so Thunder's production
manifest-fetch path (`registry.npmjs.org` via `unpkg.com`) has nothing real to resolve against from an
external repo — you can't yet point a real GitHub project's `thunder.config.ts` at it and watch Thunder
fetch the live manifest. This path **is** covered two ways already: (1) automated tests with a mocked
fetch returning the actual `blocks.manifest.json` content, and (2) a real `pnpm add`-style install
(tarballs installed via `file:` into a project genuinely outside this repo — see
`thunder-integration.md`'s appendix) proving the *package* itself works correctly once installed. What's
still unverified is the live HTTP fetch from `unpkg.com` against a real published version — that needs
an actual `npm publish` (or a private registry), which hasn't happened yet.

---

## 3. Phase C — `@thunder/blocks-config`, `@thunder/blocks-runtime`, `@thunder/blocks-marketing`

These are new workspace packages under `packages/`. No standalone UI — verify via:

1. `pnpm --filter @thunder/blocks-marketing test` → Hero, FeatureGrid, Cta, Testimonials all render
   real HTML via `react-dom/server` (6 tests).
2. `pnpm --filter @thunder/blocks-runtime test` → `createBlocksRenderer` merges `defaults → content →
   props` in the documented precedence order (4 tests).
3. `pnpm --filter @thunder/blocks-config test` → `defineThunderConfig`/`validateThunderConfig` schema
   checks (5 tests).
4. Read `apps/web/src/lib/blocks/e2e-npm-model.test.tsx` — this is the closest thing to a "does the
   whole install→config→edit→render story actually work" proof without a live npm registry. Run it
   individually to watch it pass: `pnpm --filter @thunder/web exec vitest run src/lib/blocks/e2e-npm-model.test.tsx`

---

## 4. Phase D — Config-driven blocks UX in Project Settings

1. Go to **Dashboard → your project → Settings**.
2. Scroll to the **"Config-driven blocks (npm model)"** card.
3. If no `thunder.config.ts` exists yet:
   - **Expect:** "No thunder.config.ts yet — the page builder is falling back to scanning the
     components folder." with two buttons: **Generate starter template** and **Migrate existing
     blocks**.
   - Click **"Preview template"** — expect a collapsible `<pre>` showing the full starter config
     (hero/featureGrid/richText blocks + a "component" page type).
4. Click **Generate starter template**.
   - **Expect:** button shows a spinner, then the card switches to "thunder.config.ts found in your
     repo — the page builder is reading blocks from it. Committed `<sha>`."
   - Check your repo on GitHub: a new commit `chore: add thunder.config.ts` should exist at the repo
     root.
5. Open the page builder for any page in that project.
   - **Expect:** palette shows the green `thunder.config.ts` badge and the three starter blocks
     (Hero, Feature grid, Rich text section).

---

## 5. Phase E — Migrate existing blocks + folder-scan deprecation notice

1. Start from a project with **components discovered via folder-scan** (no `thunder.config.ts` yet,
   real components in the components folder, ideally with a registry override or two set via the
   page-builder's block edit dialog).
2. Go to **Settings → Config-driven blocks** → click **Migrate existing blocks**.
   - **Expect:** success, `thunder.config.ts` committed with message `chore: migrate folder-scan
     blocks to thunder.config.ts`.
3. Open the committed file on GitHub (or via the config editor — see §6.3) and check:
   - Each discovered component appears as a `blocks[]` entry with `import: { from: "./<path>" }` and
     its **actual discovered fields inlined** (not empty — nothing should be lost).
   - Any manual (non-component) blocks from your registry appear as content-only entries (no `import`
     key, `fields` present).
   - Built-in page types (`markdown`, `component`) are **not** in the `pageTypes` array; any custom
     page type you'd created **is**.
4. Reload the page builder → palette should now show the green config badge with the migrated blocks
   (should look identical to what folder-scan showed before, since nothing was supposed to change).
5. **Deprecation notice check:** go find (or make) a *different* project that still has no
   `thunder.config.ts` → its palette should show the muted "Folder scan (legacy)…" banner from §2.1.
   Folder-scan itself should still work — it's a notice, not a removal.

---

## 6. P4-H — Commit messages + branch targeting on config-file save & media upload

Set this up first: **Settings → Commit messages → "Ask me before each save"** (this is
`commitMessageMode: "custom"`).

### 6.1 Media upload now prompts for a commit message
1. Go to the project's **Media library**.
2. Click **Upload**, pick one image file.
3. **Expect:** a **"Commit message"** dialog pops up, pre-filled with `Upload: "yourfile.png"`
   (not the generic `Update: "..."` text — confirms the `defaultMessage` prop fix).
4. Edit the message, click **Save & commit**.
5. Check the commit on GitHub — message should match exactly what you typed.
6. Try uploading **multiple files at once** → dialog default should say `Upload N files`.

### 6.2 Switch back to "Auto-generate" mode
1. Settings → Commit messages → **"Auto-generate"**.
2. Upload a file again.
3. **Expect:** no dialog — uploads immediately, commit message is the auto `Upload: "..."` text.

### 6.3 Config-file editor also respects the setting
1. Switch back to **"Ask me before each save"**.
2. Open a config file in the project (Project → Configs tab → pick a `.json`/`.yaml`/`.ts` file — this
   also works for editing `thunder.config.ts` itself if it's listed in your configured config paths).
3. Change a value, click **Save changes**.
4. **Expect:** the same Commit message dialog appears (pre-filled `Update: "<filename>"`), and your
   typed message becomes the actual Git commit message.
5. Confirm **branch targeting** still works throughout: if the project has a non-default target branch
   set (Branch selector in the sidebar), all of the above commits should land on that branch, not
   `main` — check on GitHub.

---

## 7. P2-E — Last updated by / when

1. As two different team members (or just note the account you're using), edit and save the **same
   entry** twice.
2. Go to the **entry list** (content panel) for that collection.
   - **Expect:** the row for that entry shows `<Name> · <Mon D>` instead of the old raw frontmatter
     date — sourced from the activity log, not the Git commit author.
3. Change the **sort dropdown** to **"Last updated"** (should already be the default).
   - **Expect:** entries actually reorder by this data now. (Before this session, "Last updated" was
     the default sort option but had no real effect — this was a latent bug, now fixed.)
4. Open that entry in the editor.
   - **Expect:** the header under the title shows `Updated by <Name> on <Month D, Year>` next to the
     file path.
5. Save the entry again → the header's "Updated by/on" text should refresh immediately to reflect the
   new save, without a full page reload.
6. **Attribution check (the actual point of this feature):** if a second Thunder user (an invited
   Editor, not the Git-connected owner) saves the entry, the displayed name should be **that Editor's
   Thunder account name**, not the Git App/owner's GitHub commit author. This is the part worth double
   checking with two real accounts if you have them.

---

## 8. X-4 — ESLint gate

1. Introduce a deliberate lint error to confirm the gate actually catches things, e.g. in any `.tsx`
   file add: `const x: any = 1;`
2. Run `pnpm lint`.
   - **Expect:** non-zero exit, prints `Error: Unexpected any...` for that line.
3. Revert the change, re-run `pnpm lint` → back to exit 0.
4. Optional: try `pnpm lint` from a fresh terminal to confirm it **never prompts for input** (the
   original bug — `next lint` used to ask to auto-create a config on first run). It shouldn't ask
   anything now that `eslint.config.mjs` exists.

---

## 9. Regression pass — things that existed before this session and should be unaffected

Since several shared files changed (`entry-editor.tsx`, `content-panel.tsx`, `command-palette.tsx`,
`media-library.tsx`), spend a few minutes on:

- **Cmd+K search** still opens/closes correctly and searches entries (this file's `command-palette.tsx`
  had a real hooks-ordering bug fixed — worth confirming the palette doesn't throw a console error when
  you open it, type, then close it, then reopen it a few times in a row).
- **Entry save without custom commit messages** (auto mode) still works normally — no dialog, no
  extra clicks, same as before.
- **Version history / rollback**, **conflict dialog (409 on stale save)**, and **AI assistant** in the
  entry editor still open and function (none of these were touched, but they share the header/toolbar
  area that did change).
- **Media delete** (not upload) still works with the plain confirm dialog — delete wasn't given a
  commit-message prompt (intentionally, to match how entry delete already behaves — see
  `PROGRESS-TRACKER.md` P4-H notes for why).

---

## Known gaps / things intentionally not covered here

- **Phase 5** (i18n, GitLab provider, WebSocket presence, MDX shortcodes, deploy webhooks, SEO) —
  not started, deferred to a dedicated session per your decision.
- **A setup-wizard step** for `thunder.config.ts` — descoped in Phase D; the wizard still only asks
  about content/media/optional paths. Config-driven blocks are discoverable via Project Settings only.
- **A live "browse @thunder/* packages" picker** — descoped; would need a real npm-search backend.
- **Publishing `@thunder/blocks-marketing` to a real registry** — needed to manually exercise the
  production npm-manifest-fetch path end to end against an external repo (see §2.4).
