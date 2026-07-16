# Thunder Integration Guide — `thunder.config.ts`

> How to add `thunder.config.ts` to **your** project (the site being edited with Thunder CMS), so the
> page builder gets its block palette from an explicit config file instead of scanning your whole
> components folder. Companion reference: `THUNDER-COMPONENTS-NPM-MODEL.md` (the architecture proposal)
> and `PROGRESS-TRACKER.md` (what's actually shipped).

---

## 1. Why this file exists

Without `thunder.config.ts`, Thunder falls back to **folder-scan**: it walks your configured
"components folder" and infers a block from every component it finds. That works with zero setup, but
it sweeps in non-block components too, has no way to install ready-made blocks, and gives you no
control over field schema, default values, or which blocks are even meant to be used on pages.

`thunder.config.ts` fixes this — you explicitly list the blocks your project uses, same idea as
`astro.config.mjs` or `docusaurus.config.ts`. When Thunder finds this file, it takes over completely as
the source of truth for the block palette; folder-scan is only used as a fallback when the file is
absent.

---

## 2. Where it goes

- **Path:** `thunder.config.ts` at the **root of your repository** — same level as `package.json`.
- **Not** inside `.thunder/` — that directory is for `.thunder/config.json` (content roots, media
  paths, Git settings), which is a separate file managed by the setup wizard. `thunder.config.ts` is
  new and additive; you don't need to touch `.thunder/config.json` to add it.

Thunder reads this file straight from Git (the same way it reads everything else — it never runs your
build or touches `node_modules`), so as soon as you commit it, the next time you open the page builder
Thunder will use it.

---

## 3. Install the packages you need

```bash
pnpm add @thunder/blocks-config @thunder/blocks-runtime
# optional: a block pack, e.g.
pnpm add @thunder/blocks-marketing
```

> **Current status: these packages are not published to npm yet.** Running the commands above from a
> real project today will fail with a 404 — `@thunder/blocks-config`/`blocks-runtime`/`blocks-marketing`
> only exist inside the `sitepins-clone` monorepo (`packages/blocks-*`), linked via pnpm's
> `workspace:*` protocol. They **are** built like real packages (compiled JS + bundled `.d.ts` via
> `tsup`, correct `exports` map) and have been verified end to end from a genuinely separate project
> using `pnpm add file:<path-to-tarball>.tgz` — see the appendix at the bottom of this doc for exactly
> how, and for what changes once they're actually published. Everything else in this guide describes
> the real, intended `pnpm add` experience once that happens.

| Package | What it's for |
|---|---|
| `@thunder/blocks-config` | TypeScript types (`ThunderBlocksConfig`, `BlockConfigEntry`, …) + `defineThunderConfig()` for editor autocomplete + `validateThunderConfig()` if you want to self-check the file in a script/CI. |
| `@thunder/blocks-runtime` | `createBlocksRenderer(config, components)` — builds the `<Blocks>` component that renders your page's block instances on **your** site. |
| `@thunder/blocks-marketing` (or any other `@thunder/blocks-*` pack) | Ready-made blocks (Hero, FeatureGrid, Cta, Testimonials, …) — components + field manifests, so you don't write them yourself. |

You only need the last one if you're using package blocks. If every block in your project is a custom
local component, skip it.

---

## 4. Minimal example

```ts
// thunder.config.ts
import type { ThunderBlocksConfig } from "@thunder/blocks-config";

export default {
  blocks: [
    {
      key: "hero",
      label: "Hero",
      import: { package: "@thunder/blocks-marketing", block: "hero" },
      defaults: { variant: "centered" },
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
  ],
} satisfies ThunderBlocksConfig;
```

Commit this file. Reload the page builder for any page in this project — the palette header now shows
a green **"thunder.config.ts"** badge instead of the folder-scan notice, and "Hero" + "Rich text
section" appear as blocks.

---

## 5. The shape of the file

```ts
export interface ThunderBlocksConfig {
  blocks: BlockConfigEntry[];
  pageTypes?: PageTypeDef[];
}

export interface BlockConfigEntry {
  key: string;                    // written to frontmatter as `_template`
  label: string;
  category?: string;              // groups blocks in the palette
  icon?: string;
  description?: string;

  import?: BlockImportSpec;       // omit entirely for content-only blocks
  fields?: BlockFieldDef[];       // CMS-editable schema (see §6)
  defaults?: Record<string, unknown>;   // seeded on "Add block", editor can change (see §7)
  props?: Record<string, unknown>;      // dev-only, hidden from the CMS, applied at render (see §7)
}

export type BlockImportSpec =
  | { package: string; block: string }              // npm block pack
  | { from: string; export?: string };               // local component file
```

The top-level export **must** be a literal object (`export default { ... }`), optionally wrapped in
`satisfies ThunderBlocksConfig`. Thunder parses this file with a static AST reader — it does not
execute your code — so `blocks` must ultimately resolve to array/object literals. See §9 for exactly
what's supported.

---

## 6. The three block tiers

### 6.1 Package blocks (`import: { package, block }`)

The default choice for anything generic (Hero, CTA, Feature grid, Testimonials, …). Thunder resolves
the field schema from the package's published **manifest** — you don't write `fields` yourself unless
you want to override what the package ships:

```ts
{
  key: "hero",
  label: "Hero",
  import: { package: "@thunder/blocks-marketing", block: "hero" },
}
```

**What has to be true for this to resolve:**
1. `@thunder/blocks-marketing` must be listed in your `package.json` `dependencies` (Thunder reads the
   version from your lockfile — `pnpm-lock.yaml`/`package-lock.json`/`yarn.lock` — falling back to the
   `package.json` semver range if no lockfile pin is found).
2. The package must be published to a registry Thunder can fetch a manifest from (`blocks.manifest.json`
   at the package root, or `dist/blocks/<key>.json` per block — Thunder fetches these files directly
   off the npm CDN, it does not download/extract the tarball).
3. `block` must match a key inside that manifest.

If any of those fail, Thunder doesn't error out the whole page builder — it drops that block and shows
a warning banner in the palette explaining exactly what went wrong (e.g. "could not resolve an
installed version of `@thunder/blocks-marketing`").

**Shorthand import via a block pack's own export** — most `@thunder/blocks-*` packages also export
ready-made config entries you can spread, so you get editor autocomplete on the field names without
writing `import: {...}` by hand:

```ts
import { hero, featureGrid } from "@thunder/blocks-marketing/blocks";

export default {
  blocks: [
    { ...hero, key: "hero", defaults: { variant: "split" } },  // override/extend
    featureGrid,                                                // use as-is
  ],
} satisfies ThunderBlocksConfig;
```

Thunder's parser recognizes this pattern specifically (spreading, or bare-referencing, an identifier
imported from another module) and resolves it the same way as the explicit form — it fetches the
package's manifest and merges any literal overrides you wrote alongside the spread (`key`, `defaults`,
etc.).

