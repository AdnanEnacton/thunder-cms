"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ProjectSettingsClientProps {
  projectId: string;
}

export function ProjectSettingsClient({ projectId }: ProjectSettingsClientProps) {
  const [commitMode, setCommitMode] = useState<"auto" | "custom">("auto");
  const [componentsRoot, setComponentsRoot] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.project) {
          setCommitMode(d.project.commitMessageMode ?? "auto");
          setComponentsRoot(d.project.componentsRoot ?? "");
        }
      })
      .finally(() => setLoading(false));
  }, [projectId]);

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
          <option value="auto">Auto-generate (e.g. Update: "Title")</option>
          <option value="custom">Ask me before each save</option>
        </select>
        <p className="text-xs text-muted">In custom mode, a dialog asks for a commit message on each save.</p>
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
