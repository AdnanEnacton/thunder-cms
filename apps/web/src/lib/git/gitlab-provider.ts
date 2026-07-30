import { Gitlab } from "@gitbeaker/rest";
import type { GitTreeEntry, ThunderConfig } from "@thunder/types";
import type {
  BranchSummary,
  CommitSummary,
  DeploymentState,
  DeploymentStatus,
  GitProvider,
  GitProviderKind,
  PullRequestInfo,
} from "./types";

type GitlabClient = InstanceType<typeof Gitlab>;

/** Map GitLab deployment/pipeline states onto our simplified set. */
function normalizeState(raw: string | undefined | null): DeploymentState {
  switch (raw) {
    case "success":
      return "success";
    case "failed":
      return "failure";
    case "canceled":
    case "blocked":
      return "error";
    case "created":
    case "running":
    case "pending":
    case "waiting":
      return "pending";
    default:
      return "none";
  }
}

/**
 * GitLab implementation of {@link GitProvider} via `@gitbeaker/rest`. The project
 * is addressed by its full path (`group/project`), which GitLab accepts anywhere
 * a project id is expected. Host defaults to gitlab.com; override with
 * `GITLAB_HOST` for self-managed instances.
 *
 * Note: GitLab's file write API returns the file path, not a commit sha, so
 * {@link commitFile} re-reads the file to report the new blob id as the sha.
 * SHA-based conflict detection (used by the GitHub path) is not yet wired for
 * GitLab — see PROGRESS-TRACKER P5-B2.
 */
export class GitLabProvider implements GitProvider {
  readonly kind: GitProviderKind = "gitlab";
  private readonly api: GitlabClient;
  private readonly projectId: string;

  constructor(token: string, projectPath: string, host?: string) {
    this.api = new Gitlab({ token, host: host || process.env.GITLAB_HOST || "https://gitlab.com" });
    this.projectId = projectPath;
  }

  async getRepoTree(branch: string): Promise<GitTreeEntry[]> {
    const entries = await this.api.Repositories.allRepositoryTrees(this.projectId, {
      recursive: true,
      ref: branch,
      perPage: 100,
    });
    return entries
      .filter((e) => e.path && (e.type === "blob" || e.type === "tree"))
      .map((e) => ({
        path: e.path,
        type: e.type === "tree" ? ("dir" as const) : ("file" as const),
        sha: String(e.id),
      }));
  }

  async getFileContent(path: string, branch: string): Promise<{ content: string; sha: string }> {
    const file = await this.api.RepositoryFiles.show(this.projectId, path, branch);
    const content = Buffer.from(file.content, "base64").toString("utf8");
    return { content, sha: String(file.blob_id) };
  }

  async getFileBinary(path: string, branch: string): Promise<{ content: Buffer; sha: string }> {
    const file = await this.api.RepositoryFiles.show(this.projectId, path, branch);
    return { content: Buffer.from(file.content, "base64"), sha: String(file.blob_id) };
  }

  getFileAtRef(path: string, ref: string) {
    return this.getFileContent(path, ref);
  }

  private async fileExists(path: string, branch: string): Promise<boolean> {
    try {
      await this.api.RepositoryFiles.show(this.projectId, path, branch);
      return true;
    } catch {
      return false;
    }
  }

  private async writeFile(
    branch: string,
    path: string,
    base64: string,
    message: string,
  ): Promise<string> {
    const exists = await this.fileExists(path, branch);
    if (exists) {
      await this.api.RepositoryFiles.edit(this.projectId, path, branch, base64, message, {
        encoding: "base64",
      });
    } else {
      await this.api.RepositoryFiles.create(this.projectId, path, branch, base64, message, {
        encoding: "base64",
      });
    }
    // GitLab's write response omits the commit sha; re-read to report the new blob id.
    try {
      const updated = await this.api.RepositoryFiles.show(this.projectId, path, branch);
      return String(updated.blob_id);
    } catch {
      return "";
    }
  }

