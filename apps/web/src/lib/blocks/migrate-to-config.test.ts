import { describe, expect, it } from "vitest";
import type { BlockDef, PageTypeDef } from "@thunder/types";
import { generateMigratedConfigSource } from "./migrate-to-config";
import { parseThunderConfigSource } from "./resolve-config";

describe("generateMigratedConfigSource", () => {
  const blocks: BlockDef[] = [
    {
      key: "hero",
      label: "Hero",
      category: "Components",
      fields: [{ name: "heading", label: "Heading", type: "string", required: true }],
      source: { kind: "component", file: "src/components/blocks/Hero.astro" },
    },
    {
      key: "richText",
      label: "Rich text",
      fields: [{ name: "body", label: "Body", type: "richtext" }],
      source: { kind: "manual" },
    },
  ];

  const pageTypes: PageTypeDef[] = [
    { key: "markdown", label: "Markdown Page", storage: "frontmatter" },
    { key: "landing", label: "Landing page", storage: "frontmatter", allowedBlocks: ["hero", "richText"] },
  ];

  it("produces a thunder.config.ts that Thunder's own parser accepts with no unresolved refs", () => {
    const source = generateMigratedConfigSource(blocks, pageTypes);
    const result = parseThunderConfigSource(source);

    expect(result.issues).toEqual([]);
    expect(result.unresolvedRefs).toEqual([]);
    expect(result.config?.blocks.map((b) => b.key)).toEqual(["hero", "richText"]);
  });

  it("emits a local import.from for component-backed blocks, preserving discovered fields", () => {
    const source = generateMigratedConfigSource(blocks, pageTypes);
    const result = parseThunderConfigSource(source);
    const hero = result.config?.blocks.find((b) => b.key === "hero");
    expect(hero?.import).toEqual({ from: "./src/components/blocks/Hero.astro" });
    expect(hero?.fields).toEqual([{ name: "heading", label: "Heading", type: "string", required: true }]);
  });

  it("emits content-only entries (no import) for manual blocks", () => {
    const source = generateMigratedConfigSource(blocks, pageTypes);
    const result = parseThunderConfigSource(source);
    const richText = result.config?.blocks.find((b) => b.key === "richText");
    expect(richText?.import).toBeUndefined();
    expect(richText?.fields).toEqual([{ name: "body", label: "Body", type: "richtext" }]);
  });

  it("strips built-in page types and keeps custom ones", () => {
    const source = generateMigratedConfigSource(blocks, pageTypes);
    const result = parseThunderConfigSource(source);
    expect(result.config?.pageTypes?.map((p) => p.key)).toEqual(["landing"]);
  });

  it("omits the pageTypes key entirely when there are no custom page types", () => {
    const source = generateMigratedConfigSource(blocks, [{ key: "markdown", label: "Markdown Page", storage: "frontmatter" }]);
    const result = parseThunderConfigSource(source);
    expect(result.config?.pageTypes).toBeUndefined();
  });

  it("handles an empty block list without producing invalid syntax", () => {
    const source = generateMigratedConfigSource([], []);
    const result = parseThunderConfigSource(source);
    expect(result.issues).toEqual([]);
    expect(result.config?.blocks).toEqual([]);
  });
});
