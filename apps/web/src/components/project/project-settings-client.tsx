"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ProjectSettingsClientProps {
  projectId: string;
}

export function ProjectSettingsClient({ projectId }: ProjectSettingsClientProps) {
  const [commitMode, setCommitMode] = useState<"auto" | "custom">("auto");
  const [componentsRoot, setComponentsRoot] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [configExists, setConfigExists] = useState<boolean | null>(null);
  const [configTemplate, setConfigTemplate] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [generatedSha, setGeneratedSha] = useState("");

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.project) {
          setCommitMode(d.project.commitMessageMode ?? "auto");
          setComponentsRoot(d.project.componentsRoot ?? "");
          setPreviewUrl(d.project.previewUrl ?? "");
        }
      })
      .finally(() => setLoading(false));

    fetch(`/api/projects/${projectId}/blocks/config`)
      .then((r) => r.json())
      .then((d) => {
        setConfigExists(Boolean(d.exists));
        if (typeof d.template === "string") setConfigTemplate(d.template);
      })
      .catch(() => setConfigExists(null));
  }, [projectId]);

  async function generateConfig(mode: "template" | "migrate") {
    setGenerating(true);
    setGenerateError("");
    setGeneratedSha("");
    try {
      const res = await fetch(`/api/projects/${projectId}/blocks/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const d = await res.json();
      if (!res.ok) {
        setGenerateError(d.error ?? "Failed to generate thunder.config.ts");
      } else {
        setConfigExists(true);
        setGeneratedSha(d.commitSha ?? "");
      }
    } catch {
      setGenerateError("Failed to generate thunder.config.ts");
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commitMessageMode: commitMode,
          componentsRoot: componentsRoot.trim() || null,
          previewUrl: previewUrl.trim() || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to save");
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch {
      setError("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12 text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Commit messages</label>
        <select
          value={commitMode}
          onChange={(e) => setCommitMode(e.target.value as "auto" | "custom")}
          className="flex h-10 w-full rounded-[10px] border border-border bg-surface-raised px-3.5 text-sm shadow-xs focus-visible:border-thunder-500 focus-visible:outline-none"
        >
          <option value="auto">Auto-generate (e.g. Update: &quot;Title&quot;)</option>
          <option value="custom">Ask me before each save</option>
        </select>
        <p className="text-xs text-muted">In custom mode, a dialog asks for a commit message on each save.</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Preview URL</label>
        <Input
          value={previewUrl}
          onChange={(e) => setPreviewUrl(e.target.value)}
          placeholder="https://your-site.vercel.app"
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted">
          The deployed site URL (staging or production). Shown in the{" "}
          <span className="font-medium">Preview</span> tab so editors can see the live site while
          editing.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Components folder</label>
        <Input
          value={componentsRoot}
          onChange={(e) => setComponentsRoot(e.target.value)}
          placeholder="src/components"
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted">
          Every component in this folder becomes an available block in the page builder. Leave blank
          to use the framework default (<span className="font-mono">src/components</span>).
        </p>
      </div>

      <div className="space-y-2 rounded-[10px] border border-border p-4">
        <label className="text-sm font-medium">Config-driven blocks (npm model)</label>
        <p className="text-xs text-muted">
          Install block packages with <span className="font-mono">pnpm add @thunder/blocks-marketing</span>{" "}
          and list them in a <span className="font-mono">thunder.config.ts</span> at your repo root instead
          of relying on a folder scan. When present, it takes priority over the components folder above.
        </p>
        {configExists === true ? (
          <p className="text-xs text-emerald-600 dark:text-emerald-400">
            <span className="font-mono">thunder.config.ts</span> found in your repo — the page builder is
            reading blocks from it.
            {generatedSha && ` Committed ${generatedSha.slice(0, 7)}.`}
          </p>
        ) : configExists === false ? (
          <div className="space-y-2">
            <p className="text-xs text-muted">
              No <span className="font-mono">thunder.config.ts</span> yet — the page builder is falling back
              to scanning the components folder.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => generateConfig("template")} disabled={generating}>
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Generate starter template
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => generateConfig("migrate")}
                disabled={generating}
                title="Draft thunder.config.ts from your currently-scanned components and registry overrides"
              >
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Migrate existing blocks
              </Button>
            </div>
            {generateError && <p className="text-xs text-destructive">{generateError}</p>}
            {configTemplate && (
              <details className="text-xs text-muted">
                <summary className="cursor-pointer select-none">Preview template</summary>
                <pre className="mt-2 overflow-x-auto rounded-md bg-surface-overlay p-3 font-mono text-[11px]">
                  {configTemplate}
                </pre>
              </details>
            )}
          </div>
        ) : null}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save settings
        </Button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
            <Check className="h-4 w-4" /> Saved
          </span>
        )}
      </div>
    </div>
  );
}
