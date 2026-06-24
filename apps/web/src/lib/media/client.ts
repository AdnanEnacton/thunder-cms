import type { MediaFileSummary } from "@thunder/types";

export async function uploadMediaFile(projectId: string, file: File, folder = ""): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  if (folder) formData.append("folder", folder);

  const response = await fetch(`/api/projects/${projectId}/media`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Failed to upload image");
  }

  return data.publicPath ?? data.path;
}

export async function fetchMediaLibrary(projectId: string, folder = ""): Promise<MediaFileSummary[]> {
  const params = new URLSearchParams();
  if (folder) params.set("folder", folder);

  const response = await fetch(`/api/projects/${projectId}/media?${params.toString()}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Failed to load media library");
  }

  return data.files ?? [];
}

export function getMediaPreviewUrl(projectId: string, path: string): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path;
  }
  return `/api/projects/${projectId}/media/raw?path=${encodeURIComponent(path)}`;
}

export async function resolveMediaPreviewUrl(projectId: string, src: string): Promise<string> {
  return getMediaPreviewUrl(projectId, src);
}