### 6.2 Local blocks (`import: { from }`)

For anything custom to your project — brand-specific sections, one-offs:

```ts
{
  key: "brandHero",
  label: "Brand hero",
  import: { from: "./src/components/blocks/BrandHero.tsx" },
  // fields omitted → Thunder parses the component's `Props` type automatically
}
```

`from` is a path relative to your repo root. Thunder reads that file from Git and runs the same
prop-discovery it uses for folder-scan (parses the `Props` interface/type, maps each member to a field
— `string`→text, `number`→number, union of string literals→`select`, etc.). Astro and React (`.astro`,
`.tsx`) are supported. If you'd rather define the fields yourself instead of relying on discovery, just
add a `fields` array — an explicit `fields` always wins over auto-discovery.

### 6.3 Content-only blocks (no `import`)

For blocks with no backing component yet — rich text sections, spacers, structured data your site
handles some other way:

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

`fields` is **required** here — there's no component to discover them from. Editors can still add this
block from the palette; your site's renderer decides how (or whether) to render `_template: "richText"`.

---

## 7. `defaults` vs `props` vs `fields` — don't mix these up

| Layer | Set where | Editor sees it? | Saved to Git per-instance? | Used at render |
|---|---|---|---|---|
| `fields` | Manifest (package blocks) or `thunder.config.ts` (local/content-only) | Yes — drives the field panel | Yes | Yes |
| `defaults` | `thunder.config.ts` | Seeded once, when the block is added | Only if the editor changes/saves it | Yes |
| `props` | `thunder.config.ts` | **No** — invisible to the CMS entirely | No | Yes — merged in at render, always |

