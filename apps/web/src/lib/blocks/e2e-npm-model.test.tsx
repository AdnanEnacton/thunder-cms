import { beforeEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ThunderBlocksConfig } from "@thunder/types";
import manifestJson from "@thunder/blocks-marketing/blocks.manifest.json";
import { Hero, FeatureGrid } from "@thunder/blocks-marketing";
import { hero, featureGrid } from "@thunder/blocks-marketing/blocks";
import { createBlocksRenderer } from "@thunder/blocks-runtime";
import { clearManifestCache } from "./npm-manifest";
import { resolveConfigDrivenBlocks } from "./effective";

/**
 * Proves the full "npm install → thunder.config.ts → edit in Thunder → render
 * on the user's site" loop end to end using real, shipped packages — not
 * mocks of our own code. Two consumers read the same config, exactly like the
 * real architecture (THUNDER-COMPONENTS-NPM-MODEL.md §7/§9):
 *  1. Thunder's server statically parses `thunder.config.ts` from Git and
 *     fetches the block's manifest to build the editor's field schema.
 *  2. The user's own site imports `thunder.config.ts` as a normal TS module
 *     and passes it to `createBlocksRenderer` alongside the real components.
 */
describe("npm + config-driven blocks — end to end", () => {
  beforeEach(() => {
    clearManifestCache();
  });

  it("Thunder resolves the CMS field schema from the real published manifest", async () => {
    const configSource = `
      import { hero, featureGrid } from "@thunder/blocks-marketing/blocks";

      export default {
        blocks: [
          { ...hero, key: "hero", defaults: { variant: "split" } },
          featureGrid,
        ],
      };
    `;

    const fetchImpl = (async (url: string) => {
      if (url === "https://unpkg.com/@thunder/blocks-marketing@0.1.0/blocks.manifest.json") {
        return new Response(JSON.stringify(manifestJson), { status: 200 });
      }
      return new Response("not found", { status: 404 });
    }) as unknown as typeof fetch;

    const resolved = await resolveConfigDrivenBlocks(configSource, {
      packageJsonSource: JSON.stringify({ dependencies: { "@thunder/blocks-marketing": "0.1.0" } }),
      lockfile: null,
      readLocalFile: async () => null,
      fetchImpl,
    });

    expect(resolved.warnings).toEqual([]);
    expect(resolved.blocks.map((b) => b.key).sort()).toEqual(["featureGrid", "hero"]);

    const heroDef = resolved.blocks.find((b) => b.key === "hero")!;
    expect(heroDef.source).toMatchObject({ kind: "package", package: "@thunder/blocks-marketing", block: "hero" });
    expect(heroDef.fields.map((f) => f.name)).toEqual(["heading", "subheading", "image", "cta", "variant"]);

    const featureGridDef = resolved.blocks.find((b) => b.key === "featureGrid")!;
    expect(featureGridDef.fields.map((f) => f.name)).toEqual(["columns", "features"]);
  });

  it("the user's site renders the same config with the real Hero + FeatureGrid components", () => {
    const config: ThunderBlocksConfig = {
      blocks: [{ ...hero, key: "hero", defaults: { variant: "split" } }, featureGrid],
    };

    const Blocks = createBlocksRenderer(config, { hero: Hero, featureGrid: FeatureGrid });

    const html = renderToStaticMarkup(
      <Blocks
        blocks={[
          { _template: "hero", heading: "Build faster with Thunder", subheading: "Git-native CMS" },
          {
            _template: "featureGrid",
            columns: 2,
            features: [
              { title: "Fast", body: "Ships quickly" },
              { title: "Open", body: "Git-native" },
            ],
          },
        ]}
      />,
    );

    expect(html).toContain("Build faster with Thunder");
    expect(html).toContain("Git-native CMS");
    // defaults from thunder.config.ts applied since the content didn't set `variant`.
    expect(html).toContain("thunder-hero--split");
    expect(html).toContain("Fast");
    expect(html).toContain("Ships quickly");
    expect(html).toContain("repeat(2, 1fr)");
  });
});
