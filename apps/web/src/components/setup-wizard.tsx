"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { GitFramework } from "@thunder/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SetupWizardProps {
  projectId: string;
  repoOwner: string;
  repoName: string;
  defaultBranch: string;
  initialFramework?: string | null;
}

const STEPS = ["Content folder", "Media settings", "Optional paths", "Review"];

export function SetupWizard({
  projectId,
  repoOwner,
  repoName,
  defaultBranch,
  initialFramework,
}: SetupWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [directories, setDirectories] = useState<string[]>([]);
  const [framework, setFramework] = useState<GitFramework>(
    (initialFramework as GitFramework) ?? "unknown",
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [contentRoot, setContentRoot] = useState("");
  const [mediaRoot, setMediaRoot] = useState("");
  const [mediaPublic, setMediaPublic] = useState("");
  const [codeRoot, setCodeRoot] = useState("");
  const [configPaths, setConfigPaths] = useState("");

  useEffect(() => {
    async function loadTree() {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/github/tree?owner=${encodeURIComponent(repoOwner)}&repo=${encodeURIComponent(repoName)}&branch=${encodeURIComponent(defaultBranch)}`,
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Failed to load repository");
        setLoading(false);
        return;
      }

      const dirs = new Set<string>();
      for (const entry of data.tree as Array<{ path: string; type: string }>) {
        if (entry.type === "dir") {
          dirs.add(entry.path);
          const parts = entry.path.split("/");
          for (let i = 1; i < parts.length; i++) {
            dirs.add(parts.slice(0, i).join("/"));
          }
        }
      }

      const sorted = Array.from(dirs).sort();
      setDirectories(sorted);
      setFramework(data.framework ?? "unknown");

      const defaults = getDefaults(data.framework);
      if (defaults) {
        setContentRoot(pickExisting(sorted, defaults.content));
        setMediaRoot(pickExisting(sorted, defaults.mediaRoot));
        setMediaPublic(pickExisting(sorted, defaults.mediaPublic));
        setCodeRoot(pickExisting(sorted, defaults.code));
        setConfigPaths(defaults.configs.join(", "));
      }

      setLoading(false);
    }

    loadTree();
  }, [repoOwner, repoName, defaultBranch]);

  const suggestions = useMemo(() => getDefaults(framework), [framework]);

  async function handleFinish() {
    setSaving(true);
    setError("");

    const response = await fetch(`/api/projects/${projectId}/configure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contentRoot,
        mediaRoot,
        mediaPublic,
        codeRoot: codeRoot || undefined,
        configPaths: configPaths
          ? configPaths.split(",").map((p) => p.trim()).filter(Boolean)
          : undefined,
        commitMessageMode: "auto",
      }),
    });

    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      setError(data.error ?? "Failed to save configuration");
      return;
    }

    router.push(`/dashboard/projects/${projectId}`);
    router.refresh();
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted">
          Scanning repository and detecting framework...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        {STEPS.map((label, index) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                index <= step
                  ? "bg-thunder-600 text-white"
                  : "bg-surface-overlay text-muted"
              }`}
            >
              {index + 1}
            </div>
            <span className={`text-sm ${index === step ? "text-foreground" : "text-muted"}`}>
              {label}
            </span>
            {index < STEPS.length - 1 && <div className="h-px w-8 bg-border" />}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{STEPS[step]}</CardTitle>
          <CardDescription>
            {framework !== "unknown"
              ? `Detected framework: ${framework}`
              : "Configure how THUNDER-CMS reads and writes your content."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <FolderSelect
              label="Content folder"
              hint="Where your Markdown and content files live (e.g. src/content)"
              value={contentRoot}
              onChange={setContentRoot}
              directories={directories}
              suggestion={suggestions?.content}
            />
          )}

          {step === 1 && (
            <>
              <FolderSelect
                label="Media root"
                hint="Where uploaded images are stored in the repo"
                value={mediaRoot}
                onChange={(value) => {
                  setMediaRoot(value);
                  if (!mediaPublic && value.includes("/")) {
                    setMediaPublic(value.split("/")[0]);
                  }
                }}
                directories={directories}
                suggestion={suggestions?.mediaRoot}
              />
              <FolderSelect
                label="Media public path"
                hint="Public URL prefix for images (usually the parent of media root)"
                value={mediaPublic}
                onChange={setMediaPublic}
                directories={directories}
                suggestion={suggestions?.mediaPublic}
              />
            </>
          )}

          {step === 2 && (
            <>
              <FolderSelect
                label="Code folder (optional)"
                hint="Layouts and components — optional"
                value={codeRoot}
                onChange={setCodeRoot}
                directories={directories}
                suggestion={suggestions?.code}
              />
              <div className="space-y-2">
                <Label htmlFor="configPaths">Config paths (optional)</Label>
                <Input
                  id="configPaths"
                  value={configPaths}
                  onChange={(e) => setConfigPaths(e.target.value)}
                  placeholder="src/config, config.json"
                />
                <p className="text-xs text-muted">Comma-separated files or folders.</p>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="space-y-3 rounded-lg border border-border bg-surface-overlay p-4 text-sm">
              <Row label="Content folder" value={contentRoot} />
              <Row label="Media root" value={mediaRoot} />
              <Row label="Media public" value={mediaPublic} />
              {codeRoot && <Row label="Code folder" value={codeRoot} />}
              {configPaths && <Row label="Config paths" value={configPaths} />}
              <p className="pt-2 text-xs text-muted">
                Saving will commit <code>.thunder/config.json</code> to your repository.
              </p>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-between pt-2">
            <Button
              variant="secondary"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || saving}
            >
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={!contentRoot || !mediaRoot || !mediaPublic}
              >
                Continue
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={saving}>
                {saving ? "Saving..." : "Finish setup"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FolderSelect({
  label,
  hint,
  value,
  onChange,
  directories,
  suggestion,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  directories: string[];
  suggestion?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-10 w-full rounded-lg border border-border bg-surface-overlay px-3 text-sm"
      >
        <option value="">Select a folder...</option>
        {suggestion && !directories.includes(suggestion) && (
          <option value={suggestion}>{suggestion} (suggested)</option>
        )}
        {directories.map((dir) => (
          <option key={dir} value={dir}>
            {dir}
            {dir === suggestion ? " (suggested)" : ""}
          </option>
        ))}
      </select>
      <p className="text-xs text-muted">{hint}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted">{label}</span>
      <span className="font-mono text-xs">{value}</span>
    </div>
  );
}

function getDefaults(framework: GitFramework) {
  const map: Record<string, { content: string; mediaRoot: string; mediaPublic: string; code: string; configs: string[] }> = {
    astro: { content: "src/content", mediaRoot: "public/images", mediaPublic: "public", code: "src/layouts", configs: ["src/config"] },
    nextjs: { content: "src/content", mediaRoot: "public/images", mediaPublic: "public", code: "src/app", configs: ["src/config"] },
    hugo: { content: "content", mediaRoot: "static/images", mediaPublic: "static", code: "themes/layouts", configs: ["config"] },
    eleventy: { content: "src/content", mediaRoot: "public/images", mediaPublic: "public", code: "src/_includes", configs: ["src/_data"] },
    jekyll: { content: "_posts", mediaRoot: "assets/images", mediaPublic: "assets", code: "_layouts", configs: ["_config.yml"] },
    nuxt: { content: "content", mediaRoot: "public/images", mediaPublic: "public", code: "layouts", configs: ["nuxt.config.ts"] },
    sveltekit: { content: "src/content", mediaRoot: "static/images", mediaPublic: "static", code: "src/lib", configs: ["src/lib"] },
  };

  if (framework === "unknown") return null;
  return map[framework] ?? null;
}

function pickExisting(directories: string[], preferred: string) {
  if (directories.includes(preferred)) return preferred;
  const match = directories.find((d) => d.endsWith(preferred) || d === preferred);
  return match ?? preferred;
}