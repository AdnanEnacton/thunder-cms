import { describe, expect, it } from "vitest";
import { generateThunderConfigTemplate } from "./config-template";
import { parseThunderConfigSource } from "./resolve-config";

describe("generateThunderConfigTemplate", () => {
  it("produces a thunder.config.ts that Thunder's own parser accepts cleanly", () => {
    const source = generateThunderConfigTemplate();
    const result = parseThunderConfigSource(source);

    expect(result.issues).toEqual([]);
    expect(result.unresolvedRefs).toEqual([]);
    expect(result.config?.blocks.map((b) => b.key)).toEqual(["hero", "featureGrid", "richText"]);
    expect(result.config?.pageTypes?.[0].allowedBlocks).toEqual(["hero", "featureGrid", "richText"]);
  });
});
