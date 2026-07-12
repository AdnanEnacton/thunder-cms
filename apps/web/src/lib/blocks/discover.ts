import { parse } from "@babel/parser";
import type {
  Node,
  TSInterfaceDeclaration,
  TSPropertySignature,
  TSType,
  TSTypeAliasDeclaration,
  TSTypeElement,
} from "@babel/types";
import type { BlockDef, BlockFieldDef, BlockFieldType } from "@thunder/types";

export interface DiscoveredComponent {
  /** Component name derived from the file (e.g. "Hero"). */
  name: string;
  /** Repo-relative source path. */
  file: string;
  framework: "astro" | "react";
  fields: BlockFieldDef[];
}

const REACT_EXTS = [".tsx", ".jsx"];
const ASTRO_EXT = ".astro";

function isPascalCase(stem: string): boolean {
  return /^[A-Z][A-Za-z0-9]*$/.test(stem);
}

/**
 * Is this file a page-block component? Every `.astro` file qualifies. React files
 * qualify only when their name is PascalCase (the universal component convention)
 * — or an `index.{tsx,jsx}` inside a PascalCase folder — so utility modules like
 * `utils.ts` or `useThing.tsx` are not swept in as blocks.
 */
export function isComponentFile(path: string): boolean {
  const base = path.split("/").pop() ?? path;
  if (base.endsWith(ASTRO_EXT)) return true;
  if (!REACT_EXTS.some((e) => base.endsWith(e))) return false;
  const stem = base.replace(/\.(tsx|jsx)$/i, "");
  if (isPascalCase(stem)) return true;
  if (stem.toLowerCase() === "index") {
    const parent = path.split("/").slice(-2, -1)[0] ?? "";
    return isPascalCase(parent);
  }
  return false;
}

/** Extract a component name from its file path. */
export function componentNameFromPath(path: string): string {
  const base = path.split("/").pop() ?? path;
  const stem = base.replace(/\.(astro|tsx|jsx)$/i, "");
  // index.tsx → use the parent folder name instead.
  if (stem.toLowerCase() === "index") {
    const parts = path.split("/");
    return capitalize(parts[parts.length - 2] ?? stem);
  }
  return capitalize(stem);
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function toKey(name: string): string {
  const camel = name
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+(.)/g, (_, c) => c.toUpperCase());
  return camel.charAt(0).toLowerCase() + camel.slice(1);
}

export interface DiscoverOptions {
  /**
   * Return a zero-field block for components with no discoverable props instead
   * of null. Used by the folder-driven model, where a propless component is a
   * valid static block that renders the same content everywhere.
   */
  allowEmpty?: boolean;
}

/**
 * Parse a single component file and extract its prop shape as block fields.
 * With `allowEmpty`, a component with no props yields a zero-field block; without
 * it, such a component returns null.
 */
export function discoverComponent(
  path: string,
  content: string,
  opts: DiscoverOptions = {},
): DiscoveredComponent | null {
  const framework: "astro" | "react" = path.endsWith(ASTRO_EXT) ? "astro" : "react";
  const name = componentNameFromPath(path);
  const fields = extractFields(path, content, framework);

  if (fields.length === 0 && !opts.allowEmpty) return null;
  return { name, file: path, framework, fields };
}

/** Extract block fields from a component's props. Never throws; [] on failure. */
function extractFields(
  path: string,
  content: string,
  framework: "astro" | "react",
): BlockFieldDef[] {
  const source = framework === "astro" ? extractAstroFrontmatter(content) : content;
  if (!source.trim()) return [];

  let ast: Node;
  try {
    ast = parse(source, {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
      errorRecovery: true,
    }) as unknown as Node;
  } catch {
    return [];
  }

  const propsNode = findPropsDeclaration(ast, componentNameFromPath(path));
  if (!propsNode) return [];

  return getMembers(propsNode)
    .map((m) => memberToField(m))
    .filter((f): f is BlockFieldDef => f !== null);
}

/** Convert a discovered component into a proposed BlockDef. */
export function componentToBlockDef(c: DiscoveredComponent, category = "Components"): BlockDef {
  return {
    key: toKey(c.name),
    label: c.name,
    category,
    fields: c.fields,
    source: { kind: "component", file: c.file },
  };
}

// --- Astro frontmatter -----------------------------------------------------

