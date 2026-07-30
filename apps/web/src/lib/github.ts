import { Octokit } from "@octokit/rest";
import type { GitRepo, GitTreeEntry, ThunderConfig } from "@thunder/types";

export function createOctokit(accessToken: string) {
  return new Octokit({ auth: accessToken });
}

export async function listUserRepos(accessToken: string): Promise<GitRepo[]> {
  const octokit = createOctokit(accessToken);
  const repos = await octokit.paginate(octokit.rest.repos.listForAuthenticatedUser, {
    per_page: 100,
    sort: "updated",
  });

  return repos.map((repo) => ({
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    owner: repo.owner?.login ?? "",
    defaultBranch: repo.default_branch ?? "main",
    private: repo.private,
  }));
}

export async function getRepoTree(
  accessToken: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<GitTreeEntry[]> {
  const octokit = createOctokit(accessToken);

  const { data: refData } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });

  const { data: treeData } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: refData.object.sha,
    recursive: "1",
  });

  return (treeData.tree ?? [])
    .filter((item) => item.path && (item.type === "blob" || item.type === "tree"))
    .map((item) => ({
      path: item.path!,
      type: item.type === "tree" ? "dir" : "file",
      sha: item.sha,
    }));
}

export async function commitThunderConfig(
  accessToken: string,
  owner: string,
  repo: string,
  branch: string,
  config: ThunderConfig,
): Promise<string> {
  const octokit = createOctokit(accessToken);
  const path = ".thunder/config.json";
  const content = JSON.stringify(config, null, 2);
  const message = "chore: configure THUNDER-CMS";

  let existingSha: string | undefined;

  try {
    const { data } = await octokit.rest.repos.getContent({ owner, repo, path, ref: branch });
    if (!Array.isArray(data) && data.type === "file" && "sha" in data) {
      existingSha = data.sha;
    }
  } catch {
    existingSha = undefined;
  }

  const { data } = await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: Buffer.from(content).toString("base64"),
    branch,
    sha: existingSha,
  });

  return data.commit.sha ?? "";
}

export async function getFileContent(
  accessToken: string,
  owner: string,
  repo: string,
  path: string,
  branch: string,
): Promise<{ content: string; sha: string }> {
  const octokit = createOctokit(accessToken);
  const { data } = await octokit.rest.repos.getContent({ owner, repo, path, ref: branch });

  if (Array.isArray(data) || data.type !== "file" || !("content" in data)) {
    throw new Error("File not found");
  }

  const content = Buffer.from(data.content, "base64").toString("utf8");
  return { content, sha: data.sha };
}

export async function commitFile(
  accessToken: string,
  owner: string,
  repo: string,
  branch: string,
  path: string,
  content: string,
  message: string,
  existingSha?: string,
): Promise<string> {
  const octokit = createOctokit(accessToken);

  let sha = existingSha;
  if (!sha) {
    try {
      const { data } = await octokit.rest.repos.getContent({ owner, repo, path, ref: branch });
      if (!Array.isArray(data) && data.type === "file" && "sha" in data) {
        sha = data.sha;
      }
    } catch {
      sha = undefined;
    }
  }

  const { data } = await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: Buffer.from(content).toString("base64"),
    branch,
    sha,
  });

  return data.commit.sha ?? "";
}

export async function deleteFile(
  accessToken: string,
  owner: string,
  repo: string,
  branch: string,
  path: string,
  message: string,
): Promise<string> {
  const octokit = createOctokit(accessToken);
  const { data: existing } = await octokit.rest.repos.getContent({ owner, repo, path, ref: branch });

  if (Array.isArray(existing) || existing.type !== "file" || !("sha" in existing)) {
    throw new Error("File not found");
  }

  const { data } = await octokit.rest.repos.deleteFile({
    owner,
    repo,
    path,
    message,
    sha: existing.sha,
    branch,
  });

  return data.commit.sha ?? "";
}

