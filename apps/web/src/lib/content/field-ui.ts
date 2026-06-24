export type ControlKind =
  | "toggle"
  | "text"
  | "textarea"
  | "number"
  | "url"
  | "image"
  | "select"
  | "tags"
  | "object"
  | "array";

export function isImageFieldKey(key: string): boolean {
  const k = key.toLowerCase();
  return (
    k === "image" ||
    k === "thumbnail" ||
    k === "cover" ||
    k.endsWith("image") ||
    k.endsWith("thumbnail") ||
    k.endsWith("cover")
  );
}

export function isImagePath(value: string): boolean {
  return (
    value.startsWith("data:image/") ||
    /\.(png|jpe?g|gif|webp|svg|avif|ico)(\?.*)?$/i.test(value)
  );
}

export function resolveImageUrl(imageUrl: string, projectId?: string): string {
  if (!imageUrl) return "";
  if (
    imageUrl.startsWith("http://") ||
    imageUrl.startsWith("https://") ||
    imageUrl.startsWith("data:")
  ) {
    return imageUrl;
  }
  if (projectId) {
    return `/api/projects/${projectId}/media/raw?path=${encodeURIComponent(imageUrl)}`;
  }
  return imageUrl;
}

export function humanizeFieldKey(key: string): string {
  if (key === "_template") return "Type";
  if (key === "_note") return "Note";

  return key
    .replace(/^_/, "")
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

export function inferControlKind(key: string, value: unknown): ControlKind {
  if (typeof value === "boolean") {
    return "toggle";
  }

  if (typeof value === "number") return "number";

  if (Array.isArray(value)) {
    if (value.length === 0 || value.every((item) => typeof item === "string")) return "tags";
    return "array";
  }

  if (typeof value === "object" && value !== null) return "object";

  if (typeof value === "string") {
    const k = key.toLowerCase();
    if (k === "trigger" && /^\d+$/.test(value)) return "number";
    if (k === "template" || k === "_template") return "select";
    if (
      k.includes("content") ||
      k.includes("paragraph") ||
      k.includes("description") ||
      k.includes("note")
    ) {
      return "textarea";
    }
    if (isImageFieldKey(k) || (isImagePath(value) && !k.includes("link") && !k.includes("url") && k !== "href")) {
      return "image";
    }
    if (k.includes("link") || k.includes("url") || k.includes("href") || k === "src") {
      return "url";
    }
    if (value.length > 120) return "textarea";
    return "text";
  }

  return "text";
}

export function sortObjectKeys(keys: string[]): string[] {
  const priority = [
    "_template",
    "template",
    "title",
    "name",
    "label",
    "enable",
    "enabled",
    "draft",
    "content",
    "paragraph",
    "description",
  ];

  return [...keys].sort((a, b) => {
    const ai = priority.indexOf(a);
    const bi = priority.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

export function collectTemplateOptions(values: unknown[]): string[] {
  const options = new Set<string>();

  for (const value of values) {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const template = (value as Record<string, unknown>)._template;
      if (typeof template === "string" && template.trim()) {
        options.add(template);
      }
    }
  }

  return Array.from(options).sort();
}

export function getSectionDisplayName(item: unknown, index: number): string {
  if (typeof item === "object" && item !== null && !Array.isArray(item)) {
    const record = item as Record<string, unknown>;
    const template = record._template ?? record.template;
    if (typeof template === "string" && template.trim()) {
      return humanizeFieldKey(template);
    }
    const title = record.title ?? record.name ?? record.label;
    if (typeof title === "string" && title.trim()) {
      return title.length > 56 ? `${title.slice(0, 56)}…` : title;
    }
  }

  return `Section ${index + 1}`;
}

export function getListItemLabel(parentKey: string, index: number): string {
  return `${humanizeFieldKey(parentKey)} Item ${index + 1}`;
}

const LIST_ARRAY_KEYS = new Set([
  "logos",
  "images",
  "items",
  "features",
  "cards",
  "testimonials",
  "faqs",
  "buttons",
  "steps",
  "plans",
  "members",
]);

export function isListArrayField(fieldKey: string, value: unknown[]): boolean {
  if (LIST_ARRAY_KEYS.has(fieldKey.toLowerCase())) return true;
  if (value.length === 0) return false;
  return value.some((item) => typeof item === "object" && item !== null && !Array.isArray(item));
}

export function getArrayItemLabel(item: unknown, index: number, parentKey?: string): string {
  if (parentKey) {
    return getListItemLabel(parentKey, index);
  }
  if (typeof item === "object" && item !== null && !Array.isArray(item)) {
    const record = item as Record<string, unknown>;
    const template = record._template ?? record.template;
    if (typeof template === "string" && template.trim()) {
      return `${humanizeFieldKey(String(template))} ${index + 1}`;
    }
    const title = record.title ?? record.name ?? record.label;
    if (typeof title === "string" && title.trim()) {
      return title.length > 48 ? `${title.slice(0, 48)}…` : title;
    }
  }

  return `Item ${index + 1}`;
}