# Thunder CMS — NPM + Config-Driven Components Model

> **Proposal:** How users should install, register, and configure page blocks — without scanning their whole repo or maintaining duplicate schemas.

**Status:** Architecture proposal — **updated 2026-07-16** (npm install + config + page editor UX)  
**Supersedes (partially):** folder-scan + AST discovery as the *primary* model in `COMPONENT-PAGES-PLAN.md`  
**Related:** `COMPONENT-PAGES-PLAN.md` (page builder — shipped), `packages/types/src/index.ts`, `apps/web/src/lib/blocks/*`, `apps/web/src/components/content/page-builder/*`

> **Note:** The page builder (palette · canvas · field panel · reorder · duplicate) is **already shipped**
> per `COMPONENT-PAGES-PLAN.md`. This doc defines the **next evolution**: register blocks via
> `pnpm add` + `thunder.config.ts` instead of scanning the whole components folder.

---

## Table of contents

1. [What you asked for](#1-what-you-asked-for-in-one-paragraph)
2. [Why the current approach is the wrong default](#2-why-the-current-approach-is-the-wrong-default)
3. [Target developer experience](#3-target-developer-experience)
4. [Three tiers of blocks](#4-three-tiers-of-blocks)
5. [The config file (`thunder.config.ts`)](#5-the-config-file-thunderconfigts)
6. [NPM block packages — what they ship](#6-npm-block-packages--what-they-ship)
7. [How Thunder CMS reads this](#7-how-thunder-cms-reads-this-git-backed-no-node_modules)
8. [Props: three layers](#8-props-three-layers-important-distinction)
9. [Comparison to familiar tools](#9-comparison-to-familiar-tools)
10. [What changes in the monorepo](#10-what-changes-in-the-thunder-monorepo)
11. [Migration from today's model](#11-migration-from-todays-model)
12. [Implementation phases](#12-implementation-phases)
13. [Example: Next.js project](#13-example-full-nextjs-project-layout)
14. [Example: Astro project](#14-example-full-astro-project-layout)
15. [Open decisions](#15-open-decisions)
16. [Summary](#16-summary)
17. [Page editor UX requirements](#17-page-editor-ux--your-requirements-all-supported)
18. [Decisions locked](#18-decisions-locked-2026-07-16)
- [Appendix — config templates](#appendix--minimal-thunderconfigts-template-copy-paste)

---

## 1. What you asked for (in one paragraph)

Instead of Thunder inferring blocks by scanning every `.tsx`/`.astro` file in a repo, users should:

1. **Install ready-made blocks** with `pnpm add @thunder/blocks-marketing` (or similar).
2. **Declare what they use** in a project config file — e.g. `thunder.ts` / `thunder.config.ts` — similar to how Docusaurus uses `docusaurus.config.ts` or Astro uses `astro.config.mjs`.
3. **Optionally set default props** for each block in that same config (variant, layout, seeded copy, etc.).
4. **Only write components in their repo** when they need something truly custom — not for every Hero/CTA/Testimonials block.

This document describes how to do that cleanly while keeping Thunder Git-native and framework-friendly.

---

## 2. Why the current approach is the wrong default

Today (shipped in `COMPONENT-PAGES-PLAN.md` Phase 0–3):

| Step | What happens |
|---|---|
| Scan | Thunder walks `componentsRoot/` in Git and parses every PascalCase component |
| Discover | `@babel/parser` reads prop types → `BlockFieldDef[]` |
| Override | Optional metadata stored in Thunder DB (`Project.blockRegistry`) |
| Render | Generated `Blocks.tsx` / `Blocks.astro` glob-imports the folder |

**Problems with folder-scan as the primary model:**

1. **Too much noise** — utilities, layouts, icons, and non-block components get swept in unless naming conventions are perfect.
2. **Two sources of truth** — the component file *and* whatever Thunder inferred; they drift when props change.
3. **No packaged reuse** — every project copies Hero/FeatureGrid/Testimonials into their repo instead of installing a maintained package.
4. **Git-only limitation** — Thunder reads files from GitHub; it cannot see `node_modules` (not committed). Package-based blocks need an explicit resolution strategy.
5. **Editor owns schema** — manual block authoring in Thunder DB is disconnected from the developer’s actual config in the repo.

**What still works and should be kept:**

- Page content in Git as `frontmatter.blocks[]` with `_template` keys
- The page builder UI (palette · canvas · field panel)
- `VisualValueEditor` driven by `BlockDef.fields`
- Local custom components — but as an *opt-in* path, not the default

---

## 3. Target developer experience

### 3.1 Install a block package

```bash
pnpm add @thunder/blocks-marketing
# optional: themes, industry packs, etc.
pnpm add @thunder/blocks-blog
```

### 3.2 Create `thunder.config.ts` in the project root

```ts
import type { ThunderBlocksConfig } from "@thunder/blocks-config";
import { hero, featureGrid, testimonials } from "@thunder/blocks-marketing/blocks";

export default {
  blocks: [
    {
      ...hero,
      key: "hero",
      defaults: {
        variant: "centered",
        cta: { label: "Get started", href: "/signup" },
      },
    },
    featureGrid,
    testimonials,
    {
      key: "localPromo",
      label: "Local promo banner",
      import: { from: "./src/components/marketing/LocalPromo.tsx" },
    },
  ],
  pageTypes: [
    {
      key: "landing",
      label: "Landing page",
      allowedBlocks: ["hero", "featureGrid", "testimonials", "localPromo"],
    },
  ],
} satisfies ThunderBlocksConfig;
```

### 3.3 Use blocks on a page (unchanged content model)

```yaml
---
title: Home
type: component
blocks:
  - _template: hero
    heading: Build faster with Thunder
    subheading: Git-native CMS
    image: /media/hero.png
  - _template: featureGrid
    columns: 3
    features:
      - { title: Fast, body: "…" }
---
```

### 3.4 Render on their site

```tsx
// src/components/Blocks.tsx  (generated once, or maintained by user)
import { createBlocksRenderer } from "@thunder/blocks-runtime";
import thunderConfig from "../../thunder.config";

export const Blocks = createBlocksRenderer(thunderConfig);
```

```tsx
// src/pages/index.tsx
import { Blocks } from "@/components/Blocks";
import { getPage } from "@/lib/content";

export default function Home({ page }) {
  return <Blocks blocks={page.frontmatter.blocks} />;
}
```

**Key idea:** the developer’s config file is the contract. Thunder CMS reads that file (from Git) to know the palette, fields, and defaults — not the other way around.

---

## 4. Three tiers of blocks

| Tier | Source | When to use | Thunder discovers fields from |
|---|---|---|---|
| **Package blocks** | `@thunder/blocks-*` on npm | Standard marketing/layout/content blocks | Package manifest (published with the package) |
| **Local blocks** | `./src/components/...` in the user repo | Brand-specific, one-off, experimental | Static parse of the local file (today's `discover.ts`) |
| **Content-only blocks** | No component — config or Thunder UI only | Rich text, spacers, structured data with no render component yet | `fields` defined in `thunder.config.ts` or "+ New block type" dialog |

Package blocks are the **default**. Local blocks are **explicit opt-in** via `import: { from: "./…" }`.
Content-only blocks omit `import` entirely — editors still add them to pages from the palette.

---

## 5. The config file (`thunder.config.ts`)

### 5.1 File location (pick one convention)

| Option | Path | Notes |
|---|---|---|
| **A (recommended)** | `thunder.config.ts` at repo root | Matches `astro.config.mjs`, `next.config.ts`, Docusaurus pattern — easy to find |
| **B** | `.thunder/blocks.ts` | Keeps Thunder-specific files together; `.thunder/config.json` already exists for content roots |
| **C** | Both | `thunder.config.ts` imports/extends `.thunder/blocks.ts` for advanced setups |

**Recommendation:** **`thunder.config.ts` at repo root** for blocks + page types; keep `.thunder/config.json` for content/media/git settings (or merge later into one `defineThunderConfig()` if desired).

### 5.2 Config shape (proposed types)

These extend `packages/types/src/index.ts` — same `BlockDef` / `PageTypeDef` nouns, new resolution fields:

```ts
/** Where a block's component implementation lives. */
export type BlockImportSpec =
  | { from: string; export?: string }           // npm or relative path
  | { package: string; block: string };          // shorthand: @thunder/blocks-marketing + "hero"

export interface BlockConfigEntry {
  /** Written to frontmatter as `_template`. */
  key: string;
  label: string;
  category?: string;
  icon?: string;
  description?: string;

  /**
   * Implementation reference — npm package or local file.
   * Omit for content-only blocks (CMS fields only, no render component).
   */
  import?: BlockImportSpec;

  /**
   * CMS field schema. For package blocks, usually omitted (manifest provides it).
   * For local blocks, omitted = auto-discover from props.
   * Required for content-only blocks (no import).
   * When present on any tier, overrides/supplements manifest or discovery.
   */
  fields?: BlockFieldDef[];

  /**
   * Default prop values seeded when an editor adds this block in Thunder.
   * Does NOT appear in Git content unless the editor saves those values.
   */
  defaults?: Record<string, unknown>;

  /**
   * Fixed props always applied at render time (not shown in CMS).
   * Example: `{ theme: "dark" }` or `{ apiEndpoint: "/api/newsletter" }`.
   */
  props?: Record<string, unknown>;
}

export interface ThunderBlocksConfig {
  blocks: BlockConfigEntry[];
  pageTypes?: PageTypeDef[];
}
```

### 5.3 Examples

**Minimal — use package block as-is:**

```ts
{
  key: "hero",
  label: "Hero",
  import: { package: "@thunder/blocks-marketing", block: "hero" },
}
```

**With editor defaults:**

```ts
{
  key: "hero",
  label: "Hero",
  import: { package: "@thunder/blocks-marketing", block: "hero" },
  defaults: {
    variant: "split",
    heading: "Welcome",
  },
}
```

**With hidden runtime props (not editable in CMS):**

```ts
{
  key: "newsletter",
  label: "Newsletter signup",
  import: { package: "@thunder/blocks-marketing", block: "newsletter" },
  props: {
    provider: "mailchimp",
    listId: process.env.MAILCHIMP_LIST_ID,
  },
  fields: [
    { name: "heading", label: "Heading", type: "string" },
    { name: "subheading", label: "Subheading", type: "text" },
  ],
}
```

**Local custom component:**

```ts
{
  key: "brandHero",
  label: "Brand hero",
  import: { from: "./src/components/blocks/BrandHero.tsx" },
  // fields omitted → Thunder parses Props from the file
}
```

**Content-only block (no component file):**

```ts
{
  key: "richText",
  label: "Rich text section",
  category: "Content",
  fields: [
    { name: "heading", label: "Heading", type: "string" },
    { name: "body", label: "Body", type: "richtext" },
  ],
}
```

---

## 6. NPM block packages — what they ship

Each `@thunder/blocks-*` package should publish:

```
@thunder/blocks-marketing/
├── package.json
├── dist/
│   ├── index.js              # React/Astro components (framework-specific entry points)
│   ├── blocks/
│   │   ├── hero.json         # Block manifest (schema + metadata)
│   │   ├── featureGrid.json
│   │   └── testimonials.json
│   └── blocks.js             # re-exports block manifest objects
├── react/                    # "react" export condition
├── astro/                    # "astro" export condition
└── blocks.manifest.json      # aggregate manifest (optional convenience)
```

### 6.1 Block manifest (per block)

```json
{
  "key": "hero",
  "label": "Hero",
  "category": "Marketing",
  "version": "1.0.0",
  "frameworks": ["react", "astro"],
  "fields": [
    { "name": "heading", "label": "Heading", "type": "string", "required": true },
    { "name": "subheading", "label": "Subheading", "type": "text" },
    { "name": "image", "label": "Background image", "type": "image" },
    {
      "name": "cta",
      "label": "Call to action",
      "type": "object",
      "fields": [
        { "name": "label", "label": "Label", "type": "string" },
        { "name": "href", "label": "Link", "type": "url" }
      ]
    },
    {
      "name": "variant",
      "label": "Layout",
      "type": "select",
      "options": ["centered", "split", "minimal"],
      "default": "centered"
    }
  ],
  "component": {
    "react": "./react/Hero.js",
    "astro": "./astro/Hero.astro"
  }
}
```

Manifests are **authored once at package publish time** (from TypeScript props + JSDoc, or hand-written). Thunder does not need to parse minified npm code.

### 6.2 Supporting packages (monorepo additions)

| Package | Role |
|---|---|
| `@thunder/blocks-config` | `defineThunderConfig()`, `ThunderBlocksConfig` types, validation |
| `@thunder/blocks-runtime` | `createBlocksRenderer(config)` for Next/Astro |
| `@thunder/blocks-marketing` | Example block pack (Hero, CTA, FeatureGrid, …) |
| `@thunder/blocks-cli` | `pnpm thunder sync` — optional local dev helper |

---

## 7. How Thunder CMS reads this (Git-backed, no `node_modules`)

Because Thunder only sees **committed Git files**, resolution works like this:

```
┌─────────────────────────────────────────────────────────────────┐
│  User repo (Git)                                                │
│  ├── package.json          ← lists @thunder/blocks-marketing    │
│  ├── pnpm-lock.yaml        ← pinned version                     │
│  └── thunder.config.ts     ← which blocks + defaults/props    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Thunder CMS (server)                                           │
│  1. Read thunder.config.ts from Git (static parse)              │
│  2. Read package.json + lockfile → resolve exact package version│
│  3. Fetch block manifests from npm registry (or Thunder cache)  │
│  4. For local `from: "./…"` entries → read file + discover.ts │
│  5. Merge: manifest fields + config defaults/props + overrides  │
│  6. Expose merged BlockDef[] to page builder API                │
└─────────────────────────────────────────────────────────────────┘
```

### 7.1 Parsing `thunder.config.ts` without running the user’s build

Options (in order of preference):

| Approach | Pros | Cons |
|---|---|---|
| **Static TS parser** (extend `discover.ts` pattern) | No user build step; works from Git | Cannot evaluate runtime expressions in `props` |
| **JSON config alternative** (`thunder.blocks.json`) | Trivial to parse | Less ergonomic; no imports |
| **CLI sync** (`pnpm thunder sync` → commits `.thunder/blocks.resolved.json`) | Supports full TS evaluation locally | Extra step for devs |
| **Hybrid** | TS config for DX + committed resolved manifest for CMS | Two files to keep in sync unless CI runs sync |

**Recommendation:** Start with **static parse of `thunder.config.ts`** for `blocks[]` / `import` / `defaults` literals. Add optional **`pnpm thunder sync`** for teams that use dynamic `props` (env vars, etc.) — sync writes `.thunder/blocks.resolved.json` that Thunder prefers when present.

### 7.2 npm manifest resolution

When config says `{ package: "@thunder/blocks-marketing", block: "hero" }`:

1. Read `"@thunder/blocks-marketing": "^1.2.0"` from `package.json`
2. Resolve exact version from `pnpm-lock.yaml` / `package-lock.json` / `yarn.lock`
3. Fetch `https://registry.npmjs.org/@thunder/blocks-marketing/-/blocks-marketing-1.2.0.tgz`
4. Extract `dist/blocks/hero.json` (or read `exports` map in `package.json`)

Cache manifests in Thunder DB or object storage keyed by `package@version` to avoid repeated npm fetches.

### 7.3 Merging config into `BlockDef`

Final palette entry for the CMS:

```ts
function resolveBlock(entry: BlockConfigEntry, manifest: BlockManifest | null, discovered: BlockFieldDef[] | null): BlockDef {
  const imp = entry.import;
  return {
    key: entry.key,
    label: entry.label ?? manifest?.label ?? entry.key,
    category: entry.category ?? manifest?.category,
    icon: entry.icon ?? manifest?.icon,
    description: entry.description ?? manifest?.description,
    fields: entry.fields?.length
      ? entry.fields
      : manifest?.fields ?? discovered ?? [],
    source: !imp
      ? { kind: "manual" }
      : imp.from?.startsWith(".")
        ? { kind: "component", file: imp.from }
        : { kind: "package", package: "package" in imp ? imp.package : imp.from, block: imp.block },
  };
}
```

Extend `BlockSource` in `packages/types` with `{ kind: "package"; package: string; block: string; version?: string }`.

---

## 8. Props: three layers (important distinction)

| Layer | Where defined | Visible in CMS? | Stored in Git content? | Applied at render? |
|---|---|---|---|---|
| **`fields`** | Package manifest or config | Yes — editor controls | Yes — per block instance in `blocks[]` | Yes |
| **`defaults`** | `thunder.config.ts` | Seeded on "Add block" | Only if editor saves | Yes |
| **`props`** | `thunder.config.ts` | No — developer-only | No | Yes — merged at render |

Example render merge on the user's site:

```ts
function renderBlock(entry: BlockConfigEntry, instance: PageBlock) {
  const Component = resolveComponent(entry.import);
  const { _template, ...contentProps } = instance;
  return <Component {...entry.defaults} {...contentProps} {...entry.props} />;
}
```

**Rule of thumb:**

- **`defaults`** = starting values editors can change (placeholder copy, default variant).
- **`props`** = wiring developers control (API keys, feature flags, fixed theme tokens).

---

## 9. Comparison to familiar tools

| Tool | Config pattern | Thunder equivalent |
|---|---|---|
| **Docusaurus** | `docusaurus.config.ts` lists plugins, themes, presets | `thunder.config.ts` lists block packages + local blocks |
| **Astro** | `astro.config.mjs` integrates `@astrojs/*` | `import { hero } from "@thunder/blocks-marketing/blocks"` |
| **TinaCMS** | `tina/config.ts` hand-writes block schema | Package manifest replaces hand-written schema; config selects blocks |
| **shadcn/ui** | `components.json` picks which UI pieces to copy | Thunder blocks stay in npm — no copy-paste into repo |
| **Storybook** | `.storybook/main.ts` globs stories | Explicit `blocks[]` list instead of folder glob |

---

## 10. What changes in the Thunder monorepo

### 10.1 New packages (in `packages/`)

```
packages/
├── blocks-config/       # types + defineThunderConfig + zod validation
├── blocks-runtime/      # createBlocksRenderer for React + Astro
├── blocks-marketing/    # first party block pack (reference implementation)
└── blocks-cli/          # optional: thunder sync, validate, codegen
```

### 10.2 CMS app changes (`apps/web`)

| Area | Change |
|---|---|
| `lib/blocks/resolve-config.ts` | **New** — parse `thunder.config.ts`, resolve npm manifests |
| `lib/blocks/npm-manifest.ts` | **New** — fetch + cache manifests from registry |
| `lib/blocks/discover.ts` | **Keep** — only for local `from: "./…"` entries |
| `lib/blocks/effective.ts` | **Replace** folder scan merge with config-driven merge |
| `api/.../blocks/effective/route.ts` | Read config + manifests instead of scanning `componentsRoot/` |
| `lib/blocks/render-gen.ts` | Generate renderer that imports from packages + local paths per config |
| Setup wizard | Prompt: "Do you have `thunder.config.ts`?" + link to `pnpm add @thunder/blocks-marketing` |
| Project settings | `componentsRoot` becomes optional (local blocks only) |

### 10.3 Deprecate (not delete immediately)

- Folder-wide component scan as default palette source
- Thunder DB as primary block registry (becomes cache/overrides only, or removed)
- Glob `Blocks.tsx` generator as default (explicit imports from config are clearer with packages)

---

## 11. Migration from today's model

| Today | Tomorrow |
|---|---|
| Scan `src/components/` | Read `thunder.config.ts` |
| All components become blocks | Only listed blocks become blocks |
| Overrides in Thunder DB | Overrides in config file (Git is source of truth) |
| Copy Hero.tsx into repo | `pnpm add @thunder/blocks-marketing` |
| `componentsRoot` required | `componentsRoot` only for local custom blocks |

**Migration command (future CLI):**

```bash
pnpm thunder migrate-to-config
# → reads current blockRegistry + scanned components
# → writes draft thunder.config.ts
# → user reviews and commits
```

---

## 12. Implementation phases

### Phase A — Types + config contract (1 week)

- [ ] Add `BlockConfigEntry`, `BlockImportSpec`, `ThunderBlocksConfig` to `@thunder/types` or `@thunder/blocks-config`
- [ ] Document JSON Schema for block manifests
- [ ] Static parser for `thunder.config.ts` (literal `blocks` array)
- [ ] Unit tests: parse sample configs

### Phase B — npm manifest resolver (1–2 weeks)

- [ ] Read `package.json` + lockfile from Git
- [ ] Fetch + cache npm manifests
- [ ] Merge manifest + config → `BlockDef[]`
- [ ] Update `/api/projects/[id]/blocks/effective` to use new resolver

### Phase C — First party block package (2–3 weeks)

- [ ] `@thunder/blocks-marketing` with Hero, FeatureGrid, CTA, Testimonials
- [ ] React + Astro entry points
- [ ] `@thunder/blocks-runtime` + codegen for `Blocks.tsx`

### Phase D — CMS UX (1 week)

- [ ] Setup wizard: install guide + config file template
- [ ] In-app config editor for `thunder.config.ts` (reuse config-file-editor)
- [ ] "Add block from package" picker (browse `@thunder/*` manifests)

### Phase E — Local blocks + migration (1 week)

- [ ] Keep `discover.ts` for `./src/...` entries only
- [ ] `pnpm thunder migrate-to-config` CLI
- [ ] Deprecation notice for folder-scan default

---

## 13. Example: full Next.js project layout

```
my-site/
├── package.json
├── pnpm-lock.yaml
├── thunder.config.ts          ← block registry (committed)
├── .thunder/
│   └── config.json            ← content roots, media (existing)
├── src/
│   ├── components/
│   │   ├── Blocks.tsx         ← createBlocksRenderer(thunder.config)
│   │   └── blocks/
│   │       └── BrandHero.tsx  ← only custom block
│   └── content/
│       └── pages/
│           └── home.md        ← blocks[] frontmatter
└── node_modules/              ← NOT in Git; Thunder resolves via lockfile + npm
    └── @thunder/blocks-marketing/
```

**`package.json` (excerpt):**

```json
{
  "dependencies": {
    "@thunder/blocks-marketing": "^1.0.0",
    "@thunder/blocks-runtime": "^1.0.0",
    "@thunder/blocks-config": "^1.0.0"
  }
}
```

---

## 14. Example: full Astro project layout

Same config file. Runtime picks Astro entry from manifest:

```ts
// thunder.config.ts — identical across frameworks
export default {
  blocks: [
    { key: "hero", label: "Hero", import: { package: "@thunder/blocks-marketing", block: "hero" } },
  ],
} satisfies ThunderBlocksConfig;
```

```astro
---
// src/components/Blocks.astro
import { createAstroBlocksRenderer } from "@thunder/blocks-runtime/astro";
import config from "../../thunder.config.ts";
const { blocks = [] } = Astro.props;
const render = createAstroBlocksRenderer(config);
---
{render(blocks)}
```

---

## 15. Open decisions

1. **Single config vs split** — merge `.thunder/config.json` + `thunder.config.ts` into one `defineThunderConfig()` later?
2. **Resolved manifest** — require committed `.thunder/blocks.resolved.json` for dynamic props, or forbid dynamic props in v1?
3. **Third-party packages** — allow any npm package that follows the manifest convention, or only `@thunder/*` in v1?
4. **Version pinning** — when `@thunder/blocks-marketing@1.3` adds a new field, auto-update CMS schema or require config bump?
5. **Pricing** — are block packs free OSS, paid themes, or org-licensed?

---

## 16. Summary

| Question | Answer |
|---|---|
| How do users get components? | **`pnpm add @thunder/blocks-*`** |
| How do they choose which to use? | **`thunder.config.ts`** — explicit list, Docusaurus-style |
| How do they set default props? | **`defaults`** on each block entry in config |
| How do they hide dev-only props? | **`props`** on each block entry (not shown in CMS) |
| When do they write real components? | **Only for custom/local blocks** via `import: { from: "./src/..." }` |
| How does Thunder know npm block schemas? | **Manifests published with the package**, resolved via lockfile + npm registry |
| Select block → see prop fields in editor? | **Yes** — `BlockDef.fields` drives the field panel (shipped) |
| Add block without a component? | **Yes** — content-only blocks (no `import`) or manual block types |
| Reorder blocks on a page? | **Yes** — move up/down on canvas (shipped) |
| Same component multiple times? | **Yes** — palette + duplicate; each instance has its own field values (shipped) |
| What stays the same? | **Git `blocks[]` content**, page builder UX, framework rendering on their site |

**One-line pitch:** *Install blocks like dependencies. Register them in `thunder.config.ts`. Only write components when you're building something truly yours.*

---

## 17. Page editor UX — your requirements (all supported)

These are core page-builder behaviors. **Most already ship today** in
`apps/web/src/components/content/page-builder/`; the npm + config model keeps and extends them.

### 17.0 Page builder layout (shipped)

```
┌──────────────┬─────────────────────────┬──────────────────┐
│  BLOCKS       │      PAGE CANVAS         │   FIELD PANEL     │
│  (palette)    │  [Hero            ↑↓⎘✕] │  heading: ___     │
│               │  [Feature grid    ↑↓⎘✕] │  subheading: ___  │
│  ▸ Marketing  │  [Hero            ↑↓⎘✕] │  image: [pick]    │
│    Hero       │  + Add block             │  cta.label: ___   │
│    CTA        │                          │  variant: [select]│
│  ▸ Content    │                          │                   │
│    Rich text  │                          │                   │
└──────────────┴─────────────────────────┴──────────────────┘

↑↓ = move up / down   ⎘ = duplicate   ✕ = delete
```

**Code references (today):**

| Behavior | File / function |
|---|---|
| Add block from palette | `page-builder.tsx` → `addBlock()` |
| Show fields for selected block | `block-field-panel.tsx` + `visual-value-editor.tsx` |
| Move up / down | `page-builder.tsx` → `moveBlock()` |
| Duplicate same block | `page-builder.tsx` → `duplicateBlock()` |
| Seed defaults on add | `registry.ts` → `createBlockInstance()` |
| Manual block type (no component) | `block-def-dialog.tsx` |

### 17.1 Select a component → see its prop fields

**Yes.** When an editor clicks a block on the canvas, the right panel shows editable fields driven by `BlockDef.fields`:

| Block source | Where fields come from |
|---|---|
| npm package block | Manifest shipped with `@thunder/blocks-*` |
| Local component (`from: "./src/..."`) | Auto-discovered from the component's `Props` type |
| Manual / content-only block | Fields defined in `thunder.config.ts` or authored in Thunder UI |

Flow:

```
Palette: click "Hero"
    → new block instance added to page (blocks[])
    → select block on canvas
    → field panel shows: heading, subheading, image, cta, variant, …
    → values saved into that block instance in Git frontmatter
```

Config `defaults` only **seed** values when the block is first added. Editors can change every field per instance.

### 17.2 Add blocks directly to the page (no component required)

**Yes.** Not every block needs a React/Astro component. Two patterns:

**A. Content-only block (no `import`)** — prose, spacers, raw HTML, structured data the site handles elsewhere:

```ts
{
  key: "richText",
  label: "Rich text section",
  category: "Content",
  // no import — CMS-only block
  fields: [
    { name: "heading", label: "Heading", type: "string" },
    { name: "body", label: "Body", type: "richtext" },
  ],
}
```

**B. Manual block type in Thunder UI (today)** — "+ New block type" dialog defines fields without any repo file. Useful before a developer wires a component.

On the page, content-only blocks still appear in `blocks[]` with `_template: "richText"`. The site's `<Blocks>` renderer can skip unknown templates or map them to a generic wrapper.

### 17.3 Reorder blocks (move up / down)

**Yes — already built.** The page canvas has **Move up** / **Move down** controls on each block card. Reordering updates the `blocks[]` array order in frontmatter; render order on the live site matches array order.

```
blocks:
  - _template: hero      ← position 0
  - _template: featureGrid
  - _template: hero      ← same type, different instance, position 2
  - _template: cta
```

Future polish (optional): drag-and-drop via the grip handle — reorder logic already exists (`moveBlock`).

### 17.4 Same component multiple times on one page

**Yes — already built.** A page is an **ordered list of block instances**, not a set of unique types.

- Click **Hero** in the palette twice → two Hero blocks with independent field values.
- Click **Duplicate** on an existing block → copy with the same field values.
- Each instance is its own object in `blocks[]`; they share `_template: "hero"` but can differ (e.g. two Heroes with different headings).

This works identically for npm package blocks and local custom components.

### 17.5 Summary checklist

| Requirement | Supported? | Status |
|---|---|---|
| Component with props → fields in editor | ✅ | Shipped (`BlockFieldPanel` + `BlockDef.fields`) |
| Add block without a backing component | ✅ | Shipped (manual block types); config-only blocks in npm model |
| Pick blocks from palette onto page | ✅ | Shipped (`BlockPalette` + `addBlock`) |
| Move blocks up / down | ✅ | Shipped (`moveBlock`) |
| Add same component multiple times | ✅ | Shipped (palette + duplicate) |
| Per-instance prop values in Git | ✅ | Shipped (`frontmatter.blocks[]`) |

The npm + `thunder.config.ts` model changes **how blocks are registered** (install + config file), not **how editors compose pages**. The page builder UX stays the same — and gets better because package manifests give reliable, complete field schemas.

---

## 18. Decisions locked (2026-07-16)

1. **Blocks are registered in `thunder.config.ts`** — explicit list, not folder glob. Developers install `@thunder/blocks-*` and declare which blocks the project uses.
2. **Three block tiers** — package (npm), local (`import.from`), content-only (no `import`, fields only).
3. **Props have three layers** — `fields` (CMS-editable), `defaults` (seed on add), `props` (dev-only, hidden from CMS).
4. **Page content stays `frontmatter.blocks[]`** — ordered list of instances; same `_template` may appear multiple times with different values.
5. **Page builder UX is unchanged** — palette, canvas, field panel, move up/down, duplicate, delete all remain. npm model only improves field schema quality.
6. **Thunder resolves npm manifests via Git** — read `package.json` + lockfile from repo; fetch manifests from npm registry (not `node_modules`).
7. **Local discovery is opt-in** — `discover.ts` runs only for `import.from` paths pointing at repo files.
8. **Folder-wide component scan is deprecated** as the default palette source once config-driven resolution ships.

---

## Appendix — Minimal `thunder.config.ts` template (copy-paste)

```ts
import type { ThunderBlocksConfig } from "@thunder/blocks-config";

export default {
  blocks: [
    {
      key: "hero",
      label: "Hero",
      import: { package: "@thunder/blocks-marketing", block: "hero" },
      defaults: {
        variant: "centered",
      },
    },
    {
      key: "featureGrid",
      label: "Feature grid",
      import: { package: "@thunder/blocks-marketing", block: "featureGrid" },
    },
    {
      key: "richText",
      label: "Rich text section",
      category: "Content",
      fields: [
        { name: "heading", label: "Heading", type: "string" },
        { name: "body", label: "Body", type: "richtext" },
      ],
    },
    {
      key: "brandHero",
      label: "Brand hero (local)",
      import: { from: "./src/components/blocks/BrandHero.tsx" },
    },
  ],
  pageTypes: [
    {
      key: "component",
      label: "Component page",
      storage: "frontmatter",
      allowedBlocks: ["hero", "featureGrid", "richText", "brandHero"],
    },
  ],
} satisfies ThunderBlocksConfig;
```
