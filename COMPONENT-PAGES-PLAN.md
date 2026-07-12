# Thunder CMS — Component-Based Pages Plan

> How Thunder goes from "edit markdown files in a Git repo" to "visually compose real pages
> out of your own components" — and why a new user picks Thunder over TinaCMS, StudioCMS, or Sitepins.

**Status:** Proposal / architecture plan — key decisions locked (see §13)
**Author context:** Requested 2026-07-11
**Related docs:** `SITEPINS-CLONE-PLAN.md`, `PROGRESS-TRACKER.md`, `AGENTS.md`

> ## ✅ Implementation status — all phases delivered (2026-07-12)
>
> All four phases are implemented and verified (`tsc --noEmit` clean, `next build` clean, plus
> standalone unit tests for the core logic). Highlights of what shipped:
>
> - **Phase 0** — `BlockDef`/`BlockFieldDef`/`PageTypeDef`/`BlockRegistry` types
>   (`packages/types/src/index.ts`); `Project.blockRegistry` + `Project.pageTypes` JSON columns
>   (migrated via `prisma db push`); registry read/write API (`/api/projects/[id]/blocks`);
>   `lib/blocks/registry.ts`; schema-driven `VisualValueEditor` (opt-in via `blockFields`, falls back
>   to inference); registry-aware `SectionAccordion`. *Verified: 26/26 registry-contract tests.*
> - **Phase 1** — page-type picker in the New Page flow; the 3-column **page builder**
>   (`components/content/page-builder/`: palette · canvas · field panel) writing to
>   `frontmatter.blocks[]`; add/reorder/duplicate/delete; manual **block-type authoring** dialog;
>   `entry-editor` routes to the builder for component pages; **live-preview iframe removed**.
>   *Verified: gray-matter round-trip of a component page.*
> - **Phase 2** — `lib/blocks/discover.ts` (thin `@babel/parser` AST reader, Astro + React only);
>   scan API (`/api/projects/[id]/blocks/scan`); "Scan components" review dialog that writes proposed
>   blocks into the registry. *Verified: parser tests over real React/Astro components.*
> - **Phase 3** — custom **page types** (allowedBlocks + seeded fields) with a management dialog;
>   **renderer scaffolding** (`lib/blocks/render-gen.ts` → generates the `<Blocks>` component for
>   Astro or React, with copy + commit-to-repo via `/api/projects/[id]/blocks/renderer`).
>   *Verified: 20/20 renderer-generator tests.*
>
> Deferred (noted, not built): `mdx-body` storage (dropped by decision #4), visual-selector
> thumbnails, cross-page block presets, and AI "describe the page → assemble blocks".
>
> ---
>
> **Decisions locked (2026-07-11):** (1) Discovery uses a **thin AST reader, Astro + React only** —
> those are the only two frameworks we target for blocks. (2) **No live preview anywhere in Thunder** —
> we are not building it and the existing live-preview iframe gets removed. (3) Block field editing
> **extends `visual-value-editor.tsx` in place** (pass an optional `BlockDef` down). (4) Storage is
> **frontmatter `blocks[]`** — this is the only mode; `mdx-body` is dropped from scope. (5) Phase 1
> ships **fully manual**; discovery is the Phase 2 "wow". Full rationale in §13.

---

## 1. The problem we're solving

Today a Thunder user can create a **new page**, but a "page" is just a markdown/MDX file:
frontmatter fields on the left, a markdown body on the right. There is no way to say:

> "Create a new landing page, drop in a **Hero**, then a **Feature Grid**, then a **Testimonials**
> block — the same components that already exist in my project's codebase."

That is the single biggest thing Tina and Studio can do that we can't. This plan closes that gap
and, crucially, does it in a way that is **easier and more honest** than either of them.

---

## 2. Where Thunder is *today* (grounded in the actual code)

This matters because we are not starting from zero — we already have ~70% of a block system,
it's just implicit.

| Capability | Where it lives today | State |
|---|---|---|
| Content = Git files (md/mdx/json/yaml) | `apps/web/src/lib/content/parser.ts`, `scan.ts` | ✅ Solid |
| Frontmatter fields inferred at read-time | `lib/content/schema.ts` `inferFieldsFromEntries()` | ✅ Works, but no stored schema |
| Recursive nested-object form editor | `components/content/visual-value-editor.tsx` | ✅ Strong foundation |
| Control-kind inference (text/image/url/toggle…) | `lib/content/field-ui.ts` `inferControlKind()` | ✅ Reusable |
| **Proto-block convention: `frontmatter.sections[]` + `_template`** | `components/content/section-accordion.tsx`, `field-ui.ts` `collectTemplateOptions()`, `getSectionDisplayName()` | ⚠️ **Inferred, never defined** |
| Repeatable list heuristic (`features`, `cards`, `testimonials`…) | `field-ui.ts` `LIST_ARRAY_KEYS`, `isListArrayField()` | ⚠️ Hard-coded guesses |
| Body editor (Notion-style, contentEditable→markdown) | `components/content/notion-editor/` | ✅ For prose, not composition |
| Shared types | `packages/types/src/index.ts` | Single file, easy to extend |

**The key insight:** Thunder already renders a page's `sections[]` array as an accordion of
templated blocks. What's missing is a **definition** for each block (what `_template: "hero"`
*means*, what fields it has, what it looks like) and a **builder UI** to add/reorder/pick them
visually. We are formalizing something that already exists, not inventing a new subsystem.