Rule of thumb: **`defaults`** = a starting point editors can change (placeholder copy, initial layout
variant). **`props`** = wiring only you control (API keys, feature flags, a fixed theme token) — things
an editor should never see or accidentally edit.

`props` values can be dynamic expressions your config-authoring script can't statically evaluate (e.g.
`process.env.MAILCHIMP_LIST_ID`) — Thunder's parser is fine with that since it never needs to know the
actual value, only that the key exists. `defaults`/`fields`/`import`/`key`/`label` must be static
literals; a dynamic expression there gets reported as a parse warning and dropped.

```ts
{
  key: "newsletter",
  label: "Newsletter signup",
  import: { package: "@thunder/blocks-marketing", block: "newsletter" },
  props: {
    provider: "mailchimp",
    listId: process.env.MAILCHIMP_LIST_ID,   // fine — dev-only, opaque to Thunder
  },
}
```

Render-time merge order (in `@thunder/blocks-runtime`, see §8) is: `defaults` → saved content →
`props`. Saved content overrides `defaults`; `props` always wins last since it's meant to be
non-editable.

---

## 8. Rendering the blocks on your site

`thunder.config.ts` only tells **Thunder** what the palette looks like. Your own site still needs a
`<Blocks>` component that turns `frontmatter.blocks[]` into real markup — you build this once with
`@thunder/blocks-runtime`:

```tsx
// src/components/Blocks.tsx
import { createBlocksRenderer } from "@thunder/blocks-runtime";
import { Hero, FeatureGrid } from "@thunder/blocks-marketing";
import thunderConfig from "../../thunder.config";
import { BrandHero } from "./blocks/BrandHero";

export const Blocks = createBlocksRenderer(thunderConfig, {
  hero: Hero,
  featureGrid: FeatureGrid,
  brandHero: BrandHero,
});
```

```tsx
// src/pages/index.tsx
import { Blocks } from "@/components/Blocks";
import { getPage } from "@/lib/content";

export default function Home({ page }) {
  return <Blocks blocks={page.frontmatter.blocks} />;
}
```

Notice the `components` map is **explicit** — `createBlocksRenderer` doesn't dynamically import
whatever package a block came from at request time, you wire each block key to its real component
yourself. This is deliberate (same reasoning Astro/Next apply to any dynamic-import scenario): explicit
imports are what let bundlers tree-shake and type-check correctly, and it works identically whether the
block came from an npm package or a local file.

Content-only blocks (no component) just aren't included in the map — `createBlocksRenderer` silently
skips any `_template` it has no component for, rather than throwing.

---

## 9. What the parser can and can't statically evaluate

Thunder never runs your `thunder.config.ts` — it parses it with a TypeScript AST reader and walks the
literal structure. This is fast and safe (no arbitrary code execution against your repo), but it means:

**Supported:**
- `export default { ... }`, optionally with `satisfies ThunderBlocksConfig` or `as ThunderBlocksConfig`
- Object and array literals, nested arbitrarily
- String/number/boolean/null literals, template literals with no `${...}` expressions
- A block entry that's a bare identifier imported from another module (`featureGrid`)
- A block entry that spreads an imported identifier plus literal overrides (`{ ...hero, key: "hero" }`)
- A block entry that references a **locally-declared `const` object literal** in the same file
- Dynamic expressions **inside `props` only** (treated as opaque — the key is recorded, the runtime
  value is not needed by Thunder)

**Not supported (reported as a parse warning, that block/field is skipped):**
- Function calls building the config (`export default buildConfig()`)
- Dynamic expressions inside `blocks`, `defaults`, `fields`, `import`, `key`, or `label`
- Spreading something that isn't an import or a local `const` object literal
- Any non-literal control flow (ternaries, loops, conditionals) affecting the shape of `blocks`

If a block silently doesn't show up in the palette, check the palette's warning banner first — Thunder
surfaces exactly which entry it couldn't resolve and why, rather than failing the whole file.

---

## 10. Custom page types (optional)

```ts
export default {
  blocks: [ /* ... */ ],
  pageTypes: [
    {
      key: "landing",
      label: "Landing page",
      storage: "frontmatter",
      allowedBlocks: ["hero", "featureGrid", "richText"],
    },
  ],
} satisfies ThunderBlocksConfig;
```

