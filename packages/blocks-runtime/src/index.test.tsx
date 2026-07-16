import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createBlocksRenderer } from "./index";

function Greeting({ name }: { name: string }) {
  return <p data-testid="greeting">Hello {name}</p>;
}

describe("createBlocksRenderer", () => {
  it("renders each block instance through its mapped component", () => {
    const Blocks = createBlocksRenderer({ blocks: [{ key: "greeting", label: "Greeting" }] }, { greeting: Greeting });
    const html = renderToStaticMarkup(
      <Blocks blocks={[{ _template: "greeting", name: "World" }, { _template: "greeting", name: "Thunder" }]} />,
    );
    expect(html).toContain("Hello World");
    expect(html).toContain("Hello Thunder");
  });

  it("merges defaults, content props, and dev-only props in the documented precedence order", () => {
    const Blocks = createBlocksRenderer(
      {
        blocks: [
          {
            key: "greeting",
            label: "Greeting",
            defaults: { name: "Default" },
            props: { name: "Forced" },
          },
        ],
      },
      { greeting: Greeting },
    );
    const html = renderToStaticMarkup(<Blocks blocks={[{ _template: "greeting" }]} />);
    // props (dev-only, applied last) wins over defaults when content doesn't set the field.
    expect(html).toContain("Hello Forced");
  });

  it("lets saved content override defaults but not dev-only props", () => {
    const Blocks = createBlocksRenderer(
      { blocks: [{ key: "greeting", label: "Greeting", defaults: { name: "Default" } }] },
      { greeting: Greeting },
    );
    const html = renderToStaticMarkup(<Blocks blocks={[{ _template: "greeting", name: "Editor-set" }]} />);
    expect(html).toContain("Hello Editor-set");
  });

  it("skips block instances with no matching component instead of throwing", () => {
    const Blocks = createBlocksRenderer({ blocks: [] }, {});
    const html = renderToStaticMarkup(<Blocks blocks={[{ _template: "unknown" }]} />);
    expect(html).toBe("");
  });
});
