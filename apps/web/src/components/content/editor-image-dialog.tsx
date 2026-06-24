"use client";

import type { MediaFileSummary } from "@thunder/types";
import {
  closeImageDialog$,
  imageDialogState$,
  saveImage$,
  useCellValues,
  usePublisher,
} from "@mdxeditor/editor";
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
import { useProjectId } from "@/components/content/editor-context";

type Tab = "upload" | "library" | "url";

export function EditorImageDialog() {
  const projectId = useProjectId();
  const [state] = useCellValues(imageDialogState$);
  const saveImage = usePublisher(saveImage$);
  const closeImageDialog = usePublisher(closeImageDialog$);

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

  const isEditing = state.type === "editing";
  const isOpen = state.type !== "inactive";

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
    if (!isOpen) return;

    if (state.type === "editing") {
      const { src = "", altText: alt = "", title: imgTitle = "" } = state.initialValues;
      setAltText(alt);
      setTitle(imgTitle);
      setUrl(src);
      setSelectedSrc(src);
      setTab(src.startsWith("http") ? "url" : "library");
    } else {
      resetForm();
    }
  }, [isOpen, state, resetForm]);

  useEffect(() => {
    if (!isOpen || tab !== "library" || !projectId) return;

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
  }, [isOpen, tab, projectId]);

  function handleClose() {
    closeImageDialog();
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

    const src = tab === "url" ? url.trim() : selectedSrc;

    if (pendingFile && projectId) {
      setUploading(true);
      uploadMediaFile(projectId, pendingFile)
        .then((publicPath) => {
          saveImage({
            src: publicPath,
            altText: altText || pendingFile.name.replace(/\.[^.]+$/, ""),
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

    if (!src) {
      setError("Select or upload an image first");
      return;
    }

    saveImage({
      src,
      altText: altText || undefined,
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

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-image-dialog-title"
        className="flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-surface-raised shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 id="editor-image-dialog-title" className="text-base font-semibold text-foreground">
                {isEditing ? "Edit image" : "Insert image"}
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                Upload to media library or pick an existing image
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-overlay hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex gap-1 border-b border-border bg-surface px-5 py-2">
            {([
              { id: "upload" as const, label: "Upload", icon: Upload },
              { id: "library" as const, label: "Media library", icon: ImageIcon },
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
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  tab === id
                    ? "bg-thunder-600 text-white"
                    : "text-muted hover:bg-surface-overlay hover:text-foreground",
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
                  "flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors",
                  dragOver
                    ? "border-thunder-400 bg-thunder-50"
                    : "border-border bg-surface hover:border-thunder-300 hover:bg-surface-overlay/50",
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
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-thunder-100 text-thunder-600">
                  <Upload className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-medium text-foreground">
                  {pendingFile ? pendingFile.name : "Drop an image here or click to browse"}
                </p>
                <p className="mt-1 text-xs text-muted">PNG, JPG, GIF, WebP, SVG — saved to your media library</p>
              </div>
            )}

            {tab === "library" && (
              <div>
                {libraryLoading ? (
                  <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading media library...
                  </div>
                ) : library.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <ImageIcon className="h-8 w-8 text-muted" />
                    <p className="text-sm text-muted">No images in your media library yet.</p>
                    <Button size="sm" variant="secondary" onClick={() => setTab("upload")}>
                      Upload first image
                    </Button>
                  </div>
                ) : (
                  <div className="grid max-h-[280px] grid-cols-3 gap-2 overflow-auto sm:grid-cols-4">
                    {library.map((file) => {
                      const isSelected = selectedSrc === file.publicPath;
                      return (
                        <button
                          key={file.path}
                          type="button"
                          onClick={() => selectLibraryImage(file)}
                          className={cn(
                            "group overflow-hidden rounded-lg border-2 text-left transition-all",
                            isSelected
                              ? "border-thunder-500 ring-2 ring-thunder-200"
                              : "border-border hover:border-thunder-300",
                          )}
                        >
                          <div className="aspect-square bg-surface">
                            <img
                              src={getMediaPreviewUrl(projectId, file.path)}
                              alt={file.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <p className="truncate px-1.5 py-1 text-[10px] text-muted group-hover:text-foreground">
                            {file.name}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {tab === "url" && (
              <div className="space-y-2">
                <Label htmlFor="image-url" className="text-sm font-medium">
                  Image URL
                </Label>
                <Input
                  id="image-url"
                  type="url"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setSelectedSrc(e.target.value);
                    setPendingFile(null);
                  }}
                  placeholder="https://example.com/image.jpg or /images/photo.png"
                />
                <p className="text-xs text-muted">Use a full URL or a site path like /images/photo.png</p>
              </div>
            )}

            <div className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="image-alt" className="text-sm font-medium">
                  Alt text
                </Label>
                <Input
                  id="image-alt"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Describe the image for accessibility"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="image-title" className="text-sm font-medium">
                  Title <span className="font-normal text-muted">(optional)</span>
                </Label>
                <Input
                  id="image-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Shown on hover"
                />
              </div>
            </div>

            {previewSrc && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Preview</p>
                <div className="overflow-hidden rounded-lg border border-border bg-surface p-2">
                  <img
                    src={previewSrc}
                    alt={altText || "Preview"}
                    className="mx-auto max-h-40 rounded object-contain"
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border bg-surface px-5 py-4">
            <Button variant="secondary" size="sm" onClick={handleClose} disabled={uploading}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleInsert} disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Uploading...
                </>
              ) : isEditing ? (
                "Save changes"
              ) : (
                "Insert image"
              )}
            </Button>
          </div>
        </div>
    </div>,
    document.body,
  );
}