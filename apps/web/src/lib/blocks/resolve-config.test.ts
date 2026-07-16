import { describe, expect, it } from "vitest";
import { parseThunderConfigSource } from "./resolve-config";

describe("parseThunderConfigSource", () => {
  it("parses the appendix minimal template", () => {
    const source = `
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
            allowedBlocks: ["hero", "richText", "brandHero"],
          },
        ],
      } satisfies ThunderBlocksConfig;
    `;

    const result = parseThunderConfigSource(source);

    expect(result.issues).toEqual([]);
    expect(result.unresolvedRefs).toEqual([]);
    expect(result.config?.blocks).toHaveLength(3);

    const hero = result.config?.blocks.find((b) => b.key === "hero");
    expect(hero?.import).toEqual({ package: "@thunder/blocks-marketing", block: "hero" });
    expect(hero?.defaults).toEqual({ variant: "centered" });

    const richText = result.config?.blocks.find((b) => b.key === "richText");
    expect(richText?.import).toBeUndefined();
    expect(richText?.fields).toHaveLength(2);

    const brandHero = result.config?.blocks.find((b) => b.key === "brandHero");
    expect(brandHero?.import).toEqual({ from: "./src/components/blocks/BrandHero.tsx" });

    expect(result.config?.pageTypes).toHaveLength(1);
    expect(result.config?.pageTypes?.[0]).toMatchObject({
      key: "component",
      storage: "frontmatter",
      allowedBlocks: ["hero", "richText", "brandHero"],
    });
  });

  it("marks spread-imported package blocks as unresolved for Phase B to fill in", () => {
    const source = `
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
        ],
      };
    `;

    const result = parseThunderConfigSource(source);

    expect(result.config?.blocks).toEqual([]);
    expect(result.unresolvedRefs).toHaveLength(3);

    const heroRef = result.unresolvedRefs[0];
    expect(heroRef).toMatchObject({
      index: 0,
      localName: "hero",
      importSource: "@thunder/blocks-marketing/blocks",
      importedName: "hero",
    });
    expect(heroRef.overrides).toEqual({
      key: "hero",
      defaults: { variant: "centered", cta: { label: "Get started", href: "/signup" } },
    });

    expect(result.unresolvedRefs[1]).toMatchObject({
      index: 1,
      localName: "featureGrid",
      importedName: "featureGrid",
    });
    expect(result.unresolvedRefs[1].overrides).toBeUndefined();
    expect(result.unresolvedRefs[2]).toMatchObject({ index: 2, localName: "testimonials" });
  });

  it("keeps dev-only `props` values opaque instead of failing on dynamic expressions", () => {
    const source = `
      export default {
        blocks: [
          {
            key: "newsletter",
            label: "Newsletter signup",
            import: { package: "@thunder/blocks-marketing", block: "newsletter" },
            props: {
              provider: "mailchimp",
              listId: process.env.MAILCHIMP_LIST_ID,
            },
          },
        ],
      };
    `;

    const result = parseThunderConfigSource(source);

    expect(result.issues).toEqual([]);
    const entry = result.config?.blocks[0];
    expect(entry?.props?.provider).toBe("mailchimp");
    expect(entry?.props?.listId).toEqual({ $expression: "<dynamic>" });
  });

  it("reports an issue when there is no default export", () => {
    const result = parseThunderConfigSource(`export const blocks = [];`);
    expect(result.config).toBeNull();
    expect(result.issues).toEqual([{ message: "No `export default` found", path: "" }]);
  });

  it("reports an issue when a block entry is missing a key", () => {
    const result = parseThunderConfigSource(`
      export default {
        blocks: [{ label: "No key" }],
      };
    `);
    expect(result.config?.blocks).toEqual([]);
    expect(result.issues).toContainEqual({
      message: "Block entry is missing a string `key`",
      path: "blocks[0]",
    });
  });

  it("resolves locally-declared const object literals used as block entries", () => {
    const result = parseThunderConfigSource(`
      const localPromo = {
        key: "localPromo",
        label: "Local promo banner",
        import: { from: "./src/components/marketing/LocalPromo.tsx" },
      };

      export default {
        blocks: [localPromo],
      };
    `);
    expect(result.issues).toEqual([]);
    expect(result.config?.blocks).toEqual([
      {
        key: "localPromo",
        label: "Local promo banner",
        import: { from: "./src/components/marketing/LocalPromo.tsx" },
      },
    ]);
  });

  it("never throws on malformed source", () => {
    const result = parseThunderConfigSource(`this is not { valid js at all ]`);
    expect(result.config).toBeNull();
    expect(result.issues.length).toBeGreaterThan(0);
  });
});
