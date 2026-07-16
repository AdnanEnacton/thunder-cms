import { parse } from "@babel/parser";
import type {
  Expression,
  ExportDefaultDeclaration,
  ImportDeclaration,
  ObjectExpression,
  ObjectProperty,
  Program,
  SpreadElement,
  VariableDeclaration,
} from "@babel/types";
import type { BlockConfigEntry, BlockFieldDef, PageTypeDef, ThunderBlocksConfig } from "@thunder/types";

export interface ThunderConfigParseIssue {
  message: string;
  path: string;
}

/**
 * A `blocks[]` entry we could not fully resolve statically — it spreads or
 * references an identifier imported from an npm package (e.g. `hero` from
 * `@thunder/blocks-marketing/blocks`). Phase B's manifest resolver fetches the
 * package and fills in `key`/`label`/`fields` from its manifest, merging these
 * `overrides` on top.
 */
export interface UnresolvedBlockRef {
  index: number;
  localName: string;
  importSource: string;
  importedName: string;
  overrides?: Record<string, unknown>;
}

export interface ThunderConfigParseResult {
  config: ThunderBlocksConfig | null;
  issues: ThunderConfigParseIssue[];
  unresolvedRefs: UnresolvedBlockRef[];
}

interface ImportBinding {
  source: string;
  imported: string;
}

/** Parse a `thunder.config.ts` source string. Never throws. */
export function parseThunderConfigSource(source: string): ThunderConfigParseResult {
  const issues: ThunderConfigParseIssue[] = [];
  const unresolvedRefs: UnresolvedBlockRef[] = [];

  let ast: Program;
  try {
    ast = parse(source, {
      sourceType: "module",
      plugins: ["typescript"],
      errorRecovery: true,
    }).program;
  } catch (err) {
    return {
      config: null,
      issues: [{ message: `Failed to parse thunder.config.ts: ${(err as Error).message}`, path: "" }],
      unresolvedRefs: [],
    };
  }

  const imports = collectImportBindings(ast);
  const locals = collectLocalObjectLiterals(ast);

  const exportDefault = ast.body.find(
    (n): n is ExportDefaultDeclaration => n.type === "ExportDefaultDeclaration",
  );
  if (!exportDefault) {
    issues.push({ message: "No `export default` found", path: "" });
    return { config: null, issues, unresolvedRefs };
  }

  const rootExpr = unwrapAssertions(exportDefault.declaration as Expression);
  if (rootExpr.type !== "ObjectExpression") {
    issues.push({ message: "Default export must be an object literal", path: "" });
    return { config: null, issues, unresolvedRefs };
  }

  const ctx: EvalContext = { imports, locals, issues };

  const blocksProp = findProperty(rootExpr, "blocks");
  const blocks: BlockConfigEntry[] = [];
  if (blocksProp) {
    const blocksValue = unwrapAssertions(blocksProp.value as Expression);
    if (blocksValue.type === "ArrayExpression") {
      blocksValue.elements.forEach((el, index) => {
        if (!el || el.type === "SpreadElement") {
          issues.push({ message: "Unsupported array element", path: `blocks[${index}]` });
          return;
        }
        const entry = parseBlockEntry(el as Expression, index, ctx, unresolvedRefs);
        if (entry) blocks.push(entry);
      });
    } else {
      issues.push({ message: "`blocks` must be an array literal", path: "blocks" });
    }
  } else {
    issues.push({ message: "Missing required `blocks` array", path: "blocks" });
  }

  const pageTypesProp = findProperty(rootExpr, "pageTypes");
  let pageTypes: PageTypeDef[] | undefined;
  if (pageTypesProp) {
    const val = evalLiteral(unwrapAssertions(pageTypesProp.value as Expression), ctx, "pageTypes");
    if (Array.isArray(val)) {
      pageTypes = val as PageTypeDef[];
    } else {
      issues.push({ message: "`pageTypes` must be an array literal", path: "pageTypes" });
    }
  }

  if (!blocksProp) {
    return { config: null, issues, unresolvedRefs };
  }

  const config: ThunderBlocksConfig = { blocks };
  if (pageTypes) config.pageTypes = pageTypes;

  return { config, issues, unresolvedRefs };
}

