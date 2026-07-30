import { GitHubProvider } from "./github-provider";
import { GitLabProvider } from "./gitlab-provider";
import type { GitProvider, GitProjectRef } from "./types";

export type { GitProvider, GitProjectRef, GitProviderKind } from "./types";
export { GitHubProvider } from "./github-provider";
export { GitLabProvider } from "./gitlab-provider";

/**
 * Build the {@link GitProvider} for a project. Switches on `project.gitProvider`
 * ("github" | "gitlab"); anything else falls back to GitHub for safety. GitLab
 * is addressed by full path (`group/project`), preferring `gitRepoFullName` and
 * falling back to `owner/repo`.
 */
export function getGitProvider(project: GitProjectRef, token: string): GitProvider {
  const owner = project.gitRepoOwner ?? "";
  const repo = project.gitRepoName ?? "";

  if (project.gitProvider === "gitlab") {
    const projectPath = project.gitRepoFullName || `${owner}/${repo}`;
    return new GitLabProvider(token, projectPath);
  }

  return new GitHubProvider(token, owner, repo);
}