---

## 3. How the competition does it (and where they hurt)

### TinaCMS — blocks via hand-written schema + hand-written renderers
- You define blocks in a TypeScript config as an `object` field with `list: true` and a
  `templates: [...]` array. Each template has `name`, `label`, `fields`.
- Data is stored in frontmatter/MDX as a list; each item carries a `__typename`
  (`PagesBlocksHero`).
- **The developer must write two things by hand:** (1) the block schema, and (2) a React
  `<Blocks>` component with a `switch` statement mapping each `__typename` to a component.
- Editing is a great side-by-side visual experience *once it's wired up*.
- **Where it hurts:** significant dev setup, GraphQL layer, you maintain the schema **and** the
  renderer separately from your actual components — they drift. Non-devs can't add a new block type.

### StudioCMS — Astro-only, plugin/component registry
- Astro-native, stores data in remote **libSQL**. Extensible plugin system with custom **page
  types**, dashboard widgets, and a **component registry** (`studiocms:component-registry`) for
  user-defined components.
- Nice dashboard UX (the UI you liked).
- **Where it hurts:** **locked to Astro**. If your project isn't Astro, it's a non-starter.
  Content lives in their DB, not your Git repo. Registering components is a code/plugin exercise.

### Sitepins — markdown only
- Clean Git-backed markdown editing (this is the model Thunder already matches). **No
  component/page composition at all.** Explicitly out of scope for them.

### The gap on the table

| | Tina | Studio | Sitepins | **Thunder (target)** |
|---|---|---|---|---|
| Component/block pages | ✅ | ✅ | ❌ | ✅ |
| Framework-agnostic | ⚠️ (React-ish) | ❌ Astro only | ✅ | ✅ **Astro/Next/Nuxt/SvelteKit/Hugo…** |
| Git-backed (your repo, your files) | ✅ | ❌ (libSQL) | ✅ | ✅ |
| Content readable by *any* framework | ✅ | ❌ | ✅ | ✅ (plain frontmatter `blocks[]`) |
| **Blocks auto-discovered from *your* components** | ❌ hand-written | ❌ registered | ❌ | ✅ **← our wedge (Astro + React)** |
| Non-dev can add a block type | ❌ | ❌ | n/a | ✅ (from UI) |
| Zero GraphQL / build step to edit | ❌ | ✅ | ✅ | ✅ |

---

## 4. Our wedge: **"Your components, discovered — not re-declared."**

This is the one-line reason to choose Thunder.

- Tina makes you *re-declare* your components as schema, then *re-declare* them again as a
  renderer. Two sources of truth that drift.
- Studio makes you *register* components inside an Astro plugin.
- **Thunder reads your real component files** (`Hero.astro`, `Hero.tsx` — Astro & React, the two
  frameworks we target), infers each component's props into a block schema, and lets editors drop
  those blocks onto a page — writing back into the **same Git files** your framework already renders.

You don't maintain a schema. Your components *are* the schema. Change a prop in `Hero.tsx` and the
block's fields update. That's the story no competitor tells.

We ship this in two layers so it works on day one and gets magical over time:

1. **Config-defined blocks** (reliable, explicit) — a `thunder.config` block registry. Works
   always, framework-agnostic, is the storage/contract layer.
2. **Auto-discovered blocks** (the wow) — a scanner that parses real component files and
   *proposes* block definitions that get written into that same registry, editable in the UI.

---

## 5. Core concepts we're introducing

Two new first-class nouns, both surfaced in the UI the way StudioCMS does it.

