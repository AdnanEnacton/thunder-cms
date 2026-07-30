import {
  AlertTriangle,
  ChevronDown,
  Code2,
  Megaphone,
  MessageSquare,
  MousePointerClick,
  Youtube,
  type LucideIcon,
} from "lucide-react";

/**
 * MDX shortcode / component registry (Phase 5.4). Each entry describes a
 * component an author can drop into a Markdown/MDX body: its editable props and
 * how to render the final MDX string. The shortcode dialog builds a small form
 * from `fields` and inserts `build(values)` at the caret. This is source-level
 * (works in Markdown mode) — no runtime component resolution is required by the
 * CMS; the target site's MDX pipeline renders these at build time.
 */

export type ShortcodeFieldType = "text" | "textarea" | "url" | "select";

export interface ShortcodeField {
  name: string;
  label: string;
  type: ShortcodeFieldType;
  placeholder?: string;
  default?: string;
  options?: { value: string; label: string }[];
  /** Rendered as the component's children rather than a prop. */
  isChildren?: boolean;
}

export interface Shortcode {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  fields: ShortcodeField[];
  build: (values: Record<string, string>) => string;
}

/** Escape a double-quoted JSX attribute value. */
function attr(value: string): string {
  return value.replace(/"/g, "&quot;");
}

export const SHORTCODES: Shortcode[] = [
  {
    id: "callout",
    label: "Callout",
    description: "Highlighted admonition box (info, warning, success, danger).",
    icon: Megaphone,
    fields: [
      {
        name: "type",
        label: "Type",
        type: "select",
        default: "info",
        options: [
          { value: "info", label: "Info" },
          { value: "warning", label: "Warning" },
          { value: "success", label: "Success" },
          { value: "danger", label: "Danger" },
        ],
      },
      { name: "title", label: "Title", type: "text", placeholder: "Good to know" },
      {
        name: "body",
        label: "Body",
        type: "textarea",
        placeholder: "Write the callout content…",
        isChildren: true,
      },
    ],
    build: (v) =>
      `<Callout type="${attr(v.type || "info")}"${v.title ? ` title="${attr(v.title)}"` : ""}>\n${v.body || ""}\n</Callout>`,
  },
  {
    id: "note",
    label: "Note",
    description: "Simple note block for a short aside.",
    icon: MessageSquare,
    fields: [
      { name: "body", label: "Text", type: "textarea", placeholder: "A quick note…", isChildren: true },
    ],
    build: (v) => `<Note>\n${v.body || ""}\n</Note>`,
  },
  {
    id: "warning",
    label: "Warning",
    description: "Prominent warning banner.",
    icon: AlertTriangle,
    fields: [
      { name: "body", label: "Text", type: "textarea", placeholder: "Be careful…", isChildren: true },
    ],
    build: (v) => `<Warning>\n${v.body || ""}\n</Warning>`,
  },
  {
    id: "youtube",
    label: "YouTube",
    description: "Embed a YouTube video by id or URL.",
    icon: Youtube,
    fields: [
      { name: "id", label: "Video ID or URL", type: "text", placeholder: "dQw4w9WgXcQ" },
    ],
    build: (v) => {
      const raw = (v.id || "").trim();
      // Accept a full URL and pull out the id.
      const match = raw.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
      const id = match ? match[1] : raw;
      return `<YouTube id="${attr(id)}" />`;
    },
  },
  {
    id: "codesandbox",
    label: "CodeSandbox",
    description: "Embed a CodeSandbox by id.",
    icon: Code2,
    fields: [{ name: "id", label: "Sandbox ID", type: "text", placeholder: "new" }],
    build: (v) => `<CodeSandbox id="${attr((v.id || "").trim())}" />`,
  },
  {
    id: "details",
    label: "Accordion",
    description: "Collapsible details/summary disclosure.",
    icon: ChevronDown,
    fields: [
      { name: "summary", label: "Summary", type: "text", placeholder: "Show more" },
      { name: "body", label: "Content", type: "textarea", placeholder: "Hidden content…", isChildren: true },
    ],
    build: (v) =>
      `<Details summary="${attr(v.summary || "Details")}">\n${v.body || ""}\n</Details>`,
  },
  {
    id: "button",
    label: "Button link",
    description: "Call-to-action button linking somewhere.",
    icon: MousePointerClick,
    fields: [
      { name: "label", label: "Label", type: "text", placeholder: "Get started" },
      { name: "href", label: "Link", type: "url", placeholder: "https://…" },
    ],
    build: (v) => `<ButtonLink href="${attr(v.href || "#")}">${v.label || "Learn more"}</ButtonLink>`,
  },
];

export function getShortcode(id: string): Shortcode | undefined {
  return SHORTCODES.find((s) => s.id === id);
}
