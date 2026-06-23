import type {
  ContentCollection,
  ContentEntrySummary,
  ContentRoot,
  GitTreeEntry,
} from "@thunder/types";
import { getEntryTitle, isDraft } from "@/lib/content/schema";
import { getFormatFromPath, isContentFile, parseContentFile } from "@/lib/content/parser";

export function getContentRoots(projectContentRoots: string | null): ContentRoot[] {
  if (!projectContentRoots) return [];
  try {
    return JSON.parse(projectContentRoots) as ContentRoot[];
  } catch {
    return [];
  }
}

export function buildCollections(
  roots: ContentRoot[],
  tree: GitTreeEntry[],
): ContentCollection[] {
  return roots.map((root) => {
    const prefix = `${root.path}/`;
    const files = tree.filter(
      (entry) =>
        entry.type === "file" &&
        entry.path.startsWith(prefix) &&
        isContentFile(entry.path),
    );

    const subfolders = new Set<string>();
    for (const file of files) {
      const relative = file.path.slice(prefix.length);
      const parts = relative.split("/");
      if (parts.length > 1) {
        subfolders.add(parts[0]);
      }
    }

    const collectionCount = subfolders.size > 0 ? subfolders.size : 1;

    return {
      id: root.id,
      label: root.label,
      rootPath: root.path,
      entryCount: files.length,
      _subfolders: Array.from(subfolders),
      _collectionCount: collectionCount,
    } as ContentCollection & { _subfolders: string[]; _collectionCount: number };
  });
}

export function getImmediateChildFolders(
  root: ContentRoot,
  tree: GitTreeEntry[],
  parentFolderPath: string,
): string[] {
  const prefix = `${root.path}/${parentFolderPath}/`;
  const folders = new Set<string>();

  for (const entry of tree) {
    if (entry.type !== "file" || !isContentFile(entry.path)) continue;
    if (!entry.path.startsWith(prefix)) continue;

    const relative = entry.path.slice(prefix.length);
    const parts = relative.split("/");
    if (parts.length > 1) folders.add(parts[0]);
  }

  return Array.from(folders).sort();
}

export function countDirectEntries(
  root: ContentRoot,
  tree: GitTreeEntry[],
  folderPath: string,
): number {
  const prefix = `${root.path}/${folderPath}/`;

  return tree.filter((entry) => {
    if (entry.type !== "file" || !isContentFile(entry.path)) return false;
    if (!entry.path.startsWith(prefix)) return false;
    const relative = entry.path.slice(prefix.length);
    return relative.length > 0 && !relative.includes("/");
  }).length;
}

export function listEntriesInCollection(
  root: ContentRoot,
  tree: GitTreeEntry[],
  folderPath?: string,
): string[] {
  const prefix = folderPath ? `${root.path}/${folderPath}/` : `${root.path}/`;

  return tree
    .filter((entry) => {
      if (entry.type !== "file" || !isContentFile(entry.path)) return false;
      if (!entry.path.startsWith(prefix)) return false;

      const relative = entry.path.slice(prefix.length);
      return relative.length > 0 && !relative.includes("/");
    })
    .map((entry) => entry.path)
    .sort();
}

export interface ScannedCollection {
  id: string;
  label: string;
  rootId: string;
  rootPath: string;
  folderPath: string | null;
  group: string | null;
  entryCount: number;
}

function capitalizeFolder(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function buildScannedCollections(
  root: ContentRoot,
  tree: GitTreeEntry[],
): ScannedCollection[] {
  const topFolders = getSubfolders(root, tree);
  const collections: ScannedCollection[] = [];

  for (const topFolder of topFolders) {
    const childFolders = getImmediateChildFolders(root, tree, topFolder);
    const directCount = countDirectEntries(root, tree, topFolder);
    const groupLabel = capitalizeFolder(topFolder);

    if (childFolders.length > 0) {
      if (directCount > 0) {
        collections.push({
          id: `${root.id}--${topFolder}`,
          label: groupLabel,
          rootId: root.id,
          rootPath: root.path,
          folderPath: topFolder,
          group: null,
          entryCount: directCount,
        });
      }

      for (const childFolder of childFolders) {
        const nestedPath = `${topFolder}/${childFolder}`;
        collections.push({
          id: `${root.id}--${topFolder}--${childFolder}`,
          label: childFolder.toUpperCase(),
          rootId: root.id,
          rootPath: root.path,
          folderPath: nestedPath,
          group: groupLabel,
          entryCount: countDirectEntries(root, tree, nestedPath),
        });
      }

      continue;
    }

    collections.push({
      id: `${root.id}--${topFolder}`,
      label: groupLabel,
      rootId: root.id,
      rootPath: root.path,
      folderPath: topFolder,
      group: null,
      entryCount: directCount,
    });
  }

  return collections;
}

export function getSubfolders(root: ContentRoot, tree: GitTreeEntry[]): string[] {
  const prefix = `${root.path}/`;
  const folders = new Set<string>();

  for (const entry of tree) {
    if (entry.type !== "file" || !isContentFile(entry.path)) continue;
    if (!entry.path.startsWith(prefix)) continue;

    const relative = entry.path.slice(prefix.length);
    const parts = relative.split("/");
    if (parts.length > 1) folders.add(parts[0]);
  }

  return Array.from(folders).sort();
}

export function summarizeEntry(
  path: string,
  raw: string,
  collectionId: string,
): ContentEntrySummary {
  const format = getFormatFromPath(path);
  let frontmatter: Record<string, unknown> = {};

  if (format) {
    try {
      frontmatter = parseContentFile(path, raw).frontmatter;
    } catch {
      frontmatter = {};
    }
  }

  const dateValue = frontmatter.date ?? frontmatter.publishedAt ?? frontmatter.pubDate;

  return {
    path,
    title: getEntryTitle(frontmatter, path),
    draft: isDraft(frontmatter),
    date: dateValue ? String(dateValue) : undefined,
    collectionId,
  };
}