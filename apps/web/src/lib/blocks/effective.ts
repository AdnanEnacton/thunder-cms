import type { BlockDef } from "@thunder/types";
import { componentToBlockDef, discoverComponent } from "./discover";

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
