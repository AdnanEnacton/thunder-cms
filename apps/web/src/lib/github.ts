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