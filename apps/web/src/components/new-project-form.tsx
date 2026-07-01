"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderGit2, Lock, Search } from "lucide-react";
import type { GitRepo } from "@thunder/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { LoadingState } from "@/components/ui/loading-state";

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
        <CardContent className="py-8">
          <LoadingState
            title="Loading repositories"
            description="Fetching your GitHub repositories."
          />
        </CardContent>
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
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Select a repository</CardTitle>
        <CardDescription>
          Choose the GitHub repository that contains your static site.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            type="search"
            placeholder="Search repositories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {filtered.map((repo) => (
            <button
              key={repo.id}
              type="button"
              onClick={() => setSelected(repo)}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-all",
                selected?.id === repo.id
                  ? "border-thunder-500 bg-thunder-50 shadow-xs"
                  : "border-border hover:border-thunder-300/50 hover:bg-surface-subtle",
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg",
                    selected?.id === repo.id ? "bg-thunder-100" : "bg-surface-overlay",
                  )}
                >
                  <FolderGit2
                    className={cn(
                      "h-4 w-4",
                      selected?.id === repo.id ? "text-thunder-600" : "text-muted",
                    )}
                  />
                </div>
                <div>
                  <p className="font-medium tracking-tight">{repo.fullName}</p>
                  <p className="text-xs text-muted">default: {repo.defaultBranch}</p>
                </div>
              </div>
              {repo.private && (
                <span className="badge badge-neutral">
                  <Lock className="h-3 w-3" />
                  Private
                </span>
              )}
            </button>
          ))}
        </div>

        {error && (
          <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button onClick={handleCreate} disabled={!selected || creating} className="w-full">
          {creating ? "Creating project..." : "Continue to setup"}
        </Button>
      </CardContent>
    </Card>
  );
}