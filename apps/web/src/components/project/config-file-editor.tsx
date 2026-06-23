"use client";

import { useEffect, useState } from "react";
import type { ContentDocument, FieldSchema } from "@thunder/types";
import { FieldInput } from "@/components/content/field-input";
import { inferFieldSchema } from "@/lib/content/schema";
import { Button } from "@/components/ui/button";

interface ConfigFileEditorProps {
  projectId: string;
  filePath: string;
  onBack: () => void;
}

export function ConfigFileEditor({ projectId, filePath, onBack }: ConfigFileEditorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sha, setSha] = useState("");
  const [format, setFormat] = useState<ContentDocument["format"]>("json");
  const [frontmatter, setFrontmatter] = useState<Record<string, unknown>>({});
  const [body, setBody] = useState("");
  const [fields, setFields] = useState<FieldSchema[]>([]);
  const [mode, setMode] = useState<"visual" | "raw">("visual");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      const response = await fetch(
        `/api/projects/${projectId}/content/entry?path=${encodeURIComponent(filePath)}`,
      );
      const data = await response.json();
      setLoading(false);

      if (!response.ok) {
        setError(data.error ?? "Failed to load config file");
        return;
      }

      setSha(data.sha);
      setFormat(data.format);
      setFrontmatter(data.frontmatter ?? {});
      setFields(data.fields ?? []);

      const loadedBody = data.body ?? "";
      if (loadedBody) {
        setBody(loadedBody);
      } else if (data.format === "json") {
        setBody(JSON.stringify(data.frontmatter ?? {}, null, 2));
      } else if (data.format === "yaml") {
        setBody(loadedBody);
      } else {
        setBody(loadedBody);
      }

      setMode(data.format === "json" || data.format === "yaml" ? "visual" : "raw");
    }

    load();
  }, [projectId, filePath]);

  function updateField(name: string, value: unknown) {
    setFrontmatter((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");

    let payloadFrontmatter = frontmatter;
    let payloadBody = body;

    if (mode === "raw" && format === "json") {
      try {
        payloadFrontmatter = JSON.parse(body) as Record<string, unknown>;
        payloadBody = "";
      } catch {
        setSaving(false);
        setError("Invalid JSON");
        return;
      }
    }

    const response = await fetch(`/api/projects/${projectId}/content/entry`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: filePath,
        sha,
        frontmatter: payloadFrontmatter,
        body: payloadBody,
        format,
      }),
    });

    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      setError(data.error ?? "Failed to save");
      return;
    }

    if (data.sha) setSha(data.sha);
    setSuccess("Config saved!");
  }

  if (loading) {
    return <div className="p-8 text-muted">Loading config file...</div>;
  }

  const knownFieldNames = new Set(fields.map((f) => f.name));
  const extraFields = Object.keys(frontmatter).filter((k) => !knownFieldNames.has(k));

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex items-center justify-between border-b border-border bg-surface-raised px-6 py-4 shadow-sm">
        <div>
          <button type="button" onClick={onBack} className="mb-1 text-sm text-thunder-600 hover:underline">
            ← Back
          </button>
          <h2 className="text-lg font-semibold">{filePath.split("/").pop()}</h2>
          <p className="font-mono text-xs text-muted">{filePath}</p>
        </div>
        <div className="flex items-center gap-2">
          {(format === "json" || format === "yaml") && (
            <div className="flex rounded-lg border border-border bg-surface p-0.5">
              <button
                type="button"
                onClick={() => setMode("visual")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${mode === "visual" ? "bg-thunder-600 text-white" : "text-muted"}`}
              >
                Visual
              </button>
              <button
                type="button"
                onClick={() => setMode("raw")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${mode === "raw" ? "bg-thunder-600 text-white" : "text-muted"}`}
              >
                Raw
              </button>
            </div>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {success && (
          <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
            {success}
          </p>
        )}

        {mode === "visual" && format !== "text" ? (
          <div className="mx-auto max-w-xl space-y-5">
            {fields.map((field) => (
              <FieldInput
                key={field.name}
                field={field}
                value={frontmatter[field.name]}
                onChange={(v) => updateField(field.name, v)}
                compact
              />
            ))}
            {extraFields.map((name) => (
              <FieldInput
                key={name}
                field={inferFieldSchema(name, frontmatter[name])}
                value={frontmatter[name]}
                onChange={(v) => updateField(name, v)}
                compact
              />
            ))}
          </div>
        ) : (
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={28}
            className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 font-mono text-sm shadow-sm"
          />
        )}
      </div>
    </div>
  );
}