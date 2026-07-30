/**
 * Client-side SEO analysis for a content entry. Runs entirely in the browser
 * against the current frontmatter + body — no network, no AI key required.
 * Produces a 0–100 score and a list of actionable checks.
 */

export type SeoStatus = "good" | "warn" | "bad";

export interface SeoCheck {
  id: string;
  label: string;
  status: SeoStatus;
  message: string;
}

export interface SeoReport {
  score: number;
  checks: SeoCheck[];
}

// Frontmatter keys we treat as the meta description, in priority order.
const DESCRIPTION_KEYS = [
  "description",
  "metaDescription",
  "seoDescription",
  "excerpt",
  "summary",
  "subtitle",
];

function firstString(frontmatter: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = frontmatter[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function countWords(text: string): number {
  const stripped = text
    // Drop code fences so code doesn't inflate the word count.
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    // Strip markdown link/image syntax, keep visible text.
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~-]/g, " ");
  const words = stripped.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

// Weight per status: good = full credit, warn = half, bad = none.
const STATUS_WEIGHT: Record<SeoStatus, number> = { good: 1, warn: 0.5, bad: 0 };

export function analyzeSeo(
  frontmatter: Record<string, unknown>,
  body: string,
  filePath?: string,
): SeoReport {
  const checks: SeoCheck[] = [];

  // --- Title ---------------------------------------------------------------
  const title = typeof frontmatter.title === "string" ? frontmatter.title.trim() : "";
  if (!title) {
    checks.push({
      id: "title",
      label: "Title",
      status: "bad",
      message: "No title set. Add a `title` field — it's the most important SEO signal.",
    });
  } else if (title.length < 15) {
    checks.push({
      id: "title",
      label: "Title",
      status: "warn",
      message: `Title is short (${title.length} chars). Aim for 15–60 characters.`,
    });
  } else if (title.length > 60) {
    checks.push({
      id: "title",
      label: "Title",
      status: "warn",
      message: `Title is ${title.length} chars — search engines truncate around 60.`,
    });
  } else {
    checks.push({
      id: "title",
      label: "Title",
      status: "good",
      message: `Title length is ${title.length} characters — in the ideal 15–60 range.`,
    });
  }

  // --- Meta description ----------------------------------------------------
  const description = firstString(frontmatter, DESCRIPTION_KEYS);
  if (!description) {
    checks.push({
      id: "description",
      label: "Meta description",
      status: "bad",
      message:
        "No description found. Add a `description` (or `excerpt`/`summary`) of 50–160 characters.",
    });
  } else if (description.length < 50) {
    checks.push({
      id: "description",
      label: "Meta description",
      status: "warn",
      message: `Description is short (${description.length} chars). Aim for 50–160.`,
    });
  } else if (description.length > 160) {
    checks.push({
      id: "description",
      label: "Meta description",
      status: "warn",
      message: `Description is ${description.length} chars — search snippets cut off near 160.`,
    });
  } else {
    checks.push({
      id: "description",
      label: "Meta description",
      status: "good",
      message: `Description length is ${description.length} characters — well within 50–160.`,
    });
  }

  // --- Body length ---------------------------------------------------------
  const words = countWords(body);
  if (words < 50) {
    checks.push({
      id: "length",
      label: "Content length",
      status: "bad",
      message: `Only ${words} words. Thin content ranks poorly — aim for 300+.`,
    });
  } else if (words < 300) {
    checks.push({
      id: "length",
      label: "Content length",
      status: "warn",
      message: `${words} words. Consider expanding toward 300+ for better ranking.`,
    });
  } else {
    checks.push({
      id: "length",
      label: "Content length",
      status: "good",
      message: `${words} words — a healthy amount of content.`,
    });
  }

  // --- Headings / structure ------------------------------------------------
  const headingCount = (body.match(/^#{1,6}\s+\S/gm) ?? []).length;
  if (words >= 300 && headingCount === 0) {
    checks.push({
      id: "headings",
      label: "Headings",
      status: "warn",
      message: "No subheadings. Break long content up with `##` headings for readability.",
    });
  } else {
    checks.push({
      id: "headings",
      label: "Headings",
      status: "good",
      message:
        headingCount > 0
          ? `${headingCount} heading${headingCount === 1 ? "" : "s"} found — good structure.`
          : "Short content doesn't require subheadings.",
    });
  }

  // --- Image alt text ------------------------------------------------------
  const images = [...body.matchAll(/!\[([^\]]*)\]\(([^)]*)\)/g)];
  const missingAlt = images.filter((m) => !m[1].trim()).length;
  if (images.length === 0) {
    checks.push({
      id: "image-alt",
      label: "Image alt text",
      status: "good",
      message: "No inline images to check.",
    });
  } else if (missingAlt > 0) {
    checks.push({
      id: "image-alt",
      label: "Image alt text",
      status: "bad",
      message: `${missingAlt} of ${images.length} image${images.length === 1 ? "" : "s"} missing alt text. Add descriptions for accessibility and SEO.`,
    });
  } else {
    checks.push({
      id: "image-alt",
      label: "Image alt text",
      status: "good",
      message: `All ${images.length} image${images.length === 1 ? "" : "s"} have alt text.`,
    });
  }

  // --- Slug / filename -----------------------------------------------------
  if (filePath) {
    const slug = filePath.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "";
    if (slug.length > 60) {
      checks.push({
        id: "slug",
        label: "URL slug",
        status: "warn",
        message: `Slug "${slug}" is long. Short, keyword-focused slugs perform better.`,
      });
    } else if (/[A-Z_ ]/.test(slug)) {
      checks.push({
        id: "slug",
        label: "URL slug",
        status: "warn",
        message: "Slug has uppercase, spaces, or underscores. Prefer lowercase-hyphenated slugs.",
      });
    } else {
      checks.push({
        id: "slug",
        label: "URL slug",
        status: "good",
        message: "Slug is clean and search-friendly.",
      });
    }
  }

  const total = checks.reduce((sum, c) => sum + STATUS_WEIGHT[c.status], 0);
  const score = checks.length ? Math.round((total / checks.length) * 100) : 0;

  return { score, checks };
}