### 5.1 Page Type (chosen at "New Page" time)
When creating a page, the user picks a **type** — exactly the StudioCMS moment you liked:

- **📝 Markdown Page** — today's experience (frontmatter + prose body). Unchanged.
- **🧱 Component Page** — a page composed of blocks. Body is optional; the page *is* a stack of blocks.
- **📄 Custom Page Type** — a named template (e.g. "Blog Post", "Landing Page") that pre-seeds
  fields + an allowed set of blocks. (Phase 3.)

### 5.2 Block (a.k.a. Component instance)
A block is one entry in a page's `blocks[]` array. It has a `_template` (which component) and its
field values. This is a direct, formalized evolution of today's `sections[] + _template`.

```yaml
# a Component Page stored as Markdown/MDX frontmatter — same Git file model as today
---
title: Home
type: component            # NEW: page type discriminator
blocks:                    # formalized sections[]
  - _template: hero
    heading: Build faster with Thunder
    subheading: The Git-native CMS
    image: /media/hero.png
    cta:
      label: Get started
      href: /signup
  - _template: featureGrid
    columns: 3
    features:
      - { title: Fast, icon: bolt, body: "…" }
      - { title: Open, icon: git,  body: "…" }
  - _template: testimonials
    items:
      - { quote: "…", author: Jane }
---
```

> We keep the canonical store as **frontmatter in the same md/mdx file** because it's 100% compatible
> with today's parser (`parseContentFile`/`serializeContentFile`), the version history, the conflict
> lock on `sha`, and every framework's existing data-loading. No DB migration. No new storage engine.
> (Optional MDX-body mode in §8.3 for teams that want inline components.)

---

## 6. The block registry (the contract)

A new optional section in the Thunder config (extends `ThunderConfig` in
`packages/types/src/index.ts`). This is what turns an *inferred* `_template` into a *defined* block.

```ts
// packages/types/src/index.ts  (additions)

export type BlockFieldType =
  | FieldType                       // reuse existing: string|text|number|boolean|date|tags|image|json
  | "select" | "url" | "object" | "array" | "reference" | "richtext" | "color";

export interface BlockFieldDef {
  name: string;
  label: string;
  type: BlockFieldType;
  required?: boolean;
  default?: unknown;
  options?: string[];               // for select
  of?: BlockFieldDef;               // for array item shape
  fields?: BlockFieldDef[];         // for object
  help?: string;
}

export interface BlockDef {
  key: string;                      // === _template value, e.g. "hero"
  label: string;                    // "Hero"
  category?: string;                // "Marketing" | "Layout" | "Content" — for the block picker groups
  icon?: string;                    // lucide name or emoji
  previewImage?: string;            // Tina-style visual selector thumbnail
  description?: string;
  fields: BlockFieldDef[];
  // provenance — how this block got here:
  source?: { kind: "manual" } | { kind: "component"; file: string; export?: string };
}

export interface PageTypeDef {
  key: string;                      // "landing", "blogPost"
  label: string;
  storage: "frontmatter" | "mdx-body";   // where blocks live (see §8.3)
  allowedBlocks?: string[];         // block keys; empty/undefined = all
  fields?: BlockFieldDef[];         // page-level frontmatter fields (title, seo…)
}

export interface ThunderConfig {
  // …existing…
  blocks?: BlockDef[];              // NEW: the registry
  pageTypes?: PageTypeDef[];        // NEW
}
```

Persisted as JSON on the `Project` row (mirrors how `contentRoots`/`configPaths` already work —
`packages/database/prisma/schema.prisma`). **No new tables required.** Add nullable
`Project.blockRegistry String?` (JSON) and `Project.pageTypes String?`.

Rendering contract stays identical to Tina's proven pattern, but we can **generate** the renderer:
`_template` → component. Because we know the source file, Thunder can scaffold the `<Blocks>`
switch component for the user's framework (§8.4) instead of making them write it.

---

## 7. Auto-discovery of components (the differentiator)

A new scanner: `apps/web/src/lib/blocks/discover.ts`, sibling to `lib/content/scan.ts`.

**Input:** the project's component directory (we already know the framework via
`lib/framework.ts` and the repo via Octokit).

**Framework scope (locked): Astro + React only.** These are the only two component formats
discovery targets. Vue/Svelte are explicitly out of scope — if we ever add them they follow the same
extractor shape, but nothing in v1–v3 depends on them.

