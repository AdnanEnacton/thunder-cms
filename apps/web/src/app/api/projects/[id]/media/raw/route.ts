import { getFileBinary } from "@/lib/github";
import { getProjectForUser } from "@/lib/project-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await getProjectForUser(id);

  if ("error" in result) {
    return new Response(result.error, { status: result.error === "Unauthorized" ? 401 : 403 });
  }

  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");

  if (!path) {
    return new Response("path is required", { status: 400 });
  }

  const { project, token } = result;

  try {
    const { content } = await getFileBinary(
      token,
      project.gitRepoOwner!,
      project.gitRepoName!,
      path,
      project.defaultBranch,
    );

    const ext = path.split(".").pop()?.toLowerCase() ?? "";
    const type =
      ext === "png"
        ? "image/png"
        : ext === "jpg" || ext === "jpeg"
          ? "image/jpeg"
          : ext === "gif"
            ? "image/gif"
            : ext === "webp"
              ? "image/webp"
              : ext === "svg"
                ? "image/svg+xml"
                : "application/octet-stream";

    return new Response(new Uint8Array(content), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return new Response("Failed to load file", { status: 500 });
  }
}