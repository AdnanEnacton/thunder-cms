"use client";

import type { MediaFileSummary } from "@thunder/types";
import { ImageIcon, Link2, Loader2, Upload, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchMediaLibrary,
  getMediaPreviewUrl,
  uploadMediaFile,
} from "@/lib/media/client";
import { cn } from "@/lib/utils";

type Tab = "upload" | "library" | "url";

export interface ImageInsertResult {
  src: string;
  alt?: string;
  title?: string;
}

interface ImageInsertDialogProps {
  open: boolean;
  projectId: string;
  onClose: () => void;
  onInsert: (result: ImageInsertResult) => void;
}

export function ImageInsertDialog({
  open,
  projectId,
  onClose,
  onInsert,
}: ImageInsertDialogProps) {
  const [tab, setTab] = useState<Tab>("upload");
  const [altText, setAltText] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [selectedSrc, setSelectedSrc] = useState("");
  const [selectedRepoPath, setSelectedRepoPath] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [library, setLibrary] = useState<MediaFileSummary[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setTab("upload");
    setAltText("");
    setTitle("");
    setUrl("");
    setSelectedSrc("");
    setSelectedRepoPath("");
    setPendingFile(null);
    setUploading(false);
    setError("");
    setDragOver(false);
  }, []);

  useEffect(() => {
    if (!open) {
      resetForm();
      return;
    }
  }, [open, resetForm]);

  useEffect(() => {
    if (!open || tab !== "library" || !projectId) return;

    let cancelled = false;
    setLibraryLoading(true);
    setError("");

    fetchMediaLibrary(projectId)
      .then((files) => {
        if (!cancelled) setLibrary(files);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load media");
      })
      .finally(() => {
        if (!cancelled) setLibraryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, tab, projectId]);

  function handleClose() {
    onClose();
    resetForm();
  }

  function handleFileSelect(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    setError("");
    setPendingFile(file);
    setSelectedSrc(URL.createObjectURL(file));
    setSelectedRepoPath("");
    setUrl("");
  }

  function handleInsert() {
    setError("");

    if (pendingFile && projectId) {
      setUploading(true);
      uploadMediaFile(projectId, pendingFile)
        .then((publicPath) => {
          onInsert({
            src: publicPath,
            alt: altText || pendingFile.name.replace(/\.[^.]+$/, ""),
            title: title || undefined,
          });
          handleClose();
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Failed to upload image");
        })
        .finally(() => setUploading(false));
      return;
    }

    const src = tab === "url" ? url.trim() : selectedSrc;
    if (!src) {
      setError("Select or upload an image first");
      return;
    }

    onInsert({
      src,
      alt: altText || undefined,
      title: title || undefined,
    });
    handleClose();
  }

  function selectLibraryImage(file: MediaFileSummary) {
    setSelectedSrc(file.publicPath);
    setSelectedRepoPath(file.path);
    setPendingFile(null);
    setUrl("");
    if (!altText) setAltText(file.name.replace(/\.[^.]+$/, ""));
  }

  const previewSrc = pendingFile
    ? selectedSrc
    : selectedSrc && projectId
      ? getMediaPreviewUrl(projectId, selectedRepoPath || selectedSrc)
      : url
        ? getMediaPreviewUrl(projectId, url)
        : "";

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-[2px]"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">Insert image</h2>
            <p className="mt-0.5 text-xs text-muted">Upload or pick from your media library</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-muted hover:bg-surface-overlay"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-border px-5 py-2">
          {([
            { id: "upload" as const, label: "Upload", icon: Upload },
            { id: "library" as const, label: "Library", icon: ImageIcon },
            { id: "url" as const, label: "URL", icon: Link2 },
          ]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id);
                setError("");
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium",
                tab === id
                  ? "bg-thunder-600 text-white"
                  : "text-muted hover:bg-surface-overlay",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto px-5 py-4">
          {tab === "upload" && (
            <div
              className={cn(
                "flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8",
                dragOver ? "border-thunder-400 bg-thunder-50" : "border-border hover:border-thunder-300",
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) handleFileSelect(file);
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
              <Upload className="h-8 w-8 text-thunder-500" />
              <p className="mt-2 text-sm font-medium">
                {pendingFile ? pendingFile.name : "Drop an image or click to browse"}
              </p>
            </div>
          )}

          {tab === "library" && (
            <div>
              {libraryLoading ? (
                <div className="flex justify-center py-12 text-sm text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : library.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted">No images in library yet.</p>
              ) : (
                <div className="grid max-h-[260px] grid-cols-4 gap-2 overflow-auto">
                  {library.map((file) => (
                    <button
                      key={file.path}
                      type="button"
                      onClick={() => selectLibraryImage(file)}
                      className={cn(
                        "overflow-hidden rounded-lg border-2",
                        selectedSrc === file.publicPath
                          ? "border-thunder-500"
                          : "border-border",
                      )}
                    >
                      <img
                        src={getMediaPreviewUrl(projectId, file.path)}
                        alt={file.name}
                        className="aspect-square w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "url" && (
            <Input
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setSelectedSrc(e.target.value);
                setPendingFile(null);
              }}
              placeholder="/images/photo.png"
            />
          )}

          <div className="mt-4 space-y-2">
            <Label htmlFor="img-alt">Alt text</Label>
            <Input id="img-alt" value={altText} onChange={(e) => setAltText(e.target.value)} />
          </div>

          {previewSrc && (
            <img src={previewSrc} alt="" className="mt-4 max-h-32 rounded-lg border border-border" />
          )}

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Button variant="secondary" size="sm" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleInsert} disabled={uploading}>
            {uploading ? "Uploading..." : "Insert"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}