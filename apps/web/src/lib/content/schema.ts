import type { FieldSchema, FieldType } from "@thunder/types";

function humanize(name: string) {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

function inferTypeFromValue(value: unknown): FieldType {
  if (value === null || value === undefined) return "string";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (value instanceof Date) return "date";
  if (Array.isArray(value)) {
    if (value.length === 0 || value.every((item) => typeof item === "string")) return "tags";
    return "json";
  }
  if (typeof value === "object") {
    return "json";
  }
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return "date";
    if (value.startsWith("/") || value.startsWith("http") || value.includes("/images/")) {
      return "image";
    }
    if (value.length > 120) return "text";
    return "string";
  }
  return "string";
}

function mergeTypes(a: FieldType, b: FieldType): FieldType {
  if (a === b) return a;
  if (a === "unknown") return b;
  if (b === "unknown") return a;
  if (a === "json" || b === "json") return "json";
  if ((a === "string" && b === "text") || (a === "text" && b === "string")) return "text";
  return "string";
}

export function inferFieldSchema(name: string, value: unknown): FieldSchema {
  return {
    name,
    type: inferTypeFromValue(value),
    label: humanize(name),
  };
}

export function inferFieldsFromEntries(
  entries: Array<Record<string, unknown>>,
): FieldSchema[] {
  const fieldTypes = new Map<string, Set<FieldType>>();

  for (const entry of entries) {
    for (const [key, value] of Object.entries(entry)) {
      if (key === "body" || key === "content") continue;
      const type = inferTypeFromValue(value);
      if (!fieldTypes.has(key)) fieldTypes.set(key, new Set());
      fieldTypes.get(key)!.add(type);
    }
  }

  const fields: FieldSchema[] = [];

  for (const [name, types] of fieldTypes) {
    let merged: FieldType = "unknown";
    for (const type of types) {
      merged = mergeTypes(merged, type);
    }
    fields.push({ name, type: merged, label: humanize(name) });
  }

  const order = ["title", "name", "date", "publishedAt", "description", "draft", "image", "tags"];
  return fields.sort((a, b) => {
    const ai = order.indexOf(a.name);
    const bi = order.indexOf(b.name);
    if (ai === -1 && bi === -1) return a.name.localeCompare(b.name);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

export function getEntryTitle(frontmatter: Record<string, unknown>, path: string): string {
  const title =
    frontmatter.title ??
    frontmatter.name ??
    frontmatter.label ??
    path.split("/").pop()?.replace(/\.[^.]+$/, "");

  return String(title ?? "Untitled");
}

export function isDraft(frontmatter: Record<string, unknown>): boolean {
  return frontmatter.draft === true || frontmatter.published === false;
}