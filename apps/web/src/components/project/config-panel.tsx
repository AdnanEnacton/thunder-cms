"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileCode2, Settings2 } from "lucide-react";
import type { ConfigFileSummary } from "@thunder/types";
import { ConfigFileEditor } from "@/components/project/config-file-editor";
import { LoadingState } from "@/components/ui/loading-state";

interface ConfigPanelProps {
  projectId: string;
  selectedFile: string | null;
  onSelectFile: (path: string | null) => void;
}

export function ConfigPanel({ projectId, selectedFile, onSelectFile }: ConfigPanelProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [configPaths, setConfigPaths] = useState<string[]>([]);
  const [files, setFiles] = useState<ConfigFileSummary[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/configs`);
      const data = await response.json();
      setLoading(false);

      if (!response.ok) {
        setError(data.error ?? "Failed to load config files");
        return;
      }

      setConfigPaths(data.configPaths ?? []);
      setFiles(data.files ?? []);
    }

    load();
  }, [projectId]);

  if (selectedFile) {
    return (
      <ConfigFileEditor
        projectId={projectId}
        filePath={selectedFile}
        onBack={() => onSelectFile(null)}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-surface">
      {error && (
        <p className="border-b border-destructive/20 bg-destructive/5 px-6 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        {loading ? (
          <LoadingState
            variant="panel"
            title="Loading config files"
            description="Scanning configuration paths in your repository."
          />
        ) : configPaths.length === 0 ? (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-overlay">
              <Settings2 className="h-7 w-7 text-muted" />
            </div>
            <div>
              <p className="font-medium">No config paths configured</p>
              <p className="mt-1 text-sm text-muted">
                Add config paths during project setup to edit configuration files.
              </p>
            </div>
            <Link
              href={`/dashboard/projects/${projectId}/setup`}
              className="text-sm font-medium text-thunder-600 hover:text-thunder-700 hover:underline"
            >
              Re-run setup
            </Link>
          </>
        ) : (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-overlay">
              <FileCode2 className="h-7 w-7 text-muted" />
            </div>
            <div>
              <p className="font-medium">Select a config file</p>
              <p className="mt-1 text-sm text-muted">
                Choose a file from the sidebar to start editing.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}