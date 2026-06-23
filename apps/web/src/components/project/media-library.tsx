"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, ImageIcon, Trash2, Upload } from "lucide-react";
import type { MediaFileSummary } from "@thunder/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MediaLibraryProps {
  projectId: string;
}

export function MediaLibrary({ projectId }: MediaLibraryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mediaRoot, setMediaRoot] = useState("");
  const [folder, setFolder] = useState("");
  const [folders, setFolders] = useState<string[]>([]);
  const [files, setFiles] = useState<MediaFileSummary[]>([]);
  const [copiedPath, setCopiedPath] = useState("");

  async function loadMedia(selectedFolder = folder) {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (selectedFolder) params.set("folder", selectedFolder);

    const response = await fetch(`/api/projects/${projectId}/media?${params.toString()}`);
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Failed to load media");
      return;
    }

    setMediaRoot(data.mediaRoot ?? "");
    setFolders(data.folders ?? []);
    setFiles(data.files ?? []);
  }

  useEffect(() => {
    loadMedia();
  }, [projectId, folder]);

  async function handleUpload(fileList: FileList | null) {
    if (!fileList?.length) return;
    setUploading(true);
    setError("");
    setSuccess("");

    for (const file of Array.from(fileList)) {
      const formData = new FormData();
      formData.append("file", file);
      if (folder) formData.append("folder", folder);

      const response = await fetch(`/api/projects/${projectId}/media`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? `Failed to upload ${file.name}`);
        setUploading(false);
        return;
      }
    }

    setUploading(false);
    setSuccess("Upload complete");
    await loadMedia();
  }

  async function handleDelete(path: string) {
    if (!confirm("Delete this file from your repository?")) return;

    const response = await fetch(
      `/api/projects/${projectId}/media?path=${encodeURIComponent(path)}`,
      { method: "DELETE" },
    );

    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Failed to delete file");
      return;
    }

    await loadMedia();
  }

  async function copyPath(publicPath: string) {
    await navigator.clipboard.writeText(publicPath);
    setCopiedPath(publicPath);
    setTimeout(() => setCopiedPath(""), 2000);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h2 className="font-semibold">Media Library</h2>
          <p className="text-sm text-muted">
            {mediaRoot && <span className="font-mono">{mediaRoot}</span>}
            {folder && <span> / {folder}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              handleUpload(e.target.files);
              e.target.value = "";
            }}
          />
          <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </div>

      {folders.length > 1 && (
        <div className="flex flex-wrap gap-2 border-b border-border px-6 py-3">
          {folders.map((item) => (
            <button
              key={item || "root"}
              type="button"
              onClick={() => setFolder(item)}
              className={cn(
                "rounded-full px-3 py-1 text-xs",
                folder === item
                  ? "bg-thunder-600 text-white"
                  : "bg-surface-overlay text-muted hover:text-foreground",
              )}
            >
              {item || "All files"}
            </button>
          ))}
        </div>
      )}

      {error && <p className="px-6 py-2 text-sm text-red-400">{error}</p>}
      {success && <p className="px-6 py-2 text-sm text-green-400">{success}</p>}

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="py-16 text-center text-muted">Loading media...</div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center text-muted">
            <ImageIcon className="h-10 w-10" />
            <p>No images found in this folder.</p>
            <Button onClick={() => inputRef.current?.click()}>Upload first image</Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {files.map((file) => (
              <div
                key={file.path}
                className="overflow-hidden rounded-lg border border-border bg-surface-overlay"
              >
                <div className="aspect-video bg-surface-raised">
                  <img
                    src={`/api/projects/${projectId}/media/raw?path=${encodeURIComponent(file.path)}`}
                    alt={file.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="space-y-2 p-3">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="truncate font-mono text-xs text-muted">{file.publicPath}</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => copyPath(file.publicPath)}
                    >
                      <Copy className="h-3 w-3" />
                      {copiedPath === file.publicPath ? "Copied" : "Copy path"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(file.path)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}