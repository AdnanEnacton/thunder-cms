/** The starter `thunder.config.ts` committed by "Generate thunder.config.ts" (project settings). */
export function generateThunderConfigTemplate(): string {
  return `import type { ThunderBlocksConfig } from "@thunder/blocks-config";

export default {
  blocks: [
    {
      key: "hero",
      label: "Hero",
      import: { package: "@thunder/blocks-marketing", block: "hero" },
      defaults: {
        variant: "centered",
      },
    },
    {
      key: "featureGrid",
      label: "Feature grid",
      import: { package: "@thunder/blocks-marketing", block: "featureGrid" },
    },
    {
      key: "richText",
      label: "Rich text section",
      category: "Content",
      fields: [
        { name: "heading", label: "Heading", type: "string" },
        { name: "body", label: "Body", type: "richtext" },
      ],
    },
  ],
  pageTypes: [
    {
      key: "component",
      label: "Component page",
      storage: "frontmatter",
      allowedBlocks: ["hero", "featureGrid", "richText"],
    },
  ],
} satisfies ThunderBlocksConfig;
`;
}
