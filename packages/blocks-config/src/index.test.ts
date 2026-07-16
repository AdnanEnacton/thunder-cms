import { describe, expect, it } from "vitest";
import { defineThunderConfig, validateThunderConfig } from "./index";

describe("defineThunderConfig", () => {
  it("returns the config unchanged (identity helper for type-checking)", () => {
    const config = defineThunderConfig({
      blocks: [{ key: "hero", label: "Hero", import: { package: "@thunder/blocks-marketing", block: "hero" } }],
    });
    expect(config.blocks).toHaveLength(1);
  });
});

describe("validateThunderConfig", () => {
  it("accepts the appendix minimal template shape", () => {
    const result = validateThunderConfig({
      blocks: [
        { key: "hero", label: "Hero", import: { package: "@thunder/blocks-marketing", block: "hero" }, defaults: { variant: "centered" } },
        { key: "richText", label: "Rich text section", category: "Content", fields: [{ name: "body", label: "Body", type: "richtext" }] },
        { key: "brandHero", label: "Brand hero (local)", import: { from: "./src/components/blocks/BrandHero.tsx" } },
      ],
      pageTypes: [
        { key: "component", label: "Component page", storage: "frontmatter", allowedBlocks: ["hero", "richText", "brandHero"] },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a block entry with neither a key nor a label", () => {
    const result = validateThunderConfig({ blocks: [{}] });
    expect(result.success).toBe(false);
  });

  it("rejects a pageType with an invalid storage mode", () => {
    const result = validateThunderConfig({
      blocks: [],
      pageTypes: [{ key: "x", label: "X", storage: "database" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an import spec that is neither package nor local", () => {
    const result = validateThunderConfig({
      blocks: [{ key: "hero", label: "Hero", import: { somethingElse: true } }],
    });
    expect(result.success).toBe(false);
  });
});