export async function getFileBinary(
  accessToken: string,
  owner: string,
  repo: string,
  path: string,
  branch: string,
): Promise<{ content: Buffer; sha: string }> {
  const octokit = createOctokit(accessToken);
  const { data } = await octokit.rest.repos.getContent({ owner, repo, path, ref: branch });

  if (Array.isArray(data) || data.type !== "file" || !("content" in data)) {
    throw new Error("File not found");
  }

  return {
    content: Buffer.from(data.content, "base64"),
    sha: data.sha,
  };
}

export async function commitBinaryFile(
  accessToken: string,
  owner: string,
  repo: string,
  branch: string,
  path: string,
  content: Buffer,
  message: string,
  existingSha?: string,
): Promise<string> {
  const octokit = createOctokit(accessToken);

  let sha = existingSha;
  if (!sha) {
    try {
      const { data } = await octokit.rest.repos.getContent({ owner, repo, path, ref: branch });
      if (!Array.isArray(data) && data.type === "file" && "sha" in data) {
        sha = data.sha;
      }
    } catch {
      sha = undefined;
    }
  }

  const { data } = await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: content.toString("base64"),
    branch,
    sha,
  });

  return data.commit.sha ?? "";
}

export interface BranchSummary {
  name: string;
  isDefault: boolean;
}

export async function listBranches(
  accessToken: string,
  owner: string,
  repo: string,
): Promise<BranchSummary[]> {
  const octokit = createOctokit(accessToken);
  const branches = await octokit.paginate(octokit.rest.repos.listBranches, {
    owner,
    repo,
    per_page: 100,
  });

  return branches.map((b) => ({ name: b.name, isDefault: false }));
}

