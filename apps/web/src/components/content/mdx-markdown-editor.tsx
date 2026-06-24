"use client";

import dynamic from "next/dynamic";
import { forwardRef } from "react";
import type { MDXEditorMethods, MDXEditorProps } from "@mdxeditor/editor";

const Editor = dynamic(() => import("@/components/content/mdx-markdown-editor-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted">Loading editor...</div>
  ),
});

type EditorMode = "visual" | "markdown";

export const MDXMarkdownEditor = forwardRef<
  MDXEditorMethods,
  MDXEditorProps & { mode: EditorMode; projectId: string }
>((props, ref) => <Editor {...props} editorRef={ref} />);

MDXMarkdownEditor.displayName = "MDXMarkdownEditor";