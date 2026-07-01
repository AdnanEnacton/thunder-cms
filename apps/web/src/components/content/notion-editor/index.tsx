"use client";

import dynamic from "next/dynamic";

const NotionEditorLazy = dynamic(
  () => import("./notion-editor").then((m) => m.NotionEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-thunder-200 border-t-thunder-600" />
      </div>
    ),
  },
);

export { NotionEditorLazy as NotionEditor };