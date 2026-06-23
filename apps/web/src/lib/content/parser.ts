import matter from "gray-matter";
import YAML from "yaml";
import type { ContentFormat } from "@thunder/types";

const CONTENT_EXTENSIONS: Record<string, ContentFormat> = {
  ".md": "md",
  ".mdx": "mdx",
  ".json": "json",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".toml": "toml",
  ".ts": "text",
  ".js": "text",
  ".mjs": "text",
  ".cjs": "text",
};

export function getFormatFromPath(filePath: string): ContentFormat | null {
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  return CONTENT_EXTENSIONS[ext] ?? null;
}

export function isContentFile(filePath: string): boolean {
  return getFormatFromPath(filePath) !== null;
}

export function parseContentFile(filePath: string, raw: string) {
  const format = getFormatFromPath(filePath);
  if (!format) {
    throw new Error(`Unsupported file format: ${filePath}`);
  }

  if (format === "md" || format === "mdx") {
    const parsed = matter(raw);
    return {
      format,
      frontmatter: (parsed.data ?? {}) as Record<string, unknown>,
      body: parsed.content,
    };
  }

  if (format === "json") {
    const data = JSON.parse(raw) as Record<string, unknown>;
    const { body, content, ...frontmatter } = data;
    const textBody =
      typeof body === "string"
        ? body
        : typeof content === "string"
          ? content
          : "";
    return { format, frontmatter, body: textBody };
  }

  if (format === "yaml") {
    const data = YAML.parse(raw) as Record<string, unknown>;
    const { body, content, ...frontmatter } = data ?? {};
    const textBody =
      typeof body === "string"
        ? body
        : typeof content === "string"
          ? content
          : "";
    return { format, frontmatter: frontmatter ?? {}, body: textBody };
  }

  if (format === "text") {
    return { format, frontmatter: {}, body: raw };
  }

  return { format, frontmatter: {} as Record<string, unknown>, body: raw };
}

export function serializeContentFile(
  format: ContentFormat,
  frontmatter: Record<string, unknown>,
  body: string,
): string {
  if (format === "md" || format === "mdx") {
    return matter.stringify(body, frontmatter);
  }

  if (format === "json") {
    const payload = body.trim() ? { ...frontmatter, body } : frontmatter;
    return `${JSON.stringify(payload, null, 2)}\n`;
  }

  if (format === "yaml") {
    const payload = body.trim() ? { ...frontmatter, body } : frontmatter;
    return YAML.stringify(payload);
  }

  if (format === "text") {
    return body;
  }

  return body;
}