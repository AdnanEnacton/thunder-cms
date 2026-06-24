import type { GitTreeEntry, MediaFileSummary } from "@thunder/types";

const MEDIA_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg|avif|ico|bmp)$/i;

export function isMediaFile(filePath: string): boolean {
  return MEDIA_EXTENSIONS.test(filePath);
}

export function getMediaFolders(tree: GitTreeEntry[], mediaRoot: string): string[] {
  const prefix = `${mediaRoot}/`;
  const folders = new Set<string>([""]);

  for (const entry of tree) {
    if (entry.type !== "file" || !isMediaFile(entry.path)) continue;
    if (!entry.path.startsWith(prefix)) continue;

    const relative = entry.path.slice(prefix.length);
    const parts = relative.split("/");
    if (parts.length > 1) {
      folders.add(parts.slice(0, -1).join("/"));
    }
  }

  return Array.from(folders).sort();
}

export function toPublicPath(
  filePath: string,
  mediaRoot: string,
  mediaPublic: string,
): string {
  if (!filePath.startsWith(`${mediaRoot}/`)) return `/${filePath}`;
  const relative = filePath.slice(mediaRoot.length);
  const publicBase = mediaPublic.endsWith("/") ? mediaPublic.slice(0, -1) : mediaPublic;
  return `${publicBase.startsWith("/") ? "" : "/"}${publicBase}${relative}`.replace(/\\/g, "/");
}

export function fromPublicPath(
  publicPath: string,
  mediaRoot: string,
  mediaPublic: string,
): string {
  const normalized = publicPath.startsWith("/") ? publicPath : `/${publicPath}`;
  const publicBase = mediaPublic.startsWith("/") ? mediaPublic.slice(1) : mediaPublic;
  const publicBaseClean = publicBase.endsWith("/") ? publicBase.slice(0, -1) : publicBase;

  if (publicBaseClean) {
    const publicPrefix = `/${publicBaseClean}`;
    if (normalized.startsWith(`${publicPrefix}/`) || normalized === publicPrefix) {
      const relative = normalized.slice(publicPrefix.length);
      return `${publicBaseClean}${relative}`.replace(/\/+/g, "/");
    }
  }

  const mediaFolder = mediaRoot.split("/").pop() ?? "";
  if (mediaFolder) {
    const sitePrefix = `/${mediaFolder}`;
    if (normalized.startsWith(`${sitePrefix}/`) || normalized === sitePrefix) {
      const relative = normalized.slice(sitePrefix.length);
      return `${mediaRoot}${relative}`.replace(/\/+/g, "/");
    }
  }

  return publicPath.startsWith("/") ? publicPath.slice(1) : publicPath;
}

export function listMediaFiles(
  tree: GitTreeEntry[],
  mediaRoot: string,
  mediaPublic: string,
  folder = "",
): MediaFileSummary[] {
  const prefix = folder ? `${mediaRoot}/${folder}/` : `${mediaRoot}/`;

  return tree
    .filter((entry) => {
      if (entry.type !== "file" || !isMediaFile(entry.path)) return false;
      if (!entry.path.startsWith(prefix)) return false;
      const relative = entry.path.slice(prefix.length);
      return relative.length > 0 && !relative.includes("/");
    })
    .map((entry) => {
      const name = entry.path.split("/").pop() ?? entry.path;
      return {
        path: entry.path,
        name,
        folder,
        publicPath: toPublicPath(entry.path, mediaRoot, mediaPublic),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}