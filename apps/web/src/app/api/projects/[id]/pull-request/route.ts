import { NextResponse } from "next/server";
import { z } from "zod";
import { getGitProvider } from "@/lib/git";
import { getProjectForUser } from "@/lib/project-auth";
import { prisma } from "@thunder/database";

/**
 * Pull-request workflow: open a PR from the project's target (working) branch
 * into its default branch — the "staging → main" review flow. Any project
 * member who can commit content can open one.
 */

function resolveBranches(project: { targetBranch: string | null; defaultBranch: string }) {
  const base = project.defaultBranch;
  const head = project.targetBranch ?? project.defaultBranch;
  return { base, head };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await getProjectForUser(id);

  if ("error" in result) {
    const status = result.error === "Unauthorized" ? 401 : result.error === "Not found" ? 404 : 403;
    return NextResponse.json({ error: result.error }, { status });
  }

  const { project, token } = result;
  const { base, head } = resolveBranches(project);
  const needsPr = head !== base;

  if (!needsPr) {
    return NextResponse.json({ needsPr: false, base, head, existing: null, aheadBy: 0 });
  }

  const git = getGitProvider(project, token);

  try {
    const [existing, comparison] = await Promise.all([
      git.getOpenPullRequest(head, base),
      git.compareBranches(base, head).catch(() => ({ aheadBy: 0, behindBy: 0 })),
    ]);

    return NextResponse.json({
      needsPr: true,
      base,
      head,
      existing,
      aheadBy: comparison.aheadBy,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load pull request status" }, { status: 500 });
  }
}

const postSchema = z.object({
  title: z.string().trim().min(1).max(256).optional(),
  body: z.string().max(4000).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await getProjectForUser(id);

  if ("error" in result) {
    const status = result.error === "Unauthorized" ? 401 : result.error === "Not found" ? 404 : 403;
    return NextResponse.json({ error: result.error }, { status });
  }

  const { project, token, session } = result;
  const { base, head } = resolveBranches(project);

  if (head === base) {
    return NextResponse.json(
      { error: "Set a target branch different from the default branch to open a pull request." },
      { status: 400 },
    );
  }

  const parsed = postSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const git = getGitProvider(project, token);

  try {
    // If a PR already exists for head→base, return it instead of erroring.
    const existing = await git.getOpenPullRequest(head, base);
    if (existing) {
      return NextResponse.json({ pullRequest: existing, alreadyOpen: true });
    }

    const title = parsed.data.title?.trim() || `Publish ${head} → ${base}`;
    const body =
      parsed.data.body?.trim() ||
      `Merges content changes from \`${head}\` into \`${base}\`.\n\nOpened from THUNDER-CMS.`;

    const pullRequest = await git.createPullRequest(head, base, title, body);

    await prisma.activityLog.create({
      data: {
        action: "pull_request.opened",
        entityPath: `${head} → ${base}`,
        userId: session.user.id,
        projectId: project.id,
        metadata: JSON.stringify({ number: pullRequest.number, url: pullRequest.url }),
      },
    });

    return NextResponse.json({ pullRequest });
  } catch (error) {
    const status = (error as { status?: number })?.status;
    // GitHub 422 = no diff between branches, or a PR already exists.
    if (status === 422) {
      const message =
        (error as { message?: string })?.message ??
        "Nothing to merge — the branches are identical.";
      return NextResponse.json({ error: message }, { status: 422 });
    }
    const msg = error instanceof Error ? error.message : "Failed to open pull request";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
