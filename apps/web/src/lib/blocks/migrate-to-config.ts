import type { BlockDef, BlockFieldDef, PageTypeDef } from "@thunder/types";
import { BUILTIN_PAGE_TYPES } from "./registry";

function serializeFields(fields: BlockFieldDef[], indent: string): string {
  if (!fields.length) return "[]";
  const lines = fields.map((f) => `${indent}  ${JSON.stringify(f)},`);
  return `[\n${lines.join("\n")}\n${indent}]`;
}

function serializeBlockEntry(block: BlockDef): string {
  const lines: string[] = ["  {"];
  lines.push(`    key: ${JSON.stringify(block.key)},`);
  lines.push(`    label: ${JSON.stringify(block.label)},`);
  if (block.category) lines.push(`    category: ${JSON.stringify(block.category)},`);
  if (block.icon) lines.push(`    icon: ${JSON.stringify(block.icon)},`);
  if (block.description) lines.push(`    description: ${JSON.stringify(block.description)},`);

  if (block.source?.kind === "component") {
    lines.push(`    import: { from: ${JSON.stringify(`./${block.source.file}`)} },`);
  } else if (block.source?.kind === "package") {
    lines.push(
      `    import: { package: ${JSON.stringify(block.source.package)}, block: ${JSON.stringify(block.source.block)} },`,
    );
  }

  if (block.fields.length) {
    lines.push(`    fields: ${serializeFields(block.fields, "    ")},`);
  }

  lines.push("  }");
  return lines.join("\n");
}

function serializePageType(pt: PageTypeDef): string {
  const lines: string[] = ["  {"];
  lines.push(`    key: ${JSON.stringify(pt.key)},`);
  lines.push(`    label: ${JSON.stringify(pt.label)},`);
  lines.push(`    storage: ${JSON.stringify(pt.storage)},`);
  if (pt.allowedBlocks?.length) {
    lines.push(`    allowedBlocks: ${JSON.stringify(pt.allowedBlocks)},`);
  }
  lines.push("  }");
  return lines.join("\n");
}

/**
 * Draft a `thunder.config.ts` from a project's *current* effective blocks
 * (folder-discovered components + DB registry overrides) so a folder-scan
 * project can migrate without hand-authoring every entry from scratch.
 * Component-backed blocks keep their discovered fields verbatim so nothing is
 * lost in the switch — the user reviews and commits the result themselves.
 */
export function generateMigratedConfigSource(blocks: BlockDef[], pageTypes: PageTypeDef[]): string {
  const customPageTypes = pageTypes.filter((pt) => !BUILTIN_PAGE_TYPES.some((b) => b.key === pt.key));

  const blocksBlock = blocks.length
    ? blocks.map(serializeBlockEntry).join(",\n")
    : "";

  const pageTypesSection = customPageTypes.length
    ? `,\n  pageTypes: [\n${customPageTypes.map(serializePageType).join(",\n")},\n  ]`
    : "";

  return `import type { ThunderBlocksConfig } from "@thunder/blocks-config";

// Migrated from folder-scan + registry overrides. Review before committing —
// local component blocks below keep their discovered fields as a starting
// point; package blocks should be switched to \`{ package, block }\` imports
// once you install the matching @thunder/blocks-* package.
export default {
  blocks: [
${blocksBlock}
  ]${pageTypesSection}
} satisfies ThunderBlocksConfig;
`;
}
