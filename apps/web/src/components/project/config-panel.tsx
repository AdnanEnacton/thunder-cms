"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileCode2, Settings2 } from "lucide-react";
import type { ConfigFileSummary } from "@thunder/types";
import { ConfigFileEditor } from "@/components/project/config-file-editor";

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
    <div className="flex flex-1 flex-col overflow-hidden">
      {error && <p className="px-6 py-2 text-sm text-red-400">{error}</p>}

      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center text-muted">
        {loading ? (
          <p>Loading config files...</p>
        ) : configPaths.length === 0 ? (
          <>
            <Settings2 className="h-10 w-10" />
            <p>No config paths configured for this project.</p>
            <Link
              href={`/dashboard/projects/${projectId}/setup`}
              className="text-sm text-thunder-400 hover:underline"
            >
              Add config paths in setup
            </Link>
          </>
        ) : files.length === 0 ? (
          <>
            <FileCode2 className="h-10 w-10" />
            <p>No config files found at the configured paths.</p>
          </>
        ) : (
          <>
            <FileCode2 className="h-10 w-10" />
            <p>Select a config file from the sidebar to edit.</p>
          </>
        )}
      </div>
    </div>
  );
}