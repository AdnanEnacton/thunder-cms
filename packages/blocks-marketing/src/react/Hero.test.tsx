import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Hero } from "./Hero";
import { FeatureGrid } from "./FeatureGrid";

describe("Hero", () => {
  it("renders heading, subheading, and cta", () => {
    const html = renderToStaticMarkup(
      <Hero heading="Build faster with Thunder" subheading="Git-native CMS" cta={{ label: "Get started", href: "/signup" }} />,
    );
    expect(html).toContain("Build faster with Thunder");
    expect(html).toContain("Git-native CMS");
    expect(html).toContain('href="/signup"');
    expect(html).toContain("Get started");
    expect(html).toContain("thunder-hero--centered");
  });

  it("applies the variant class", () => {
    const html = renderToStaticMarkup(<Hero heading="H" variant="split" />);
    expect(html).toContain("thunder-hero--split");
  });
});

describe("FeatureGrid", () => {
  it("renders each feature", () => {
    const html = renderToStaticMarkup(
      <FeatureGrid
        columns={2}
        features={[
          { title: "Fast", body: "Ships quickly" },
          { title: "Open", body: "Git-native" },
        ]}
      />,
    );
    expect(html).toContain("Fast");
    expect(html).toContain("Ships quickly");
    expect(html).toContain("Open");
    expect(html).toContain("repeat(2, 1fr)");
  });
});
