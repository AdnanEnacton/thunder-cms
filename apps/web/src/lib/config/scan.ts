import type { ConfigFileSummary, ContentFormat, GitTreeEntry } from "@thunder/types";
import { getFormatFromPath, isContentFile } from "@/lib/content/parser";

const CONFIG_EXTENSIONS = /\.(json|ya?ml|toml|ts|js|mjs|cjs|env)$/i;

export function getConfigPaths(configPathsJson: string | null): string[] {
  if (!configPathsJson) return [];
  try {
    return JSON.parse(configPathsJson) as string[];
  } catch {
    return [];
  }
}

function getFormatForConfig(path: string): ContentFormat {
  const fromContent = getFormatFromPath(path);
  if (fromContent) return fromContent;
  if (/\.(ts|js|mjs|cjs)$/i.test(path)) return "text";
  return "text";
}

function isConfigLikeFile(path: string): boolean {
  return isContentFile(path) || CONFIG_EXTENSIONS.test(path);
}

export function listConfigFiles(
  tree: GitTreeEntry[],
  configPaths: string[],
): ConfigFileSummary[] {
  const files = new Map<string, ConfigFileSummary>();

  for (const configPath of configPaths) {
    const normalized = configPath.replace(/\/$/, "");
    const exact = tree.find((entry) => entry.type === "file" && entry.path === normalized);

    if (exact && isConfigLikeFile(exact.path)) {
      files.set(exact.path, {
        path: exact.path,
        name: exact.path.split("/").pop() ?? exact.path,
        format: getFormatForConfig(exact.path),
      });
      continue;
    }

    const prefix = `${normalized}/`;
    for (const entry of tree) {
      if (entry.type !== "file" || !isConfigLikeFile(entry.path)) continue;
      if (entry.path !== normalized && !entry.path.startsWith(prefix)) continue;

      files.set(entry.path, {
        path: entry.path,
        name: entry.path.split("/").pop() ?? entry.path,
        format: getFormatForConfig(entry.path),
      });
    }
  }

  return Array.from(files.values()).sort((a, b) => a.path.localeCompare(b.path));
}