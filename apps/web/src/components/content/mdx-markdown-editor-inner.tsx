"use client";

import { useEffect, useMemo, type ForwardedRef } from "react";
import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CodeToggle,
  CreateLink,
  DiffSourceToggleWrapper,
  InsertCodeBlock,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  MDXEditor,
  Separator,
  UndoRedo,
  codeBlockPlugin,
  codeMirrorPlugin,
  diffSourcePlugin,
  headingsPlugin,
  imagePlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  usePublisher,
  viewMode$,
  type MDXEditorMethods,
  type MDXEditorProps,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { EditorImageDialog } from "@/components/content/editor-image-dialog";
import { EditorProviders, useEditorMode } from "@/components/content/editor-context";
import { resolveMediaPreviewUrl, uploadMediaFile } from "@/lib/media/client";

type EditorMode = "visual" | "markdown";

function ViewModeSync() {
  const mode = useEditorMode();
  const setViewMode = usePublisher(viewMode$);

  useEffect(() => {
    setViewMode(mode === "visual" ? "rich-text" : "source");
  }, [mode, setViewMode]);

  return null;
}

function createEditorPlugins(projectId: string) {
  return [
    headingsPlugin(),
    listsPlugin(),
    quotePlugin(),
    thematicBreakPlugin(),
    markdownShortcutPlugin(),
    linkPlugin(),
    linkDialogPlugin(),
    imagePlugin({
      imageUploadHandler: (file) => uploadMediaFile(projectId, file),
      imagePreviewHandler: (src) => resolveMediaPreviewUrl(projectId, src),
      ImageDialog: EditorImageDialog,
    }),
    tablePlugin(),
    codeBlockPlugin({ defaultCodeBlockLanguage: "js" }),
    codeMirrorPlugin({
      codeBlockLanguages: {
        js: "JavaScript",
        ts: "TypeScript",
        tsx: "TypeScript (React)",
        jsx: "JavaScript (React)",
        css: "CSS",
        html: "HTML",
        python: "Python",
        bash: "Bash",
        json: "JSON",
        markdown: "Markdown",
      },
    }),
    diffSourcePlugin(),
    toolbarPlugin({
      toolbarClassName: "thunder-mdx-toolbar",
      toolbarContents: () => (
        <>
          <ViewModeSync />
          <DiffSourceToggleWrapper options={[]}>
            <UndoRedo />
            <Separator />
            <BoldItalicUnderlineToggles />
            <CodeToggle />
            <Separator />
            <CreateLink />
            <ListsToggle />
            <Separator />
            <BlockTypeSelect />
            <Separator />
            <InsertImage />
            <InsertTable />
            <InsertThematicBreak />
            <Separator />
            <InsertCodeBlock />
          </DiffSourceToggleWrapper>
        </>
      ),
    }),
  ];
}

interface InitializedMDXEditorProps extends MDXEditorProps {
  editorRef: ForwardedRef<MDXEditorMethods> | null;
  mode: EditorMode;
  projectId: string;
}

export default function InitializedMDXEditor({
  editorRef,
  mode,
  projectId,
  ...props
}: InitializedMDXEditorProps) {
  const plugins = useMemo(() => createEditorPlugins(projectId), [projectId]);

  return (
    <EditorProviders mode={mode} projectId={projectId}>
      <MDXEditor
        ref={editorRef}
        plugins={plugins}
        className="mdxeditor thunder-mdx-editor"
        contentEditableClassName="thunder-mdx-content"
        {...props}
      />
    </EditorProviders>
  );
}