function unwrapAssertions(node: Expression): Expression {
  if (node.type === "TSSatisfiesExpression" || node.type === "TSAsExpression") {
    return unwrapAssertions(node.expression);
  }
  return node;
}

function collectImportBindings(ast: Program): Map<string, ImportBinding> {
  const map = new Map<string, ImportBinding>();
  for (const stmt of ast.body) {
    if (stmt.type !== "ImportDeclaration") continue;
    const decl = stmt as ImportDeclaration;
    if (decl.importKind === "type") continue;
    for (const spec of decl.specifiers) {
      if (spec.type === "ImportSpecifier") {
        const imported = spec.imported.type === "Identifier" ? spec.imported.name : spec.imported.value;
        map.set(spec.local.name, { source: decl.source.value, imported });
      } else if (spec.type === "ImportDefaultSpecifier") {
        map.set(spec.local.name, { source: decl.source.value, imported: "default" });
      }
    }
  }
  return map;
}

function collectLocalObjectLiterals(ast: Program): Map<string, ObjectExpression> {
  const map = new Map<string, ObjectExpression>();
  for (const stmt of ast.body) {
    if (stmt.type !== "VariableDeclaration") continue;
    const decl = stmt as VariableDeclaration;
    for (const d of decl.declarations) {
      if (d.id.type !== "Identifier" || !d.init) continue;
      const init = unwrapAssertions(d.init as Expression);
      if (init.type === "ObjectExpression") {
        map.set(d.id.name, init);
      }
    }
  }
  return map;
}

interface EvalContext {
  imports: Map<string, ImportBinding>;
  locals: Map<string, ObjectExpression>;
  issues: ThunderConfigParseIssue[];
}

function findProperty(obj: ObjectExpression, key: string): ObjectProperty | undefined {
  return obj.properties.find(
    (p): p is ObjectProperty =>
      p.type === "ObjectProperty" &&
      ((p.key.type === "Identifier" && p.key.name === key) ||
        (p.key.type === "StringLiteral" && p.key.value === key)),
  );
}

function parseBlockEntry(
  node: Expression,
  index: number,
  ctx: EvalContext,
  unresolvedRefs: UnresolvedBlockRef[],
): BlockConfigEntry | null {
  const expr = unwrapAssertions(node);

  if (expr.type === "Identifier") {
    const binding = ctx.imports.get(expr.name);
    if (binding) {
      unresolvedRefs.push({
        index,
        localName: expr.name,
        importSource: binding.source,
        importedName: binding.imported,
      });
      return null;
    }
    const local = ctx.locals.get(expr.name);
    if (local) {
      return objectToBlockEntry(local, `blocks[${index}]`, ctx);
    }
    ctx.issues.push({ message: `Unresolved identifier "${expr.name}"`, path: `blocks[${index}]` });
    return null;
  }

  if (expr.type !== "ObjectExpression") {
    ctx.issues.push({ message: "Block entry must be an object literal or identifier", path: `blocks[${index}]` });
    return null;
  }

  const spread = expr.properties.find((p): p is SpreadElement => p.type === "SpreadElement");
  if (spread && spread.argument.type === "Identifier") {
    const binding = ctx.imports.get(spread.argument.name);
    if (binding) {
      const overrides = objectExpressionToRecord(expr, ctx, `blocks[${index}]`, /* skipSpread */ true);
      unresolvedRefs.push({
        index,
        localName: spread.argument.name,
        importSource: binding.source,
        importedName: binding.imported,
        overrides,
      });
      return null;
    }
    const local = ctx.locals.get(spread.argument.name);
    if (local) {
      const merged: ObjectExpression = {
        ...expr,
        properties: [...local.properties, ...expr.properties.filter((p) => p !== spread)],
      };
      return objectToBlockEntry(merged, `blocks[${index}]`, ctx);
    }
  }

  return objectToBlockEntry(expr, `blocks[${index}]`, ctx);
}

