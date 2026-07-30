import { describe, expect, it } from "vitest";
import { getGitProvider, GitHubProvider, GitLabProvider } from "./index";

const base = { gitRepoOwner: "acme", gitRepoName: "site", gitRepoFullName: "acme/site" };

describe("getGitProvider", () => {
  it("returns a GitHub provider for github projects", () => {
    const p = getGitProvider({ ...base, gitProvider: "github" }, "tok");
    expect(p).toBeInstanceOf(GitHubProvider);
    expect(p.kind).toBe("github");
  });

  it("returns a GitLab provider for gitlab projects", () => {
    const p = getGitProvider({ ...base, gitProvider: "gitlab" }, "tok");
    expect(p).toBeInstanceOf(GitLabProvider);
    expect(p.kind).toBe("gitlab");
  });

  it("falls back to GitHub for an unknown provider", () => {
    const p = getGitProvider({ ...base, gitProvider: "bitbucket" }, "tok");
    expect(p).toBeInstanceOf(GitHubProvider);
  });

  it("both providers implement the same surface", () => {
    const gh = getGitProvider({ ...base, gitProvider: "github" }, "tok");
    const gl = getGitProvider({ ...base, gitProvider: "gitlab" }, "tok");
    const methods = [
      "getRepoTree",
      "getFileContent",
      "getFileBinary",
      "getFileAtRef",
      "commitFile",
      "commitBinaryFile",
      "deleteFile",
      "commitThunderConfig",
      "listBranches",
      "createBranch",
      "listCommitsForFile",
      "getOpenPullRequest",
      "compareBranches",
      "createPullRequest",
      "getLatestDeploymentStatus",
    ] as const;
    for (const m of methods) {
      expect(typeof (gh as unknown as Record<string, unknown>)[m]).toBe("function");
      expect(typeof (gl as unknown as Record<string, unknown>)[m]).toBe("function");
    }
  });
});
