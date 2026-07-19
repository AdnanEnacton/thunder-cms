import type { BlockConfigEntry, BlockDef, PageTypeDef } from "@thunder/types";
import { componentToBlockDef, discoverComponent } from "./discover";
import { parseThunderConfigSource } from "./resolve-config";
import { fetchBlockManifest, resolvePackageVersion, type LockfileFile } from "./npm-manifest";

/**
 * Palette category for a component, from its folder relative to the components
 * root. `blocks/Hero.astro` → "Blocks"; `marketing/Hero.astro` → "Marketing";
 * a file directly in the root → "Components".
 */
export function categoryFromComponentPath(path: string, componentsRoot: string): string {
  const root = componentsRoot.replace(/\/+$/, "");
  const rel = path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path;
  const parts = rel.split("/");
  if (parts.length <= 1) return "Components";
  const sub = parts[0];
  return sub.charAt(0).toUpperCase() + sub.slice(1);
}

/** Turn scanned component files into component-backed block definitions. */
export function buildDiscoveredBlocks(
  files: { path: string; content: string }[],
  componentsRoot: string,
): BlockDef[] {
  const blocks: BlockDef[] = [];
  const seen = new Set<string>();

  for (const { path, content } of files) {
    // allowEmpty: a propless component is still a valid (zero-field) block.
    const discovered = discoverComponent(path, content, { allowEmpty: true });
    if (!discovered) continue;
    const block = componentToBlockDef(discovered, categoryFromComponentPath(path, componentsRoot));
    if (seen.has(block.key)) continue; // first component of a given name wins
    seen.add(block.key);
    blocks.push(block);
  }

  return blocks;
}

/**
 * Merge folder-discovered blocks (the source of truth) with the DB registry,
 * which holds optional overrides (matched by key) and purely-manual blocks
 * (blocks not backed by any component).
 */
export function mergeEffectiveBlocks(discovered: BlockDef[], overrides: BlockDef[]): BlockDef[] {
  const overrideByKey = new Map(overrides.map((o) => [o.key, o]));
  const usedKeys = new Set<string>();
  const result: BlockDef[] = [];

  for (const d of discovered) {
    const o = overrideByKey.get(d.key);
    if (!o) {
      result.push(d);
      continue;
    }
    usedKeys.add(d.key);
    // Override wins for metadata and (when it defines any) fields; the block stays
    // component-backed so the UI still treats it as coming from the repo.
    result.push({
      key: d.key,
      label: o.label || d.label,
      category: o.category ?? d.category,
      icon: o.icon ?? d.icon,
      previewImage: o.previewImage ?? d.previewImage,
      description: o.description ?? d.description,
      fields: o.fields.length ? o.fields : d.fields,
      source: d.source,
    });
  }

  // Manual blocks: present in the registry but not backed by a component.
  for (const o of overrides) {
    if (!usedKeys.has(o.key)) result.push(o);
  }

  return result;
}

export interface ConfigResolveDeps {
  packageJsonSource: string | null;
  lockfile: LockfileFile | null;
  readLocalFile: (path: string) => Promise<string | null>;
  fetchImpl?: typeof fetch;
}

export interface ConfigDrivenResult {
  blocks: BlockDef[];
  pageTypes: PageTypeDef[];
  warnings: string[];
}

function extractPackageName(specifier: string): string | null {
  if (specifier.startsWith("@")) {
    const parts = specifier.split("/");
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier;
  }
  return specifier.split("/")[0] || null;
}

/**
 * Resolve blocks for a project from `thunder.config.ts` (npm + config model)
 * instead of scanning the components folder. Package blocks are filled in from
 * their published manifest (via `npm-manifest.ts`); local `import.from` blocks
 * reuse the same prop-discovery as folder-scan; content-only blocks pass
 * through as-authored. Never throws — resolution failures become `warnings`.
 */
