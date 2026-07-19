import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearManifestCache } from "./npm-manifest";
import { resolveConfigDrivenBlocks } from "./effective";

function fetchImpl(manifests: Record<string, Record<string, unknown>>) {
  return vi.fn(async (url: string) => {
    const match = url.match(/^https:\/\/unpkg\.com\/(.+)@([^/]+)\/blocks\.manifest\.json$/);
    if (match) {
      const [, pkg] = match;
      const blocks = manifests[pkg];
      if (blocks) return new Response(JSON.stringify({ blocks }), { status: 200 });
    }
    return new Response("not found", { status: 404 });
  }) as unknown as typeof fetch;
}

describe("resolveConfigDrivenBlocks", () => {
  beforeEach(() => {
    clearManifestCache();
  });

  it("resolves the spread-import pattern end-to-end (parse → version → manifest → merge)", async () => {
    const source = `
      import { hero, featureGrid } from "@thunder/blocks-marketing/blocks";

      export default {
        blocks: [
          { ...hero, key: "hero", defaults: { variant: "centered" } },
          featureGrid,
        ],
      };
    `;

    const result = await resolveConfigDrivenBlocks(source, {
      packageJsonSource: JSON.stringify({ dependencies: { "@thunder/blocks-marketing": "^1.0.0" } }),
      lockfile: null,
      readLocalFile: async () => null,
      fetchImpl: fetchImpl({
        "@thunder/blocks-marketing": {
          hero: { key: "hero", label: "Hero", category: "Marketing", fields: [{ name: "heading", label: "Heading", type: "string" }] },
          featureGrid: { key: "featureGrid", label: "Feature grid", fields: [] },
        },
      }),
    });

    expect(result.warnings).toEqual([]);
    expect(result.blocks).toHaveLength(2);

    const hero = result.blocks.find((b) => b.key === "hero");
    expect(hero?.source).toEqual({ package: "@thunder/blocks-marketing", block: "hero", kind: "package", version: "1.0.0" });
    expect(hero?.fields).toHaveLength(1);
    expect(hero?.category).toBe("Marketing");

    const featureGrid = result.blocks.find((b) => b.key === "featureGrid");
    expect(featureGrid?.label).toBe("Feature grid");
  });

  it("resolves the shorthand package import form", async () => {
    const source = `
      export default {
        blocks: [
          { key: "hero", label: "Hero", import: { package: "@thunder/blocks-marketing", block: "hero" } },
        ],
      };
    `;

    const result = await resolveConfigDrivenBlocks(source, {
      packageJsonSource: JSON.stringify({ dependencies: { "@thunder/blocks-marketing": "1.2.0" } }),
      lockfile: null,
      readLocalFile: async () => null,
      fetchImpl: fetchImpl({
        "@thunder/blocks-marketing": {
          hero: { key: "hero", label: "Hero (from manifest)", fields: [{ name: "heading", label: "Heading", type: "string" }] },
        },
      }),
    });

    expect(result.warnings).toEqual([]);
    expect(result.blocks[0].fields).toHaveLength(1);
    expect(result.blocks[0].source).toMatchObject({ kind: "package", package: "@thunder/blocks-marketing", block: "hero" });
  });

  it("resolves local import.from blocks via component discovery", async () => {
    const source = `
      export default {
        blocks: [
          { key: "brandHero", label: "Brand hero", import: { from: "./src/components/blocks/BrandHero.tsx" } },
        ],
      };
    `;

    const componentSource = `
      export interface Props {
        heading: string;
        image: string;
      }
      export default function BrandHero(props: Props) { return null; }
    `;

    const result = await resolveConfigDrivenBlocks(source, {
      packageJsonSource: null,
      lockfile: null,
      readLocalFile: async (path) => (path === "./src/components/blocks/BrandHero.tsx" ? componentSource : null),
    });

    expect(result.warnings).toEqual([]);
    expect(result.blocks[0].fields.map((f) => f.name)).toEqual(["heading", "image"]);
    expect(result.blocks[0].source).toEqual({ kind: "component", file: "./src/components/blocks/BrandHero.tsx" });
  });

  it("passes through content-only blocks (no import) as manual", async () => {
    const source = `
      export default {
        blocks: [
          {
            key: "richText",
            label: "Rich text section",
            category: "Content",
            fields: [{ name: "body", label: "Body", type: "richtext" }],
          },
        ],
      };
    `;

    const result = await resolveConfigDrivenBlocks(source, {
      packageJsonSource: null,
      lockfile: null,
      readLocalFile: async () => null,
    });

    expect(result.warnings).toEqual([]);
    expect(result.blocks[0]).toMatchObject({ key: "richText", source: { kind: "manual" } });
  });

  it("collects warnings instead of throwing when a package version cannot be resolved", async () => {
    const source = `
      export default {
        blocks: [
          { key: "hero", label: "Hero", import: { package: "@thunder/blocks-marketing", block: "hero" } },
        ],
      };
    `;

    const result = await resolveConfigDrivenBlocks(source, {
      packageJsonSource: "{}",
      lockfile: null,
      readLocalFile: async () => null,
    });

    expect(result.blocks).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/could not resolve an installed version/);
  });

  it("returns empty blocks with a parse-issue warning for a malformed config", async () => {
    const result = await resolveConfigDrivenBlocks(`export const notDefault = {};`, {
      packageJsonSource: null,
      lockfile: null,
      readLocalFile: async () => null,
    });

    expect(result.blocks).toEqual([]);
    expect(result.warnings).toContain("No `export default` found");
  });
});
