export type GitFramework = "astro" | "nextjs" | "hugo" | "eleventy" | "jekyll" | "nuxt" | "sveltekit" | "unknown";

export type ContentFormat = "md" | "mdx" | "json" | "yaml" | "toml" | "text";

export interface MediaFileSummary {
  path: string;
  name: string;
  folder: string;
  publicPath: string;
  size?: number;
}

export interface ConfigFileSummary {
  path: string;
  name: string;
  format: ContentFormat;
}

export type FieldType =
  | "string"
  | "text"
  | "number"
  | "boolean"
  | "date"
  | "tags"
  | "image"
  | "json"
  | "unknown";

export interface FieldSchema {
  name: string;
  type: FieldType;
  label: string;
}

export interface ContentRoot {
  id: string;
  label: string;
  path: string;
}

export interface ContentCollection {
  id: string;
  label: string;
  rootPath: string;
  entryCount: number;
}

export interface ContentEntrySummary {
  path: string;
  title: string;
  draft: boolean;
  date?: string;
  collectionId: string;
}

export interface ContentDocument {
  path: string;
  sha: string;
  format: ContentFormat;
  frontmatter: Record<string, unknown>;
  body: string;
  fields: FieldSchema[];
}

export interface ThunderConfig {
  version: 1;
  framework: GitFramework;
  content: {
    roots: ContentRoot[];
  };
  media: {
    root: string;
    publicPath: string;
  };
  code?: {
    root: string;
  };
  configs?: string[];
  git: {
    defaultBranch: string;
    commitMessageMode: "auto" | "custom";
  };
  /** Component/block registry — see BlockDef. Optional; absent = markdown-only. */
  blocks?: BlockDef[];
  /** Page types available in the "New Page" flow. */
  pageTypes?: PageTypeDef[];
}

// ---------------------------------------------------------------------------
// Component / block-based pages (COMPONENT-PAGES-PLAN.md)
// ---------------------------------------------------------------------------

/**
 * The type of an editable field on a block. Extends the inferred FieldType with
 * the richer controls a defined schema can express.
 */
export type BlockFieldType =
  | FieldType // "string" | "text" | "number" | "boolean" | "date" | "tags" | "image" | "json" | "unknown"
  | "select"
  | "url"
  | "object"
  | "array"
  | "richtext"
  | "color";

export interface BlockFieldDef {
  /** Frontmatter key this field maps to. */
  name: string;
  label: string;
  type: BlockFieldType;
  required?: boolean;
  /** Seed value used when a new block/item is created. */
  default?: unknown;
  /** Options for `select`. */
  options?: string[];
  /** Item shape for `array` (optional — arrays fall back to inference when absent). */
  of?: BlockFieldDef;
  /** Child fields for `object`. */
  fields?: BlockFieldDef[];
  /** Placeholder / helper text shown under the control. */
  help?: string;
}

/** How a block definition came to exist. */
export type BlockSource =
  | { kind: "manual" }
  | { kind: "component"; file: string; export?: string }
  | { kind: "package"; package: string; block: string; version?: string };

/**
 * A block = one composable page component. `key` is written to each block
 * instance as `_template`, matching Thunder's existing sections convention.
 */
export interface BlockDef {
  key: string;
  label: string;
  category?: string;
  icon?: string;
  previewImage?: string;
  description?: string;
  fields: BlockFieldDef[];
  source?: BlockSource;
}

/** Where a page type stores its blocks. Only "frontmatter" is implemented. */
export type BlockStorageMode = "frontmatter" | "mdx-body";

export interface PageTypeDef {
  key: string;
  label: string;
  description?: string;
  icon?: string;
  storage: BlockStorageMode;
  /** Block keys allowed on this page type. Empty/undefined = all blocks. */
  allowedBlocks?: string[];
  /** Page-level frontmatter fields (title, seo, …). */
  fields?: BlockFieldDef[];
}

/** One block instance stored in a page's `blocks[]` array. */
export interface PageBlock {
  _template: string;
  [key: string]: unknown;
}

/** The persisted registry for a project (stored as JSON on Project). */
export interface BlockRegistry {
  version: 1;
  blocks: BlockDef[];
  pageTypes: PageTypeDef[];
}

// ---------------------------------------------------------------------------
// npm + config-driven blocks (THUNDER-COMPONENTS-NPM-MODEL.md)
// ---------------------------------------------------------------------------

/** Where a block's component implementation lives — npm package or a local repo file. */
export type BlockImportSpec =
  | { from: string; export?: string }
  | { package: string; block: string };

export interface BlockConfigEntry {
  /** Written to frontmatter as `_template`. */
  key: string;
  label: string;
  category?: string;
  icon?: string;
  description?: string;
  /** Implementation reference. Omit for content-only blocks (CMS fields only). */
  import?: BlockImportSpec;
  /**
   * CMS field schema. For package blocks, usually omitted (manifest provides it).
   * For local blocks, omitted = auto-discover from props.
   * Required for content-only blocks (no import).
   */
  fields?: BlockFieldDef[];
  /** Default prop values seeded when an editor adds this block. Not written to Git unless saved. */
  defaults?: Record<string, unknown>;
  /** Fixed props always applied at render time (dev-only, not shown in the CMS). */
  props?: Record<string, unknown>;
}

/** The `thunder.config.ts` contract — block registry + page types for a project. */
export interface ThunderBlocksConfig {
  blocks: BlockConfigEntry[];
  pageTypes?: PageTypeDef[];
}

export interface GitRepo {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  defaultBranch: string;
  private: boolean;
}

export interface GitTreeEntry {
  path: string;
  type: "file" | "dir";
  sha?: string;
}

export interface FrameworkDefaults {
  framework: GitFramework;
  content: string;
  mediaRoot: string;
  mediaPublic: string;
  code: string;
  configs: string[];
}