**Parser choice (locked): a thin AST reader, not `ts-morph`.** Use `@babel/parser` (with the
`typescript` + `jsx` plugins) plus small custom visitors to pull prop names, types, and JSDoc.
Rationale: `ts-morph`/the full TS compiler API is heavier, slower to boot, and gives us far more than
we need for two well-understood file shapes. A focused visitor over the two prop-declaration patterns
below is lighter, easier to reason about, and fast enough to run on demand against the Git tree.

**Extract `{ componentName, props[] }`:**
- **React / Next (`.tsx`)** — parse the component's `Props` `interface`/`type` (and JSDoc on each
  member); fall back to `PropTypes` when no types are present.
- **Astro (`.astro`)** — read the frontmatter `interface Props { … }`.

**Map prop types → `BlockFieldDef`** by reusing the exact heuristics we already have in
`field-ui.ts` (`inferControlKind`, `isImageFieldKey`) so image/url/textarea detection is consistent
with the current editor. `string` → text, `number` → number, `boolean` → toggle, union of string
literals → select with options, nested object → object, array → array, etc.

**Output:** proposed `BlockDef[]`. Shown to the user in a review screen ("We found 12 components —
pick which become blocks, tweak labels/fields"). Accepted ones are written into the registry with
`source: { kind: "component", file }`.

This makes the value proposition concrete: **point Thunder at your repo → get a block palette of
your own components in minutes, no schema authoring.** Neither Tina nor Studio does this.

> Scope guard: v1 discovery is best-effort and always user-reviewed — never silently authoritative.
> Manual registry entries always win. This keeps a bad parse from breaking anyone's editing.

---

## 8. The editor UX (the part you care most about)

Goal: match StudioCMS's polish, beat it on ease. Reuse existing components heavily.

### 8.1 New Page flow — pick a Page Type
Extend the current "create entry" flow (POST in
`app/api/projects/[id]/content/entries/route.ts` + its dialog). Add a type picker card grid:

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  📝         │  │  🧱         │  │  📄         │
│  Markdown   │  │  Component  │  │  Landing    │
│  Page       │  │  Page       │  │  (custom)   │
└─────────────┘  └─────────────┘  └─────────────┘
```

Choosing **Component Page** seeds a file with `type: component` and an empty `blocks: []`.

### 8.2 The block-based page builder (main new surface)
New component `components/content/page-builder/` used by `entry-editor.tsx` when
`frontmatter.type === "component"` (else fall back to today's split-pane editor).

Layout — a middle "canvas" column (this is the StudioCMS feel):

```
┌────────────┬──────────────────────────┬────────────────┐
│  BLOCKS     │      PAGE CANVAS         │   FIELD PANEL   │
│ (palette)   │  ┌────────────────────┐  │  (selected      │
│             │  │ ▓ Hero            ⋮│  │   block's       │
│ ▸ Marketing │  ├────────────────────┤  │   fields, via   │
│   Hero      │  │ ▓ Feature Grid    ⋮│  │   the existing  │
│   CTA       │  ├────────────────────┤  │   Visual-       │
│ ▸ Content   │  │ ▓ Testimonials    ⋮│  │   ValueEditor)  │
│   RichText  │  │  + Add block       │  │                 │
│   Gallery   │  └────────────────────┘  │                 │
└────────────┴──────────────────────────┴────────────────┘
```

- **Palette (left):** blocks from the registry, grouped by `category`, with icon/thumbnail —
  Tina-style visual selector. Drag onto canvas, or click "+ Add block" → searchable menu (reuse the
  slash-menu pattern from `notion-editor/block-menu.tsx`).
- **Canvas (middle):** ordered list of block cards. Drag to reorder, duplicate, delete, toggle
  visibility. Each card shows a compact block preview (title/first field). This is literally an
  upgraded `section-accordion.tsx`.
- **Field panel (right):** selecting a block edits its fields with the **existing**
  `visual-value-editor.tsx` + `field-input.tsx`, but now **driven by the block's `BlockDef.fields`**
  (defined schema) instead of pure inference. When a field has no def, we fall back to inference —
  so it degrades gracefully to today's behavior.
  **Decision (locked): extend `visual-value-editor.tsx` in place** — thread an optional `BlockDef`
  (or per-field `BlockFieldDef`) down as a prop; when present it drives labels/controls/ordering,
  when absent the current inference path runs unchanged. This keeps one editor to maintain (good for
  us) and one consistent editing experience across markdown and component pages (good for the user),
  rather than forking a second schema-driven variant that would drift.

Everything writes back into `frontmatter.blocks[]` and commits through the **same**
`entry/route.ts` PUT path (serialize → `commitFile` → activity log → sha conflict handling). Zero
new storage plumbing.

### 8.3 Storage: frontmatter only (locked)
Blocks live in the file's frontmatter `blocks[]` as shown in §5.2. **This is the only storage mode.**
Best DX, framework-agnostic, and fully compatible with today's parser
(`parseContentFile`/`serializeContentFile`), version history, and the `sha` conflict lock.

`mdx-body` (blocks as inline MDX tags in the body) is **dropped from scope** — it would require an
MDX AST layer (`remark-mdx`/`mdast`) and a new inline block node in the Notion editor for marginal
benefit. `PageTypeDef.storage` can stay in the type as a forward-compat field but only `"frontmatter"`
is implemented; there is no UI to choose anything else.

### 8.4 No live preview (locked) — generated renderer instead
- **Thunder does not provide live preview — anywhere.** We are not building a preview surface for
  component pages, and the **existing live-preview iframe in `entry-editor.tsx` is removed** as part
  of this work (it applies to markdown pages today; the decision is no live preview across the
  product). The builder communicates state through the block cards on the canvas (title / key fields
  / block label + icon), not a rendered page.
- **Scaffold the renderer for them instead:** a "Copy renderer" / "Add to repo" action generates the
  framework-appropriate `<Blocks>` switch component (Astro or React) from the registry, so the page
  renders on **their** site where it belongs. The user sees the true result by running their own
  framework — Thunder's job is editing the content, not simulating their front end. Tina makes users
  write this switch by hand; we generate it.

---

## 9. Rendering on the user's real site

Thunder stays a **headless, Git-backed editor** — we never run the user's site. The page renders
through *their* framework:

1. Their page reads the md/mdx file's frontmatter `blocks[]` (already how their data loading works).
2. A `<Blocks>` component maps `_template` → their component (Tina's proven pattern), in Astro or
   React. We **generate and commit** this file on request (§8.4) so it stays in sync with the registry.
3. Because blocks map 1:1 to their real components, output is pixel-identical to what they'd hand-code
   — which is also exactly why Thunder needs no live preview: the source of truth is their own render.

This is why frontmatter storage matters: it drops into any SSG/SSR pipeline with a trivial loop and
no Thunder runtime dependency. No lock-in — the whole point vs. Studio's libSQL.

---

## 10. Implementation phases

Each phase is independently shippable and leaves the product working.

### Phase 0 — Formalize what exists (1 week) ✅ low risk
- Add `BlockDef`/`BlockFieldDef`/`PageTypeDef`/registry fields to `packages/types/src/index.ts`.
- Add `Project.blockRegistry`, `Project.pageTypes` (nullable JSON) to Prisma schema + migration.
- Registry read/write API: `app/api/projects/[id]/blocks/route.ts` (GET/PUT).
- Make `section-accordion.tsx` / `field-ui.ts` *prefer* a registered `BlockDef` when present, fall
  back to inference. **No UX change yet** — pure groundwork, backward compatible.

### Phase 1 — Component Pages + block builder (2–3 weeks) 🎯 the headline feature
- Page-type picker in the New Page flow.
- `components/content/page-builder/` canvas (add / reorder / delete / duplicate blocks) driven by
  `frontmatter.blocks[]`, storage mode `frontmatter`.
- Field panel powered by `BlockDef.fields` (with inference fallback).
- Manual block authoring UI ("+ New block type" → define fields) so it's fully usable **without**
  discovery. Ships the whole value prop even before auto-discovery.

### Phase 2 — Component auto-discovery (2–3 weeks) ✨ the differentiator
- `lib/blocks/discover.ts` — a thin `@babel/parser` AST reader with **Astro + React extractors only**
  (`framework.ts` already detects both). No `ts-morph`, no other frameworks.
- "Scan my components" review screen → writes proposed `BlockDef`s into the registry (always
  user-reviewed, never silently authoritative).
- Re-scan / drift detection (component changed → offer to update the block).

### Phase 3 — Polish & moat (ongoing)
- Custom Page Types (`allowedBlocks`, seeded fields).
- Renderer scaffolding / "Add `<Blocks>` to repo" per framework.
- `mdx-body` storage mode + inline block node in the Notion editor.
- Visual block selector thumbnails, block categories, block presets/duplication across pages.
- AI: "describe the page" → Thunder assembles blocks (reuse `lib/ai/client.ts`).

---

## 11. Backward compatibility & migration

- Every existing markdown page keeps working untouched (no `type` field ⇒ Markdown Page).
- Existing pages that already use `sections[]` are auto-upgradable: a one-click "convert to
  Component Page" maps `sections[]`→`blocks[]` and `_template` stays the key. `collectTemplateOptions`
  already gives us the block-key list to seed a starter registry from real data.
- Storage stays Git files; version history, conflict lock, and activity logging are unchanged
  because we reuse `entry/route.ts`.

---

## 12. Why a new user chooses Thunder (the pitch, sharpened)

1. **"Your components become your CMS blocks automatically."** Point it at your repo; get a visual
   block palette of your real components. Tina = write schema by hand. Studio = register in a
   plugin. Thunder = discovered.
2. **Framework-agnostic content, first-class Astro + React blocks.** The stored `blocks[]` is plain
   frontmatter any SSG/SSR framework can read — Studio is Astro-only and DB-bound. Block
   auto-discovery and renderer generation focus on Astro + React (the two we do deeply and well).
3. **Git-native, zero lock-in.** Your content is md/mdx in *your* repo, not our database
   (Studio = libSQL). Full history, PRs, and it renders with no Thunder runtime.
4. **One editor for prose *and* composition.** Markdown pages *and* component pages in the same tool
   — Sitepins can't compose; most block CMSs are awkward at prose. We do both.
5. **No GraphQL, no build step, no re-declaring.** Editing is direct file editing with a great UI.
6. **Degrades gracefully.** Even with zero config, inference gives a usable editor today; the
   registry + discovery make it great. Nothing is all-or-nothing.

**Tagline candidates:**
- *"Your components, discovered — not re-declared."*
- *"The Git-native CMS that speaks your codebase."*

---

## 13. Decisions (locked 2026-07-11)

1. **Discovery parser — thin AST reader, Astro + React only.** Use `@babel/parser` + small custom
   visitors, not `ts-morph`/the full TS compiler API (heavier than needed for two known file shapes).
   Astro and React are the *only* frameworks we target for blocks; Vue/Svelte are out of scope. (§7)
2. **No live preview — anywhere.** Thunder will not offer a live/rendered preview surface, and the
   existing live-preview iframe in `entry-editor.tsx` is **removed**. Users see the real result by
   running their own framework; Thunder edits content and can **generate** the `<Blocks>` renderer so
   the page renders on their site. The builder conveys state via block cards, not a preview. (§8.4, §9)
3. **Block field editing — extend `visual-value-editor.tsx` in place.** Pass an optional
   `BlockDef`/`BlockFieldDef` down; present ⇒ schema-driven, absent ⇒ today's inference. One editor,
   one experience — good for us to maintain, good for the user's consistency. No forked variant. (§8.2)
4. **Storage — frontmatter `blocks[]` only.** It's the sole implemented mode; `mdx-body` is dropped
   from scope (kept only as a forward-compat enum value with no UI). (§5.2, §8.3)
5. **Phase 1 ships fully manual; discovery is the Phase 2 "wow".** Manual block authoring delivers the
   whole value prop safely and fast; auto-discovery layers on top without gating the release. (§10)

> Note: implementation is **not** starting yet — this document is the agreed direction.

---

## Appendix A — File-level change map

| Area | New / changed files |
|---|---|
| Types | `packages/types/src/index.ts` (+BlockDef, BlockFieldDef, PageTypeDef, ThunderConfig fields) |
| DB | `packages/database/prisma/schema.prisma` (+`blockRegistry`, `pageTypes` on `Project`) + migration |
| Registry API | `apps/web/src/app/api/projects/[id]/blocks/route.ts` (new) |
| Page-type in create | `app/api/projects/[id]/content/entries/route.ts` (POST), create dialog |
| Discovery | `apps/web/src/lib/blocks/discover.ts` (new; `@babel/parser` AST reader, Astro + React extractors) |
| Builder UI | `apps/web/src/components/content/page-builder/*` (new: canvas, palette, block-card) |
| Editor switch | `components/content/entry-editor.tsx` (route to builder when `type === "component"`; **remove live-preview iframe**) |
| Reuse | `visual-value-editor.tsx`, `field-input.tsx`, `field-ui.ts`, `section-accordion.tsx`, `notion-editor/block-menu.tsx` |
| Storage (unchanged) | `lib/content/parser.ts`, `app/api/projects/[id]/content/entry/route.ts` |