function extractAstroFrontmatter(content: string): string {
  const match = content.match(/^\s*---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : "";
}

// --- AST traversal ---------------------------------------------------------

function findPropsDeclaration(
  ast: Node,
  componentName: string,
): TSInterfaceDeclaration | TSTypeAliasDeclaration | null {
  const candidates: (TSInterfaceDeclaration | TSTypeAliasDeclaration)[] = [];

  walk(ast, (node) => {
    if (node.type === "TSInterfaceDeclaration" || node.type === "TSTypeAliasDeclaration") {
      const id = node.id;
      if (id && id.type === "Identifier" && /props$/i.test(id.name)) {
        candidates.push(node);
      }
    }
  });

  if (candidates.length === 0) return null;
  // Prefer exactly "Props" or "<Component>Props"; else take the first.
  const exact = candidates.find((c) => {
    const n = c.id?.type === "Identifier" ? c.id.name : "";
    return n === "Props" || n.toLowerCase() === `${componentName.toLowerCase()}props`;
  });
  return exact ?? candidates[0];
}

function getMembers(
  node: TSInterfaceDeclaration | TSTypeAliasDeclaration,
): TSTypeElement[] {
  if (node.type === "TSInterfaceDeclaration") return node.body.body;
  if (node.typeAnnotation.type === "TSTypeLiteral") return node.typeAnnotation.members;
  return [];
}

function memberToField(member: TSTypeElement): BlockFieldDef | null {
  if (member.type !== "TSPropertySignature") return null;
  const sig = member as TSPropertySignature;
  if (!sig.key || sig.key.type !== "Identifier") return null;

  const name = sig.key.name;
  const typeNode = sig.typeAnnotation?.typeAnnotation;
  const mapped = typeNode ? mapType(typeNode, name) : { type: "string" as BlockFieldType };

  const field: BlockFieldDef = {
    name,
    label: humanize(name),
    type: mapped.type,
  };
  if (mapped.options?.length) field.options = mapped.options;
  if (mapped.fields?.length) field.fields = mapped.fields;
  if (mapped.of) field.of = mapped.of;
  // Babel omits `optional` for required props (only sets it to true for `?`).
  if (!sig.optional) field.required = true;
  return field;
}

interface MappedType {
  type: BlockFieldType;
  options?: string[];
  fields?: BlockFieldDef[];
  of?: BlockFieldDef;
}

function mapType(node: TSType, keyName: string): MappedType {
  const key = keyName.toLowerCase();

  switch (node.type) {
    case "TSStringKeyword":
      return { type: refineStringType(key) };
    case "TSNumberKeyword":
      return { type: "number" };
    case "TSBooleanKeyword":
      return { type: "boolean" };
    case "TSArrayType": {
      const el = node.elementType;
      if (el.type === "TSStringKeyword") return { type: "tags" };
      if (el.type === "TSTypeLiteral") {
        const fields = el.members
          .map((m) => memberToField(m))
          .filter((f): f is BlockFieldDef => f !== null);
        return { type: "array", of: { name: "item", label: "Item", type: "object", fields } };
      }
      return { type: "array" };
    }
    case "TSTypeLiteral": {
      const fields = node.members
        .map((m) => memberToField(m))
        .filter((f): f is BlockFieldDef => f !== null);
      return { type: "object", fields };
    }
    case "TSUnionType": {
      const literals = node.types
        .filter((t) => t.type === "TSLiteralType" && t.literal.type === "StringLiteral")
        .map((t) => (t.type === "TSLiteralType" && t.literal.type === "StringLiteral" ? t.literal.value : ""))
        .filter(Boolean);
      if (literals.length > 0 && literals.length === node.types.length) {
        return { type: "select", options: literals };
      }
      return { type: refineStringType(key) };
    }
    case "TSLiteralType":
      if (node.literal.type === "StringLiteral") {
        return { type: "select", options: [node.literal.value] };
      }
      return { type: refineStringType(key) };
    case "TSTypeReference": {
      // Array<T> reference form. (Babel 8 exposes generics as `typeArguments`.)
      const typeArgs = (node as unknown as { typeArguments?: { params: TSType[] } }).typeArguments;
      const firstArg = typeArgs?.params[0];
      if (node.typeName.type === "Identifier" && node.typeName.name === "Array" && firstArg) {
        return mapType(
          { type: "TSArrayType", elementType: firstArg } as TSType,
          keyName,
        );
      }
      return { type: refineStringType(key) };
    }
    default:
      return { type: refineStringType(key) };
  }
}

/** Refine a string-typed prop using its key name (image/url/long-text heuristics). */
function refineStringType(key: string): BlockFieldType {
  if (
    key === "image" ||
    key === "cover" ||
    key === "thumbnail" ||
    key.endsWith("image") ||
    key.endsWith("cover") ||
    key.endsWith("thumbnail") ||
    key.endsWith("src") ||
    key === "icon"
  ) {
    return "image";
  }
  if (key.includes("url") || key.includes("href") || key.includes("link")) return "url";
  if (
    key.includes("description") ||
    key.includes("content") ||
    key.includes("body") ||
    key.includes("paragraph") ||
    key.includes("excerpt")
  ) {
    return "text";
  }
  return "string";
}

function humanize(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

// --- minimal AST walker ----------------------------------------------------

function walk(node: unknown, visit: (n: Extract<Node, { type: string }>) => void): void {
  if (!node || typeof node !== "object") return;
  const n = node as Record<string, unknown>;
  if (typeof n.type === "string") {
    visit(node as Extract<Node, { type: string }>);
  }
  for (const key of Object.keys(n)) {
    if (key === "loc" || key === "start" || key === "end" || key === "range") continue;
    const value = n[key];
    if (Array.isArray(value)) {
      for (const child of value) walk(child, visit);
    } else if (value && typeof value === "object") {
      walk(value, visit);
    }
  }
}
