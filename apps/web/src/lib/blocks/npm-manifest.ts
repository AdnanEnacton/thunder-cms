import { parse as parseYaml } from "yaml";
import type { BlockFieldDef } from "@thunder/types";

export interface NpmBlockManifest {
  key: string;
  label: string;
  category?: string;
  icon?: string;
  description?: string;
  version?: string;
  frameworks?: string[];
  fields: BlockFieldDef[];
  component?: Record<string, string>;
}

interface CacheEntry {
  manifest: NpmBlockManifest | null;
  fetchedAt: number;
}

const CACHE_TTL_MS = 15 * 60 * 1000;
const manifestCache = new Map<string, CacheEntry>();

/** Test-only: clear the in-memory manifest cache between test cases. */
export function clearManifestCache(): void {
  manifestCache.clear();
}

/**
 * Fetch a single block's manifest for an installed package version. Reads the
 * raw file straight off the npm CDN (unpkg serves files from the published
 * tarball) instead of downloading + extracting the .tgz ourselves.
 */
export async function fetchBlockManifest(
  pkg: string,
  version: string,
  block: string,
  fetchImpl: typeof fetch = fetch,
): Promise<NpmBlockManifest | null> {
  const cacheKey = `${pkg}@${version}#${block}`;
  const cached = manifestCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.manifest;

  const manifest = await fetchBlockManifestUncached(pkg, version, block, fetchImpl);
  manifestCache.set(cacheKey, { manifest, fetchedAt: Date.now() });
  return manifest;
}

async function fetchBlockManifestUncached(
  pkg: string,
  version: string,
  block: string,
  fetchImpl: typeof fetch,
): Promise<NpmBlockManifest | null> {
  const aggregateUrl = `https://unpkg.com/${pkg}@${version}/blocks.manifest.json`;
  try {
    const res = await fetchImpl(aggregateUrl);
    if (res.ok) {
      const data = (await res.json()) as Record<string, unknown>;
      const raw = (data.blocks as Record<string, unknown> | undefined)?.[block] ?? data[block];
      const normalized = normalizeManifest(raw, version);
      if (normalized) return normalized;
    }
  } catch {
    // fall through to per-block manifest
  }

  const perBlockUrl = `https://unpkg.com/${pkg}@${version}/dist/blocks/${block}.json`;
  try {
    const res = await fetchImpl(perBlockUrl);
    if (res.ok) {
      const data = await res.json();
      return normalizeManifest(data, version);
    }
  } catch {
    // no manifest available for this block
  }

  return null;
}

function normalizeManifest(data: unknown, fallbackVersion: string): NpmBlockManifest | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (typeof d.key !== "string") return null;
  return {
    key: d.key,
    label: typeof d.label === "string" ? d.label : d.key,
    category: typeof d.category === "string" ? d.category : undefined,
    icon: typeof d.icon === "string" ? d.icon : undefined,
    description: typeof d.description === "string" ? d.description : undefined,
    version: typeof d.version === "string" ? d.version : fallbackVersion,
    frameworks: Array.isArray(d.frameworks) ? d.frameworks.filter((f): f is string => typeof f === "string") : undefined,
    fields: Array.isArray(d.fields) ? (d.fields as BlockFieldDef[]) : [],
    component: d.component && typeof d.component === "object" ? (d.component as Record<string, string>) : undefined,
  };
}

export interface LockfileFile {
  name: "pnpm-lock.yaml" | "package-lock.json" | "yarn.lock";
  source: string;
}

/** Best-effort exact version lookup from a lockfile. Never throws. */
export function resolvePinnedVersion(lockfile: LockfileFile, pkg: string): string | null {
  try {
    if (lockfile.name === "package-lock.json") return resolveFromNpmLock(lockfile.source, pkg);
    if (lockfile.name === "pnpm-lock.yaml") return resolveFromPnpmLock(lockfile.source, pkg);
    return resolveFromYarnLock(lockfile.source, pkg);
  } catch {
    return null;
  }
}

function resolveFromNpmLock(source: string, pkg: string): string | null {
  const json = JSON.parse(source) as {
    packages?: Record<string, { version?: string }>;
    dependencies?: Record<string, { version?: string }>;
  };
  const fromPackages = json.packages?.[`node_modules/${pkg}`]?.version;
  if (fromPackages) return fromPackages;
  return json.dependencies?.[pkg]?.version ?? null;
}

function resolveFromPnpmLock(source: string, pkg: string): string | null {
  const doc = parseYaml(source) as {
    importers?: Record<string, { dependencies?: Record<string, unknown>; devDependencies?: Record<string, unknown> }>;
    dependencies?: Record<string, unknown>;
    packages?: Record<string, unknown>;
  };

  const importer = doc.importers?.["."];
  const sections = importer
    ? [importer.dependencies, importer.devDependencies]
    : [doc.dependencies];

  for (const section of sections) {
    const entry = section?.[pkg];
    const version = typeof entry === "string" ? entry : (entry as { version?: string } | undefined)?.version;
    if (typeof version === "string") return version.split("(")[0];
  }

  const packages = doc.packages ?? {};
  const escaped = pkg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const keyPattern = new RegExp(`^/?${escaped}@([^/(]+)`);
  for (const key of Object.keys(packages)) {
    const m = key.match(keyPattern);
    if (m) return m[1];
  }
  return null;
}

function resolveFromYarnLock(source: string, pkg: string): string | null {
  const escaped = pkg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`"?${escaped}@[^\\n]*"?:\\n(?:[^\\n]*\\n)*?\\s*version[:\\s]+"?([\\w.\\-]+)"?`);
  const m = source.match(regex);
  return m ? m[1] : null;
}

/** Fallback: strip semver range prefixes ("^1.2.0" → "1.2.0") from package.json. */
export function resolveVersionRangeFromPackageJson(packageJsonSource: string, pkg: string): string | null {
  try {
    const json = JSON.parse(packageJsonSource) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };
    const range = json.dependencies?.[pkg] ?? json.devDependencies?.[pkg] ?? json.peerDependencies?.[pkg];
    if (typeof range !== "string") return null;
    const cleaned = range.replace(/^[\^~>=<\s]+/, "").trim();
    return cleaned || null;
  } catch {
    return null;
  }
}

/** Resolve the installed version of `pkg`: exact lockfile pin, else package.json range. */
export function resolvePackageVersion(
  pkg: string,
  packageJsonSource: string | null,
  lockfile: LockfileFile | null,
): string | null {
  if (lockfile) {
    const pinned = resolvePinnedVersion(lockfile, pkg);
    if (pinned) return pinned;
  }
  if (packageJsonSource) {
    return resolveVersionRangeFromPackageJson(packageJsonSource, pkg);
  }
  return null;
}
