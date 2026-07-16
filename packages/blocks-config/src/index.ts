import { z } from "zod";
import type { ThunderBlocksConfig } from "@thunder/types";

export type {
  BlockConfigEntry,
  BlockFieldDef,
  BlockFieldType,
  BlockImportSpec,
  PageTypeDef,
  ThunderBlocksConfig,
} from "@thunder/types";

/** Identity helper so `thunder.config.ts` gets type-checking + editor autocomplete. */
export function defineThunderConfig(config: ThunderBlocksConfig): ThunderBlocksConfig {
  return config;
}

const blockImportSpecSchema = z.union([
  z.object({ from: z.string().min(1), export: z.string().optional() }),
  z.object({ package: z.string().min(1), block: z.string().min(1) }),
]);

const blockFieldDefSchema: z.ZodType = z.lazy(() =>
  z.object({ name: z.string().min(1), label: z.string(), type: z.string() }).passthrough(),
);

const blockConfigEntrySchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  category: z.string().optional(),
  icon: z.string().optional(),
  description: z.string().optional(),
  import: blockImportSpecSchema.optional(),
  fields: z.array(blockFieldDefSchema).optional(),
  defaults: z.record(z.string(), z.unknown()).optional(),
  props: z.record(z.string(), z.unknown()).optional(),
});

const pageTypeDefSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
  storage: z.enum(["frontmatter", "mdx-body"]),
  allowedBlocks: z.array(z.string()).optional(),
  fields: z.array(blockFieldDefSchema).optional(),
});

export const thunderBlocksConfigSchema = z.object({
  blocks: z.array(blockConfigEntrySchema),
  pageTypes: z.array(pageTypeDefSchema).optional(),
});

export function validateThunderConfig(config: unknown) {
  return thunderBlocksConfigSchema.safeParse(config);
}
