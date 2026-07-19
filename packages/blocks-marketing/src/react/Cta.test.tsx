import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Cta } from "./Cta";
import { Testimonials } from "./Testimonials";

describe("Cta", () => {
  it("renders heading, subheading, and button", () => {
    const html = renderToStaticMarkup(
      <Cta heading="Ready to ship?" subheading="Try Thunder free" button={{ label: "Get started", href: "/signup" }} />,
    );
    expect(html).toContain("Ready to ship?");
    expect(html).toContain("Try Thunder free");
    expect(html).toContain('href="/signup"');
    expect(html).toContain("thunder-cta--solid");
  });

  it("applies the outline style", () => {
    const html = renderToStaticMarkup(<Cta heading="H" style="outline" />);
    expect(html).toContain("thunder-cta--outline");
  });
});

describe("Testimonials", () => {
  it("renders each testimonial with author and role", () => {
    const html = renderToStaticMarkup(
      <Testimonials
        heading="What people say"
        items={[
          { quote: "Thunder is fast", author: "Jane", role: "Engineer" },
          { quote: "Git-native and honest", author: "Sam" },
        ]}
      />,
    );
    expect(html).toContain("What people say");
    expect(html).toContain("Thunder is fast");
    expect(html).toContain("Jane");
    expect(html).toContain("Engineer");
    expect(html).toContain("Git-native and honest");
    expect(html).toContain("Sam");
  });
});