`allowedBlocks` restricts the palette to a subset when creating a page of that type — omit it to allow
every block. `storage: "frontmatter"` is currently the only implemented mode.

---

## 11. Already on folder-scan? Migrate instead of hand-writing this

If your project already has blocks discovered from your components folder (with or without registry
overrides), don't write `thunder.config.ts` from scratch — go to **Project Settings → Config-driven
blocks → Migrate existing blocks** in the Thunder dashboard. It drafts a config from what Thunder
currently sees (component-backed blocks keep their discovered fields verbatim, manual blocks become
content-only entries) and commits it for you to review. The **Generate starter template** button next
to it gives you a blank example instead, if you'd rather start fresh.

---

## Appendix — testing this without a real npm registry

Since `@thunder/blocks-*` aren't published yet, `pnpm add @thunder/blocks-marketing` in an external
project will 404. To actually exercise the install→config→render flow for real (not just inside the
monorepo's own tests), do what this session's verification did:

1. **Build for real** — each package now has a `build` script (`tsup`): compiled ESM+CJS +
   a bundled `.d.ts`, `package.json` `main`/`module`/`types`/`exports` all point at `dist/`. Run
   `pnpm build` (or `pnpm --filter @thunder/blocks-marketing build`, etc.) from the monorepo root.

2. **Pack them like `npm publish` would** — `pnpm pack` inside each package directory produces a real
   `.tgz` and — critically — **rewrites `workspace:*` to the actual pinned version** (e.g.
   `@thunder/types: "0.0.0"`) in the packed `package.json`, exactly like a real publish does. Never
   test by pointing at the raw `packages/*` source directories — that skips this rewrite and hides bugs
   a real publish would surface.

3. **In a project genuinely outside this repo**, add the tarballs as dependencies via the `file:`
   protocol:
   ```json
   {
     "dependencies": {
       "@thunder/blocks-config": "file:../path/to/thunder-blocks-config-0.1.0.tgz",
       "@thunder/blocks-marketing": "file:../path/to/thunder-blocks-marketing-0.1.0.tgz",
       "@thunder/blocks-runtime": "file:../path/to/thunder-blocks-runtime-0.1.0.tgz"
     }
   }
   ```
   `@thunder/types` is a transitive dependency of all three (real `dependencies`, not devDependency —
   its types aren't inlined into the others' `.d.ts` bundles) and, since it isn't on the real registry
   either, needs the same treatment via a `pnpm.overrides` entry:
   ```json
   {
     "pnpm": {
       "overrides": { "@thunder/types": "file:../path/to/thunder-types-0.0.0.tgz" }
     }
   }
   ```
   **This override is a local-testing-only workaround.** Once `@thunder/types` is actually published,
   real consumers won't need it — pnpm will just resolve `@thunder/types@0.0.0` from the registry like
   any other dependency, the same way it already resolves `zod` or `react`.

4. `pnpm install`, then write your `thunder.config.ts` + `Blocks.tsx` equivalent and run it. If it
   type-checks and renders correctly against the installed `node_modules` copies, the packages behave
   exactly as they will once published — only the install command differs (`file:...` vs. a plain
   package name).

**What changes once actually published:** claim the `@thunder` scope on npmjs.com (or pick a different
scope), `pnpm publish` each package (in dependency order: `types` → `blocks-config`/`blocks-runtime` →
`blocks-marketing`), and every `file:`/`pnpm.overrides` line above disappears — `pnpm add
@thunder/blocks-marketing` starts working exactly as written in §3.

---

## 12. Quick checklist

- [ ] `thunder.config.ts` committed at repo root, `export default { blocks: [...] }`
- [ ] Every package block's package is in `package.json` `dependencies` and installed (lockfile present)
- [ ] Every local block's `from` path is correct and the file has a `Props` type (or you supplied `fields` yourself)
- [ ] Every content-only block has `fields` (no `import` = `fields` is required)
- [ ] `defaults`/`props` used correctly — editable seed values vs. hidden dev wiring, not swapped
- [ ] `src/components/Blocks.tsx` (or equivalent) built with `createBlocksRenderer` and a real component for every block key you expect editors to use
- [ ] Palette shows the green `thunder.config.ts` badge, no warning banner, after committing
