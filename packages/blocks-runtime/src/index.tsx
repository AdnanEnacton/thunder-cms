import type { ComponentType } from "react";
import type { BlockConfigEntry, PageBlock, ThunderBlocksConfig } from "@thunder/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BlockComponent = ComponentType<any>;
export type BlockComponentMap = Record<string, BlockComponent>;

export interface BlocksProps {
  blocks: PageBlock[];
}

/**
 * Build a `<Blocks>` component for the user's site. `components` maps each
 * config block `key` to its real component — Thunder resolves fields for the
 * CMS from npm manifests, but rendering still needs an explicit static import
 * per block (no dynamic import of arbitrary npm packages at request time).
 */
export function createBlocksRenderer(config: ThunderBlocksConfig, components: BlockComponentMap) {
  const entryByKey = new Map<string, BlockConfigEntry>(config.blocks.map((b) => [b.key, b]));

  function Blocks({ blocks }: BlocksProps) {
    return (
      <>
        {blocks.map((block, index) => {
          const Component = components[block._template];
          if (!Component) return null;
          const entry = entryByKey.get(block._template);
          const { _template, ...contentProps } = block;
          return (
            <Component
              key={`${block._template}-${index}`}
              {...entry?.defaults}
              {...contentProps}
              {...entry?.props}
            />
          );
        })}
      </>
    );
  }

  return Blocks;
}
