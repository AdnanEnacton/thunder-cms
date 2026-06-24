"use client";

import { createContext, useContext } from "react";

type EditorMode = "visual" | "markdown";

const EditorModeContext = createContext<EditorMode>("visual");
const ProjectIdContext = createContext<string>("");

export function EditorProviders({
  mode,
  projectId,
  children,
}: {
  mode: EditorMode;
  projectId: string;
  children: React.ReactNode;
}) {
  return (
    <ProjectIdContext.Provider value={projectId}>
      <EditorModeContext.Provider value={mode}>{children}</EditorModeContext.Provider>
    </ProjectIdContext.Provider>
  );
}

export function useEditorMode() {
  return useContext(EditorModeContext);
}

export function useProjectId() {
  return useContext(ProjectIdContext);
}