import type { FrameworkDefaults, GitFramework, GitTreeEntry } from "@thunder/types";

const FRAMEWORK_DEFAULTS: Record<Exclude<GitFramework, "unknown">, FrameworkDefaults> = {
  astro: {
    framework: "astro",
    content: "src/content",
    mediaRoot: "public/images",
    mediaPublic: "public",
    code: "src/layouts",
    configs: ["src/config"],
  },
  nextjs: {
    framework: "nextjs",
    content: "src/content",
    mediaRoot: "public/images",
    mediaPublic: "public",
    code: "src/app",
    configs: ["src/config"],
  },
  hugo: {
    framework: "hugo",
    content: "content",
    mediaRoot: "static/images",
    mediaPublic: "static",
    code: "themes/layouts",
    configs: ["config", "data"],
  },
  eleventy: {
    framework: "eleventy",
    content: "src/content",
    mediaRoot: "public/images",
    mediaPublic: "public",
    code: "src/_includes",
    configs: ["src/_data"],
  },
  jekyll: {
    framework: "jekyll",
    content: "_posts",
    mediaRoot: "assets/images",
    mediaPublic: "assets",
    code: "_layouts",
    configs: ["_config.yml"],
  },
  nuxt: {
    framework: "nuxt",
    content: "content",
    mediaRoot: "public/images",
    mediaPublic: "public",
    code: "layouts",
    configs: ["nuxt.config.ts"],
  },
  sveltekit: {
    framework: "sveltekit",
    content: "src/content",
    mediaRoot: "static/images",
    mediaPublic: "static",
    code: "src/lib",
    configs: ["src/lib"],
  },
};

export function detectFramework(files: string[]): GitFramework {
  if (files.some((f) => f.includes("astro.config"))) return "astro";
  if (files.some((f) => f.includes("next.config"))) return "nextjs";
  if (files.some((f) => f === "hugo.toml" || f === "config.toml")) return "hugo";
  if (files.some((f) => f.includes("eleventy.config"))) return "eleventy";
  if (files.some((f) => f === "_config.yml")) return "jekyll";
  if (files.some((f) => f.includes("nuxt.config"))) return "nuxt";
  if (files.some((f) => f.includes("svelte.config"))) return "sveltekit";
  return "unknown";
}

export function getFrameworkDefaults(framework: GitFramework): FrameworkDefaults | null {
  if (framework === "unknown") return null;
  return FRAMEWORK_DEFAULTS[framework];
}

export function listDirectories(tree: GitTreeEntry[]): string[] {
  const dirs = new Set<string>();

  for (const entry of tree) {
    if (entry.type !== "dir") continue;
    dirs.add(entry.path);
    const parts = entry.path.split("/");
    for (let i = 1; i < parts.length; i++) {
      dirs.add(parts.slice(0, i).join("/"));
    }
  }

  return Array.from(dirs).sort();
}