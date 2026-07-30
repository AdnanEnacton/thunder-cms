import type { ThunderConfig } from "@thunder/types";
import * as gh from "@/lib/github";
import type { GitProvider, GitProviderKind } from "./types";

/**
 * GitHub implementation of {@link GitProvider}. Thin adapter over the existing
 * `lib/github.ts` (Octokit) — binds token/owner/repo once and forwards each call,
 * so the long-standing GitHub path is byte-for-byte unchanged.
 */
export class GitHubProvider implements GitProvider {
  readonly kind: GitProviderKind = "github";

  constructor(
    private readonly token: string,
    private readonly owner: string,
    private readonly repo: string,
  ) {}

  getRepoTree(branch: string) {
    return gh.getRepoTree(this.token, this.owner, this.repo, branch);
  }

  getFileContent(path: string, branch: string) {
    return gh.getFileContent(this.token, this.owner, this.repo, path, branch);
  }

  getFileBinary(path: string, branch: string) {
    return gh.getFileBinary(this.token, this.owner, this.repo, path, branch);
  }

  getFileAtRef(path: string, ref: string) {
    return gh.getFileAtRef(this.token, this.owner, this.repo, path, ref);
  }

  commitFile(branch: string, path: string, content: string, message: string, existingSha?: string) {
    return gh.commitFile(this.token, this.owner, this.repo, branch, path, content, message, existingSha);
  }

  commitBinaryFile(
    branch: string,
    path: string,
    content: Buffer,
    message: string,
    existingSha?: string,
  ) {
    return gh.commitBinaryFile(this.token, this.owner, this.repo, branch, path, content, message, existingSha);
  }

  deleteFile(branch: string, path: string, message: string) {
    return gh.deleteFile(this.token, this.owner, this.repo, branch, path, message);
  }

  commitThunderConfig(branch: string, config: ThunderConfig) {
    return gh.commitThunderConfig(this.token, this.owner, this.repo, branch, config);
  }

  listBranches() {
    return gh.listBranches(this.token, this.owner, this.repo);
  }

  createBranch(branchName: string, fromBranch: string) {
    return gh.createBranch(this.token, this.owner, this.repo, branchName, fromBranch);
  }

  listCommitsForFile(branch: string, path: string, perPage?: number) {
    return gh.listCommitsForFile(this.token, this.owner, this.repo, branch, path, perPage);
  }

  getOpenPullRequest(head: string, base: string) {
    return gh.getOpenPullRequest(this.token, this.owner, this.repo, head, base);
  }

  compareBranches(base: string, head: string) {
    return gh.compareBranches(this.token, this.owner, this.repo, base, head);
  }

  createPullRequest(head: string, base: string, title: string, body?: string) {
    return gh.createPullRequest(this.token, this.owner, this.repo, head, base, title, body);
  }

  getLatestDeploymentStatus(ref: string) {
    return gh.getLatestDeploymentStatus(this.token, this.owner, this.repo, ref);
  }
}
