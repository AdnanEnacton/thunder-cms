import type { GitTreeEntry, ThunderConfig } from "@thunder/types";
import type {
  BranchSummary,
  CommitSummary,
  DeploymentStatus,
  PullRequestInfo,
} from "@/lib/github";

export type {
  BranchSummary,
  CommitSummary,
  DeploymentStatus,
  DeploymentState,
  PullRequestInfo,
} from "@/lib/github";
export type { GitTreeEntry, ThunderConfig } from "@thunder/types";

export type GitProviderKind = "github" | "gitlab";

/**
 * Provider-agnostic Git operations used by THUNDER-CMS (Phase 5.2). Every method
 * is bound to a single repository + credentials at construction, so call sites
 * don't pass owner/repo/token around. The GitHub implementation delegates to the
 * existing `lib/github.ts` (zero behavior change); the GitLab implementation uses
 * `@gitbeaker/rest`. Get one via `getGitProvider(project, token)`.
 */
export interface GitProvider {
  readonly kind: GitProviderKind;

  /** Recursive file/dir listing for a branch. */
  getRepoTree(branch: string): Promise<GitTreeEntry[]>;

  /** Read a UTF-8 text file at a branch. */
  getFileContent(path: string, branch: string): Promise<{ content: string; sha: string }>;

  /** Read a binary file at a branch. */
  getFileBinary(path: string, branch: string): Promise<{ content: Buffer; sha: string }>;

  /** Read a text file at an arbitrary ref (commit/tag/branch) — for history. */
  getFileAtRef(path: string, ref: string): Promise<{ content: string; sha: string }>;

  /** Create or update a text file; returns the new commit sha. */
  commitFile(
    branch: string,
    path: string,
    content: string,
    message: string,
    existingSha?: string,
  ): Promise<string>;

  /** Create or update a binary file; returns the new commit sha. */
  commitBinaryFile(
    branch: string,
    path: string,
    content: Buffer,
    message: string,
    existingSha?: string,
  ): Promise<string>;

  /** Delete a file; returns the new commit sha. */
  deleteFile(branch: string, path: string, message: string): Promise<string>;

  /** Write `.thunder/config.json` (first-run configure). */
  commitThunderConfig(branch: string, config: ThunderConfig): Promise<string>;

  listBranches(): Promise<BranchSummary[]>;
  createBranch(branchName: string, fromBranch: string): Promise<string>;

  listCommitsForFile(branch: string, path: string, perPage?: number): Promise<CommitSummary[]>;

  getOpenPullRequest(head: string, base: string): Promise<PullRequestInfo | null>;
  compareBranches(base: string, head: string): Promise<{ aheadBy: number; behindBy: number }>;
  createPullRequest(
    head: string,
    base: string,
    title: string,
    body?: string,
  ): Promise<PullRequestInfo>;

  getLatestDeploymentStatus(ref: string): Promise<DeploymentStatus>;
}

/** The subset of a Project row a provider needs to bind to a repo. */
export interface GitProjectRef {
  gitProvider: string;
  gitRepoOwner: string | null;
  gitRepoName: string | null;
  /** GitLab uses a numeric/string project id or full path; optional for GitHub. */
  gitRepoFullName?: string | null;
}
