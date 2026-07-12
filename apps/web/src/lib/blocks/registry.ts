import type { BlockDef, PageBlock, PageTypeDef } from "@thunder/types";

/**
 * The two page types every project has out of the box. Projects may add more
 * custom page types (Phase 3), which are merged ahead of these built-ins.
 */
export const BUILTIN_PAGE_TYPES: PageTypeDef[] = [
  {
    key: "markdown",
    label: "Markdown Page",
    description: "Frontmatter fields plus a markdown body. The classic Thunder editor.",
    icon: "file-text",
    storage: "frontmatter",
  },
  {
    key: "component",
    label: "Component Page",
    description: "Compose the page from reusable blocks — your own components.",
    icon: "blocks",
    storage: "frontmatter",
  },
];

/** Frontmatter discriminator that marks a page as component-based. */
export const COMPONENT_PAGE_TYPE = "component";

/** Frontmatter key that holds a component page's ordered block list. */
export const BLOCKS_KEY = "blocks";

/** Parse the stored `Project.blockRegistry` JSON into BlockDef[]. Never throws. */
export function parseBlockRegistry(json: string | null | undefined): BlockDef[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) return parsed.filter(isBlockDef);
    // Tolerate a wrapped { version, blocks } shape too.
    if (parsed && Array.isArray(parsed.blocks)) return parsed.blocks.filter(isBlockDef);
    return [];
  } catch {
    return [];
  }
}

/** Parse the stored `Project.pageTypes` JSON, always including the built-ins. */
export function parsePageTypes(json: string | null | undefined): PageTypeDef[] {
  const custom: PageTypeDef[] = [];
  if (json) {
    try {
      const parsed = JSON.parse(json);
      const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.pageTypes) ? parsed.pageTypes : [];
      for (const pt of list) {
        if (pt && typeof pt.key === "string" && typeof pt.label === "string") {
          custom.push({ storage: "frontmatter", ...pt });
        }
      }
    } catch {
      // ignore malformed JSON — fall back to built-ins only
    }
  }
  // Custom page types with a built-in key override the built-in of the same key.
  const customKeys = new Set(custom.map((p) => p.key));
  return [...custom, ...BUILTIN_PAGE_TYPES.filter((p) => !customKeys.has(p.key))];
}

export function serializeBlockRegistry(blocks: BlockDef[]): string {
  return JSON.stringify(blocks, null, 2);
}

export function serializePageTypes(pageTypes: PageTypeDef[]): string {
  // Only persist non-built-in page types; built-ins are always merged back in.
  const builtinKeys = new Set(BUILTIN_PAGE_TYPES.map((p) => p.key));
  return JSON.stringify(pageTypes.filter((p) => !builtinKeys.has(p.key)), null, 2);
}

export function findBlockDef(blocks: BlockDef[], key: string | undefined): BlockDef | undefined {
  if (!key) return undefined;
  return blocks.find((b) => b.key === key);
}

/** Build a fresh block instance from its definition, seeded with defaults. */
export function createBlockInstance(def: BlockDef): PageBlock {
  const block: PageBlock = { _template: def.key };
  for (const field of def.fields) {
    block[field.name] = fieldDefault(field);
  }
  return block;
}

function fieldDefault(field: { type: string; default?: unknown; fields?: unknown[] }): unknown {
  if (field.default !== undefined) return field.default;
  switch (field.type) {
    case "boolean":
      return false;
    case "number":
      return 0;
    case "tags":
    case "array":
      return [];
    case "object":
      return {};
    default:
      return "";
  }
}

function isBlockDef(value: unknown): value is BlockDef {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as BlockDef).key === "string" &&
    typeof (value as BlockDef).label === "string" &&
    Array.isArray((value as BlockDef).fields)
  );
}
