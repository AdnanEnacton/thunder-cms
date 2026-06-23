"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { GitRepo } from "@thunder/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function NewProjectForm() {
  const router = useRouter();
  const [repos, setRepos] = useState<GitRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<GitRepo | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadRepos() {
      const response = await fetch("/api/github/repos");
      const data = await response.json();
      setLoading(false);

      if (!response.ok) {
        setError(data.error ?? "Failed to load repositories");
        return;
      }

      setRepos(data.repos);
    }

    loadRepos();
  }, []);

  const filtered = repos.filter((repo) =>
    repo.fullName.toLowerCase().includes(search.toLowerCase()),
  );

  async function handleCreate() {
    if (!selected) return;

    setCreating(true);
    setError("");

    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: selected.name,
        gitRepoOwner: selected.owner,
        gitRepoName: selected.name,
        gitRepoFullName: selected.fullName,
        defaultBranch: selected.defaultBranch,
      }),
    });

    const data = await response.json();
    setCreating(false);

    if (!response.ok) {
      setError(data.error ?? "Failed to create project");
      return;
    }

    router.push(`/dashboard/projects/${data.project.id}/setup`);
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted">Loading repositories...</CardContent>
      </Card>
    );
  }

  if (error && repos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connect GitHub</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push("/login")}>Sign in with GitHub</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select a repository</CardTitle>
        <CardDescription>
          Choose the GitHub repository that contains your static site.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          type="search"
          placeholder="Search repositories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex h-10 w-full rounded-lg border border-border bg-surface-overlay px-3 text-sm"
        />

        <div className="max-h-80 space-y-2 overflow-y-auto">
          {filtered.map((repo) => (
            <button
              key={repo.id}
              type="button"
              onClick={() => setSelected(repo)}
              className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                selected?.id === repo.id
                  ? "border-thunder-500 bg-thunder-600/10"
                  : "border-border hover:bg-surface-overlay"
              }`}
            >
              <div>
                <p className="font-medium">{repo.fullName}</p>
                <p className="text-xs text-muted">default: {repo.defaultBranch}</p>
              </div>
              {repo.private && (
                <span className="rounded-full bg-surface-overlay px-2 py-0.5 text-xs text-muted">
                  private
                </span>
              )}
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button onClick={handleCreate} disabled={!selected || creating} className="w-full">
          {creating ? "Creating project..." : "Continue to setup"}
        </Button>
      </CardContent>
    </Card>
  );
}