export async function createBranch(
  accessToken: string,
  owner: string,
  repo: string,
  branchName: string,
  fromBranch: string,
): Promise<string> {
  const octokit = createOctokit(accessToken);
  const { data: refData } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${fromBranch}`,
  });
  const { data } = await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: refData.object.sha,
  });
  return data.ref;
}

export interface CommitSummary {
  sha: string;
  message: string;
  author: string;
  date: string;
}

export async function listCommitsForFile(
  accessToken: string,
  owner: string,
  repo: string,
  branch: string,
  path: string,
  perPage = 30,
): Promise<CommitSummary[]> {
  const octokit = createOctokit(accessToken);
  const { data } = await octokit.rest.repos.listCommits({
    owner,
    repo,
    sha: branch,
    path,
    per_page: perPage,
  });

  return data.map((c) => ({
    sha: c.sha,
    message: c.commit.message,
    author: c.commit.author?.name ?? c.commit.committer?.name ?? "Unknown",
    date: c.commit.author?.date ?? c.commit.committer?.date ?? "",
  }));
}

export async function getFileAtRef(
  accessToken: string,
  owner: string,
  repo: string,
  path: string,
  ref: string,
): Promise<{ content: string; sha: string }> {
  const octokit = createOctokit(accessToken);
  const { data } = await octokit.rest.repos.getContent({ owner, repo, path, ref });

  if (Array.isArray(data) || data.type !== "file" || !("content" in data)) {
    throw new Error("File not found at ref");
  }

  const content = Buffer.from(data.content, "base64").toString("utf8");
  return { content, sha: data.sha };
}

export interface PullRequestInfo {
  number: number;
  url: string;
  title: string;
  state: string;
}

/** Find the open PR whose source is `head` and target is `base`, if any. */
export async function getOpenPullRequest(
  accessToken: string,
  owner: string,
  repo: string,
  head: string,
  base: string,
): Promise<PullRequestInfo | null> {
  const octokit = createOctokit(accessToken);
  const { data } = await octokit.rest.pulls.list({
    owner,
    repo,
    state: "open",
    head: `${owner}:${head}`,
    base,
    per_page: 1,
  });

  const pr = data[0];
  if (!pr) return null;
  return { number: pr.number, url: pr.html_url, title: pr.title, state: pr.state };
}

/** How many commits `head` is ahead of `base` (0 means nothing to merge). */
export async function compareBranches(
  accessToken: string,
  owner: string,
  repo: string,
  base: string,
  head: string,
): Promise<{ aheadBy: number; behindBy: number }> {
  const octokit = createOctokit(accessToken);
  const { data } = await octokit.rest.repos.compareCommitsWithBasehead({
    owner,
    repo,
    basehead: `${base}...${head}`,
  });
  return { aheadBy: data.ahead_by, behindBy: data.behind_by };
}

export async function createPullRequest(
  accessToken: string,
  owner: string,
  repo: string,
  head: string,
  base: string,
  title: string,
  body?: string,
): Promise<PullRequestInfo> {
  const octokit = createOctokit(accessToken);
  const { data } = await octokit.rest.pulls.create({
    owner,
    repo,
    head,
    base,
    title,
    body,
  });

  return { number: data.number, url: data.html_url, title: data.title, state: data.state };
}

export type DeploymentState = "success" | "pending" | "failure" | "error" | "none";

export interface DeploymentStatus {
  state: DeploymentState;
  description: string | null;
  /** Link to the deploy/build log (provider dashboard). */
  logUrl: string | null;
  /** Public URL of the deployed site, when the provider reports it. */
  environmentUrl: string | null;
  environment: string | null;
  updatedAt: string | null;
}

// GitHub / provider states → our simplified set.
function normalizeState(raw: string): DeploymentState {
  switch (raw) {
    case "success":
      return "success";
    case "failure":
      return "failure";
    case "error":
      return "error";
    case "pending":
    case "queued":
    case "in_progress":
    case "waiting":
      return "pending";
    default:
      return "none";
  }
}

/**
 * Latest deployment status for a branch. Vercel/Netlify (and most hosts) report
 * deploys through the GitHub Deployments API and/or commit statuses, so we read
 * those rather than integrating each provider directly. Deployments are richer
 * (they carry the live environment URL), so we prefer them and fall back to the
 * combined commit status.
 */
export async function getLatestDeploymentStatus(
  accessToken: string,
  owner: string,
  repo: string,
  ref: string,
): Promise<DeploymentStatus> {
  const octokit = createOctokit(accessToken);
  const empty: DeploymentStatus = {
    state: "none",
    description: null,
    logUrl: null,
    environmentUrl: null,
    environment: null,
    updatedAt: null,
  };

  // 1) Prefer the Deployments API (carries environment_url for Vercel/Netlify).
  try {
    const { data: deployments } = await octokit.rest.repos.listDeployments({
      owner,
      repo,
      ref,
      per_page: 1,
    });

    const deployment = deployments[0];
    if (deployment) {
      const { data: statuses } = await octokit.rest.repos.listDeploymentStatuses({
        owner,
        repo,
        deployment_id: deployment.id,
        per_page: 1,
      });
      const status = statuses[0];
      if (status) {
        return {
          state: normalizeState(status.state),
          description: status.description || null,
          logUrl: status.log_url || status.target_url || null,
          environmentUrl: status.environment_url || null,
          environment: status.environment || deployment.environment || null,
          updatedAt: status.updated_at || null,
        };
      }
    }
  } catch {
    // fall through to commit statuses
  }

  // 2) Fall back to the combined commit status (older Netlify/CI setups).
  try {
    const { data: combined } = await octokit.rest.repos.getCombinedStatusForRef({
      owner,
      repo,
      ref,
    });
    if (combined.total_count > 0) {
      const first = combined.statuses[0];
      return {
        state: normalizeState(combined.state),
        description: first?.description || null,
        logUrl: first?.target_url || null,
        environmentUrl: null,
        environment: first?.context || null,
        updatedAt: first?.updated_at || null,
      };
    }
  } catch {
    // no statuses available
  }

  return empty;
}