function objectToBlockEntry(
  obj: ObjectExpression,
  path: string,
  ctx: EvalContext,
): BlockConfigEntry | null {
  const record = objectExpressionToRecord(obj, ctx, path, false);
  if (typeof record.key !== "string" || !record.key) {
    ctx.issues.push({ message: "Block entry is missing a string `key`", path });
    return null;
  }
  const entry: BlockConfigEntry = {
    key: record.key,
    label: typeof record.label === "string" ? record.label : record.key,
  };
  if (typeof record.category === "string") entry.category = record.category;
  if (typeof record.icon === "string") entry.icon = record.icon;
  if (typeof record.description === "string") entry.description = record.description;
  if (record.import && typeof record.import === "object") {
    entry.import = record.import as BlockConfigEntry["import"];
  }
  if (Array.isArray(record.fields)) entry.fields = record.fields as BlockFieldDef[];
  if (record.defaults && typeof record.defaults === "object") {
    entry.defaults = record.defaults as Record<string, unknown>;
  }
  if (record.props && typeof record.props === "object") {
    entry.props = record.props as Record<string, unknown>;
  }
  return entry;
}

function objectExpressionToRecord(
  obj: ObjectExpression,
  ctx: EvalContext,
  path: string,
  skipSpread: boolean,
): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const prop of obj.properties) {
    if (prop.type === "SpreadElement") {
      if (skipSpread) continue;
      ctx.issues.push({ message: "Unsupported spread", path });
      continue;
    }
    if (prop.type !== "ObjectProperty") continue;
    const key =
      prop.key.type === "Identifier"
        ? prop.key.name
        : prop.key.type === "StringLiteral"
          ? prop.key.value
          : null;
    if (!key) continue;
    const dynamic = key === "props";
    record[key] = evalLiteral(unwrapAssertions(prop.value as Expression), ctx, `${path}.${key}`, dynamic);
  }
  return record;
}

function evalLiteral(node: Expression, ctx: EvalContext, path: string, dynamicOk = false): unknown {
  switch (node.type) {
    case "StringLiteral":
      return node.value;
    case "NumericLiteral":
      return node.value;
    case "BooleanLiteral":
      return node.value;
    case "NullLiteral":
      return null;
    case "TemplateLiteral":
      if (node.expressions.length === 0) return node.quasis.map((q) => q.value.cooked ?? "").join("");
      if (dynamicOk) return { $expression: "<template literal>" };
      ctx.issues.push({ message: "Template literals with expressions are not supported", path });
      return undefined;
    case "ObjectExpression": {
      const out: Record<string, unknown> = {};
      for (const prop of node.properties) {
        if (prop.type !== "ObjectProperty") {
          if (dynamicOk) continue;
          ctx.issues.push({ message: "Unsupported spread", path });
          continue;
        }
        const key =
          prop.key.type === "Identifier"
            ? prop.key.name
            : prop.key.type === "StringLiteral"
              ? prop.key.value
              : null;
        if (!key) continue;
        out[key] = evalLiteral(unwrapAssertions(prop.value as Expression), ctx, `${path}.${key}`, dynamicOk);
      }
      return out;
    }
    case "ArrayExpression": {
      const out: unknown[] = [];
      node.elements.forEach((el, i) => {
        if (!el || el.type === "SpreadElement") {
          if (!dynamicOk) ctx.issues.push({ message: "Unsupported array element", path: `${path}[${i}]` });
          return;
        }
        out.push(evalLiteral(unwrapAssertions(el as Expression), ctx, `${path}[${i}]`, dynamicOk));
      });
      return out;
    }
    case "Identifier": {
      const local = ctx.locals.get(node.name);
      if (local) return evalLiteral(local, ctx, path, dynamicOk);
      if (dynamicOk) return { $expression: node.name };
      ctx.issues.push({ message: `Unresolved identifier "${node.name}"`, path });
      return undefined;
    }
    default:
      if (dynamicOk) return { $expression: "<dynamic>" };
      ctx.issues.push({ message: `Unsupported expression: ${node.type}`, path });
      return undefined;
  }
}