  commitFile(branch: string, path: string, content: string, message: string) {
    return this.writeFile(branch, path, Buffer.from(content).toString("base64"), message);
  }

  commitBinaryFile(branch: string, path: string, content: Buffer, message: string) {
    return this.writeFile(branch, path, content.toString("base64"), message);
  }

  async deleteFile(branch: string, path: string, message: string): Promise<string> {
    await this.api.RepositoryFiles.remove(this.projectId, path, branch, message);
    return "";
  }

  commitThunderConfig(branch: string, config: ThunderConfig): Promise<string> {
    return this.commitFile(
      branch,
      ".thunder/config.json",
      JSON.stringify(config, null, 2),
      "chore: configure THUNDER-CMS",
    );
  }

  async listBranches(): Promise<BranchSummary[]> {
    const branches = await this.api.Branches.all(this.projectId);
    return branches.map((b) => ({ name: b.name, isDefault: Boolean(b.default) }));
  }

  async createBranch(branchName: string, fromBranch: string): Promise<string> {
    const branch = await this.api.Branches.create(this.projectId, branchName, fromBranch);
    return branch.name;
  }

  async listCommitsForFile(
    branch: string,
    path: string,
    perPage = 30,
  ): Promise<CommitSummary[]> {
    const commits = await this.api.Commits.all(this.projectId, {
      refName: branch,
      path,
      perPage,
      maxPages: 1,
    });
    return commits.map((c) => ({
      sha: String(c.id),
      message: String(c.message ?? ""),
      author: c.author_name ? String(c.author_name) : "Unknown",
      date: String(c.authored_date ?? c.committed_date ?? ""),
    }));
  }

  async getOpenPullRequest(head: string, base: string): Promise<PullRequestInfo | null> {
    const mrs = await this.api.MergeRequests.all({
      projectId: this.projectId,
      sourceBranch: head,
      targetBranch: base,
      state: "opened",
      perPage: 1,
    });
    const mr = mrs[0];
    if (!mr) return null;
    return { number: Number(mr.iid), url: String(mr.web_url), title: String(mr.title), state: String(mr.state) };
  }

  async compareBranches(base: string, head: string): Promise<{ aheadBy: number; behindBy: number }> {
    // GitLab compare(from, to) returns commits present in `to` but not `from`.
    const ahead = await this.api.Repositories.compare(this.projectId, base, head);
    const aheadBy = ahead.commits?.length ?? 0;
    return { aheadBy, behindBy: 0 };
  }

  async createPullRequest(
    head: string,
    base: string,
    title: string,
    body?: string,
  ): Promise<PullRequestInfo> {
    const mr = await this.api.MergeRequests.create(this.projectId, head, base, title, {
      description: body,
    });
    return { number: Number(mr.iid), url: String(mr.web_url), title: String(mr.title), state: String(mr.state) };
  }

  async getLatestDeploymentStatus(ref: string): Promise<DeploymentStatus> {
    const empty: DeploymentStatus = {
      state: "none",
      description: null,
      logUrl: null,
      environmentUrl: null,
      environment: null,
      updatedAt: null,
    };
    try {
      const deployments = await this.api.Deployments.all(this.projectId, {
        orderBy: "created_at",
        sort: "desc",
        perPage: 10,
        maxPages: 1,
      });
      // Prefer the newest deployment whose commit is on the requested ref.
      const match =
        deployments.find((d) => (d.ref as string | undefined) === ref) ?? deployments[0];
      if (!match) return empty;

      const env = match.environment as { name?: string; external_url?: string } | undefined;
      return {
        state: normalizeState(match.status as string),
        description: (match.status as string) ?? null,
        logUrl: env?.external_url ?? null,
        environmentUrl: env?.external_url ?? null,
        environment: env?.name ?? null,
        updatedAt: (match.updated_at as string) ?? (match.created_at as string) ?? null,
      };
    } catch {
      return empty;
    }
  }
}
