"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Grid2x2, ImageIcon, List, Trash2, Upload } from "lucide-react";
import type { MediaFileSummary } from "@thunder/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadingState } from "@/components/ui/loading-state";

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
  const [deletePath, setDeletePath] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

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
    <div className="flex flex-1 flex-col overflow-hidden bg-surface">
      <div className="flex items-center justify-between border-b border-border bg-surface-raised px-6 py-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Media library</h2>
          <p className="mt-0.5 text-sm text-muted">
            {mediaRoot && <span className="font-mono text-xs">{mediaRoot}</span>}
            {folder && <span> / {folder}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface-subtle p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                viewMode === "grid"
                  ? "bg-surface-raised text-foreground shadow-xs"
                  : "text-muted hover:text-foreground",
              )}
              title="Grid view"
              aria-label="Grid view"
            >
              <Grid2x2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                viewMode === "list"
                  ? "bg-surface-raised text-foreground shadow-xs"
                  : "text-muted hover:text-foreground",
              )}
              title="List view"
              aria-label="List view"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
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
          <Button onClick={() => inputRef.current?.click()} disabled={uploading} size="sm">
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </div>

      {folders.length > 1 && (
        <div className="flex flex-wrap gap-2 border-b border-border bg-surface-subtle px-6 py-3">
          {folders.map((item) => (
            <button
              key={item || "root"}
              type="button"
              onClick={() => setFolder(item)}
              className={cn(
                "rounded-full px-3.5 py-1 text-xs font-medium transition-all",
                folder === item
                  ? "bg-thunder-600 text-white shadow-sm"
                  : "bg-surface-raised text-muted border border-border hover:text-foreground",
              )}
            >
              {item || "All files"}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="border-b border-destructive/20 bg-destructive/5 px-6 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}
      {success && (
        <p className="border-b border-emerald-200 bg-emerald-50 px-6 py-2.5 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
          {success}
        </p>
      )}

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <LoadingState
            variant="panel"
            title="Loading media"
            description="Fetching images from your repository."
          />
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-overlay">
              <ImageIcon className="h-7 w-7 text-muted" />
            </div>
            <div>
              <p className="font-medium">No images found</p>
              <p className="mt-1 text-sm text-muted">Upload your first image to get started.</p>
            </div>
            <Button onClick={() => inputRef.current?.click()} size="sm">
              <Upload className="h-4 w-4" />
              Upload first image
            </Button>
          </div>
        ) : viewMode === "list" ? (
          <div className="overflow-hidden rounded-xl border border-border bg-surface-raised shadow-xs">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-subtle text-left text-xs text-muted">
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">Path</th>
                  <th className="w-[120px] px-4 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {files.map((file) => (
                  <tr key={file.path} className="group transition-colors hover:bg-surface-overlay">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={`/api/projects/${projectId}/media/raw?path=${encodeURIComponent(file.path)}`}
                          alt={file.name}
                          className="h-8 w-8 shrink-0 rounded-md border border-border object-cover"
                        />
                        <span className="truncate font-medium">{file.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <code className="truncate font-mono text-xs text-muted">{file.publicPath}</code>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-muted hover:text-foreground"
                          onClick={() => copyPath(file.publicPath)}
                        >
                          <Copy className="h-3 w-3" />
                          {copiedPath === file.publicPath ? "Copied" : ""}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-muted hover:text-destructive"
                          onClick={() => setDeletePath(file.path)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {files.map((file) => (
              <div
                key={file.path}
                className="group overflow-hidden rounded-xl border border-border bg-surface-raised shadow-xs transition-all hover:shadow-md"
              >
                <div className="aspect-video overflow-hidden bg-surface-overlay">
                  <img
                    src={`/api/projects/${projectId}/media/raw?path=${encodeURIComponent(file.path)}`}
                    alt={file.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="space-y-2 p-3.5">
                  <p className="truncate text-sm font-medium tracking-tight">{file.name}</p>
                  <p className="truncate font-mono text-[11px] text-muted">{file.publicPath}</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => copyPath(file.publicPath)}
                    >
                      <Copy className="h-3 w-3" />
                      {copiedPath === file.publicPath ? "Copied" : "Copy path"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeletePath(file.path)}
                      className="text-muted hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deletePath !== null}
        title="Delete this file?"
        description="This will permanently remove the image from your GitHub repository."
        confirmLabel="Delete file"
        variant="destructive"
        onConfirm={() => {
          if (deletePath) handleDelete(deletePath);
          setDeletePath(null);
        }}
        onCancel={() => setDeletePath(null)}
      />
    </div>
  );
}