export async function resolveConfigDrivenBlocks(
  thunderConfigSource: string,
  deps: ConfigResolveDeps,
): Promise<ConfigDrivenResult> {
  const { config, issues, unresolvedRefs } = parseThunderConfigSource(thunderConfigSource);
  const warnings = issues.map((i) => (i.path ? `${i.path}: ${i.message}` : i.message));

  if (!config) {
    return { blocks: [], pageTypes: [], warnings };
  }

  const entries: BlockConfigEntry[] = [...config.blocks];

  for (const ref of unresolvedRefs) {
    const pkg = extractPackageName(ref.importSource);
    if (!pkg) {
      warnings.push(
        `blocks[${ref.index}]: cannot resolve "${ref.localName}" imported from "${ref.importSource}" — expected an npm package specifier`,
      );
      continue;
    }
    const version = resolvePackageVersion(pkg, deps.packageJsonSource, deps.lockfile);
    if (!version) {
      warnings.push(`blocks[${ref.index}]: could not resolve an installed version of "${pkg}" — is it in package.json?`);
      continue;
    }
    const manifest = await fetchBlockManifest(pkg, version, ref.importedName, deps.fetchImpl);
    if (!manifest) {
      warnings.push(`blocks[${ref.index}]: no manifest found for "${ref.importedName}" in ${pkg}@${version}`);
      continue;
    }
    const overrides = ref.overrides ?? {};
    entries.push({
      key: (overrides.key as string | undefined) ?? ref.importedName,
      label: (overrides.label as string | undefined) ?? manifest.label,
      category: (overrides.category as string | undefined) ?? manifest.category,
      icon: (overrides.icon as string | undefined) ?? manifest.icon,
      description: (overrides.description as string | undefined) ?? manifest.description,
      import: { package: pkg, block: ref.importedName },
      fields: manifest.fields,
      defaults: overrides.defaults as Record<string, unknown> | undefined,
      props: overrides.props as Record<string, unknown> | undefined,
    });
  }

  const blocks: BlockDef[] = [];
  for (const entry of entries) {
    const resolved = await resolveConfigEntry(entry, deps, warnings);
    if (resolved) blocks.push(resolved);
  }

  return { blocks, pageTypes: config.pageTypes ?? [], warnings };
}

async function resolveConfigEntry(
  entry: BlockConfigEntry,
  deps: ConfigResolveDeps,
  warnings: string[],
): Promise<BlockDef | null> {
  if (!entry.import) {
    if (!entry.fields?.length) {
      warnings.push(`Block "${entry.key}" has no import and no fields — content-only blocks must define fields`);
    }
    return {
      key: entry.key,
      label: entry.label,
      category: entry.category,
      icon: entry.icon,
      description: entry.description,
      fields: entry.fields ?? [],
      source: { kind: "manual" },
    };
  }

  if ("package" in entry.import) {
    const pkg = entry.import.package;
    const blockKey = entry.import.block;
    const version = resolvePackageVersion(pkg, deps.packageJsonSource, deps.lockfile);
    let fields = entry.fields ?? [];
    let label = entry.label;
    let category = entry.category;
    let icon = entry.icon;
    let description = entry.description;

    if (version) {
      const manifest = await fetchBlockManifest(pkg, version, blockKey, deps.fetchImpl);
      if (manifest) {
        if (!entry.fields?.length) fields = manifest.fields;
        if (!label || label === entry.key) label = manifest.label;
        category = category ?? manifest.category;
        icon = icon ?? manifest.icon;
        description = description ?? manifest.description;
      } else {
        warnings.push(`Block "${entry.key}": no manifest found for "${blockKey}" in ${pkg}@${version}`);
      }
    } else {
      warnings.push(`Block "${entry.key}": could not resolve an installed version of "${pkg}"`);
    }

    return {
      key: entry.key,
      label: label || entry.key,
      category,
      icon,
      description,
      fields,
      source: { kind: "package", package: pkg, block: blockKey, version: version ?? undefined },
    };
  }

  const file = entry.import.from;
  let fields = entry.fields ?? [];
  if (!entry.fields?.length) {
    const content = await deps.readLocalFile(file);
    if (content) {
      const discovered = discoverComponent(file, content, { allowEmpty: true });
      if (discovered) fields = discovered.fields;
    } else {
      warnings.push(`Block "${entry.key}": could not read local component file "${file}"`);
    }
  }

  return {
    key: entry.key,
    label: entry.label || entry.key,
    category: entry.category,
    icon: entry.icon,
    description: entry.description,
    fields,
    source: { kind: "component", file },
  };
}
