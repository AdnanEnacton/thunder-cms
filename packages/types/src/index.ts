export type GitFramework = "astro" | "nextjs" | "hugo" | "eleventy" | "jekyll" | "nuxt" | "sveltekit" | "unknown";

export type ContentFormat = "md" | "mdx" | "json" | "yaml" | "toml" | "text";

export interface MediaFileSummary {
  path: string;
  name: string;
  folder: string;
  publicPath: string;
  size?: number;
}

export interface ConfigFileSummary {
  path: string;
  name: string;
  format: ContentFormat;
}

export type FieldType =
  | "string"
  | "text"
  | "number"
  | "boolean"
  | "date"
  | "tags"
  | "image"
  | "json"
  | "unknown";

export interface FieldSchema {
  name: string;
  type: FieldType;
  label: string;
}

export interface ContentRoot {
  id: string;
  label: string;
  path: string;
}

export interface ContentCollection {
  id: string;
  label: string;
  rootPath: string;
  entryCount: number;
}

export interface ContentEntrySummary {
  path: string;
  title: string;
  draft: boolean;
  date?: string;
  collectionId: string;
}

export interface ContentDocument {
  path: string;
  sha: string;
  format: ContentFormat;
  frontmatter: Record<string, unknown>;
  body: string;
  fields: FieldSchema[];
}

export interface ThunderConfig {
  version: 1;
  framework: GitFramework;
  content: {
    roots: ContentRoot[];
  };
  media: {
    root: string;
    publicPath: string;
  };
  code?: {
    root: string;
  };
  configs?: string[];
  git: {
    defaultBranch: string;
    commitMessageMode: "auto" | "custom";
  };
}

export interface GitRepo {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  defaultBranch: string;
  private: boolean;
}

export interface GitTreeEntry {
  path: string;
  type: "file" | "dir";
  sha?: string;
}

export interface FrameworkDefaults {
  framework: GitFramework;
  content: string;
  mediaRoot: string;
  mediaPublic: string;
  code: string;
  configs: string[];
}