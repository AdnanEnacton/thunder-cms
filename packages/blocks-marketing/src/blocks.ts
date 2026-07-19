import type { BlockConfigEntry } from "@thunder/types";

export const hero: BlockConfigEntry = {
  key: "hero",
  label: "Hero",
  category: "Marketing",
  import: { package: "@thunder/blocks-marketing", block: "hero" },
  fields: [
    { name: "heading", label: "Heading", type: "string", required: true },
    { name: "subheading", label: "Subheading", type: "text" },
    { name: "image", label: "Background image", type: "image" },
    {
      name: "cta",
      label: "Call to action",
      type: "object",
      fields: [
        { name: "label", label: "Label", type: "string" },
        { name: "href", label: "Link", type: "url" },
      ],
    },
    {
      name: "variant",
      label: "Layout",
      type: "select",
      options: ["centered", "split", "minimal"],
      default: "centered",
    },
  ],
};

export const cta: BlockConfigEntry = {
  key: "cta",
  label: "Call to action",
  category: "Marketing",
  import: { package: "@thunder/blocks-marketing", block: "cta" },
  fields: [
    { name: "heading", label: "Heading", type: "string", required: true },
    { name: "subheading", label: "Subheading", type: "text" },
    {
      name: "button",
      label: "Button",
      type: "object",
      fields: [
        { name: "label", label: "Label", type: "string" },
        { name: "href", label: "Link", type: "url" },
      ],
    },
    { name: "style", label: "Style", type: "select", options: ["solid", "outline"], default: "solid" },
  ],
};

export const testimonials: BlockConfigEntry = {
  key: "testimonials",
  label: "Testimonials",
  category: "Marketing",
  import: { package: "@thunder/blocks-marketing", block: "testimonials" },
  fields: [
    { name: "heading", label: "Heading", type: "string" },
    {
      name: "items",
      label: "Testimonials",
      type: "array",
      of: {
        name: "item",
        label: "Testimonial",
        type: "object",
        fields: [
          { name: "quote", label: "Quote", type: "text" },
          { name: "author", label: "Author", type: "string" },
          { name: "role", label: "Role", type: "string" },
          { name: "avatar", label: "Avatar", type: "image" },
        ],
      },
    },
  ],
};

export const featureGrid: BlockConfigEntry = {
  key: "featureGrid",
  label: "Feature grid",
  category: "Marketing",
  import: { package: "@thunder/blocks-marketing", block: "featureGrid" },
  fields: [
    { name: "columns", label: "Columns", type: "number", default: 3 },
    {
      name: "features",
      label: "Features",
      type: "array",
      of: {
        name: "feature",
        label: "Feature",
        type: "object",
        fields: [
          { name: "title", label: "Title", type: "string" },
          { name: "icon", label: "Icon", type: "string" },
          { name: "body", label: "Body", type: "text" },
        ],
      },
    },
  ],
};
