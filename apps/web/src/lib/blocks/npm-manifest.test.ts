import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearManifestCache,
  fetchBlockManifest,
  resolvePackageVersion,
  resolvePinnedVersion,
  resolveVersionRangeFromPackageJson,
} from "./npm-manifest";

describe("resolveVersionRangeFromPackageJson", () => {
  it("strips semver range prefixes", () => {
    const pkgJson = JSON.stringify({ dependencies: { "@thunder/blocks-marketing": "^1.2.0" } });
    expect(resolveVersionRangeFromPackageJson(pkgJson, "@thunder/blocks-marketing")).toBe("1.2.0");
  });

  it("checks devDependencies and peerDependencies too", () => {
    const pkgJson = JSON.stringify({ devDependencies: { foo: "~2.0.0" }, peerDependencies: { bar: ">=3.0.0" } });
    expect(resolveVersionRangeFromPackageJson(pkgJson, "foo")).toBe("2.0.0");
    expect(resolveVersionRangeFromPackageJson(pkgJson, "bar")).toBe("3.0.0");
  });

  it("returns null when missing or malformed", () => {
    expect(resolveVersionRangeFromPackageJson("{}", "foo")).toBeNull();
    expect(resolveVersionRangeFromPackageJson("not json", "foo")).toBeNull();
  });
});

describe("resolvePinnedVersion", () => {
  it("resolves from npm package-lock.json (v7+ packages format)", () => {
    const lock = JSON.stringify({
      packages: { "node_modules/@thunder/blocks-marketing": { version: "1.3.4" } },
    });
    expect(
      resolvePinnedVersion({ name: "package-lock.json", source: lock }, "@thunder/blocks-marketing"),
    ).toBe("1.3.4");
  });

  it("resolves from pnpm-lock.yaml importers section", () => {
    const lock = `
importers:
  .:
    dependencies:
      '@thunder/blocks-marketing':
        specifier: ^1.2.0
        version: 1.2.5
`;
    expect(
      resolvePinnedVersion({ name: "pnpm-lock.yaml", source: lock }, "@thunder/blocks-marketing"),
    ).toBe("1.2.5");
  });

  it("resolves from pnpm-lock.yaml packages map when importers is absent", () => {
    const lock = `
packages:
  /@thunder/blocks-marketing@1.4.0:
    resolution: {integrity: sha512-abc}
`;
    expect(
      resolvePinnedVersion({ name: "pnpm-lock.yaml", source: lock }, "@thunder/blocks-marketing"),
    ).toBe("1.4.0");
  });

  it("resolves from yarn.lock", () => {
    const lock = `
"@thunder/blocks-marketing@^1.0.0":
  version "1.0.7"
  resolved "https://registry.yarnpkg.com/..."
`;
    expect(resolvePinnedVersion({ name: "yarn.lock", source: lock }, "@thunder/blocks-marketing")).toBe(
      "1.0.7",
    );
  });

  it("returns null instead of throwing on malformed lockfiles", () => {
    expect(resolvePinnedVersion({ name: "package-lock.json", source: "not json" }, "foo")).toBeNull();
    expect(resolvePinnedVersion({ name: "pnpm-lock.yaml", source: ":::not yaml:::[" }, "foo")).toBeNull();
  });
});

describe("resolvePackageVersion", () => {
  it("prefers the lockfile pin over the package.json range", () => {
    const pkgJson = JSON.stringify({ dependencies: { foo: "^1.0.0" } });
    const lock = JSON.stringify({ packages: { "node_modules/foo": { version: "1.0.9" } } });
    expect(resolvePackageVersion("foo", pkgJson, { name: "package-lock.json", source: lock })).toBe(
      "1.0.9",
    );
  });

  it("falls back to package.json range when there is no lockfile", () => {
    const pkgJson = JSON.stringify({ dependencies: { foo: "^1.0.0" } });
    expect(resolvePackageVersion("foo", pkgJson, null)).toBe("1.0.0");
  });

  it("returns null when neither source has the package", () => {
    expect(resolvePackageVersion("foo", "{}", null)).toBeNull();
  });
});

describe("fetchBlockManifest", () => {
  beforeEach(() => {
    clearManifestCache();
  });

  it("fetches from the aggregate blocks.manifest.json first", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url === "https://unpkg.com/@thunder/blocks-marketing@1.0.0/blocks.manifest.json") {
        return new Response(
          JSON.stringify({ blocks: { hero: { key: "hero", label: "Hero", fields: [] } } }),
          { status: 200 },
        );
      }
      return new Response("not found", { status: 404 });
    });

    const manifest = await fetchBlockManifest(
      "@thunder/blocks-marketing",
      "1.0.0",
      "hero",
      fetchImpl as unknown as typeof fetch,
    );
    expect(manifest).toMatchObject({ key: "hero", label: "Hero" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("falls back to the per-block manifest file when the aggregate is missing", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.endsWith("blocks.manifest.json")) return new Response("not found", { status: 404 });
      if (url.endsWith("dist/blocks/hero.json")) {
        return new Response(JSON.stringify({ key: "hero", label: "Hero", fields: [] }), { status: 200 });
      }
      return new Response("not found", { status: 404 });
    });

    const manifest = await fetchBlockManifest(
      "@thunder/blocks-marketing",
      "1.0.0",
      "hero",
      fetchImpl as unknown as typeof fetch,
    );
    expect(manifest).toMatchObject({ key: "hero", label: "Hero" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("caches results and does not refetch for the same package@version#block", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ blocks: { hero: { key: "hero", label: "Hero", fields: [] } } }), {
        status: 200,
      }),
    );

    await fetchBlockManifest("pkg", "1.0.0", "hero", fetchImpl as unknown as typeof fetch);
    await fetchBlockManifest("pkg", "1.0.0", "hero", fetchImpl as unknown as typeof fetch);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("returns null (never throws) when nothing is found", async () => {
    const fetchImpl = vi.fn(async () => new Response("not found", { status: 404 }));
    const manifest = await fetchBlockManifest("pkg", "1.0.0", "hero", fetchImpl as unknown as typeof fetch);
    expect(manifest).toBeNull();
  });
});
