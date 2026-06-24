"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { ContentDocument, FieldSchema } from "@thunder/types";
import { BodyEditor } from "@/components/content/body-editor";
import { FieldInput } from "@/components/content/field-input";
import { SectionAccordion } from "@/components/content/section-accordion";
import { collectTemplateOptions } from "@/lib/content/field-ui";
import { inferFieldSchema } from "@/lib/content/schema";
import { Button } from "@/components/ui/button";

interface EntryEditorProps {
  projectId: string;
  filePath: string;
  onBack?: () => void;
}

export function EntryEditor({ projectId, filePath, onBack }: EntryEditorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sha, setSha] = useState("");
  const [format, setFormat] = useState<ContentDocument["format"]>("md");
  const [frontmatter, setFrontmatter] = useState<Record<string, unknown>>({});
  const [body, setBody] = useState("");
  const [fields, setFields] = useState<FieldSchema[]>([]);
  const [bodyMode, setBodyMode] = useState<"visual" | "markdown">("visual");
  const [expandedSectionIndex, setExpandedSectionIndex] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      setExpandedSectionIndex(null);
      const response = await fetch(
        `/api/projects/${projectId}/content/entry?path=${encodeURIComponent(filePath)}`,
      );
      const data = await response.json();
      setLoading(false);

      if (!response.ok) {
        setError(data.error ?? "Failed to load entry");
        return;
      }

      setSha(data.sha);
      setFormat(data.format);
      setFrontmatter(data.frontmatter ?? {});
      setBody(data.body ?? "");
      setFields(data.fields ?? []);
    }

    load();
  }, [projectId, filePath]);

  function updateField(name: string, value: unknown) {
    setFrontmatter((prev) => ({ ...prev, [name]: value }));
  }

  function updateSection(index: number, value: unknown) {
    const sections = Array.isArray(frontmatter.sections) ? [...frontmatter.sections] : [];
    sections[index] = value;
    updateField("sections", sections);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");

    const response = await fetch(`/api/projects/${projectId}/content/entry`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: filePath, sha, frontmatter, body, format }),
    });

    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      setError(data.error ?? "Failed to save");
      return;
    }

    if (data.sha) setSha(data.sha);
    setSuccess("Saved successfully.");
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Delete this entry from your repository?")) return;

    const response = await fetch(
      `/api/projects/${projectId}/content/entry?path=${encodeURIComponent(filePath)}`,
      { method: "DELETE" },
    );

    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Failed to delete");
      return;
    }

    router.push(`/dashboard/projects/${projectId}`);
    router.refresh();
  }

  if (loading) {
    return <div className="flex h-full items-center justify-center text-muted">Loading...</div>;
  }

  const knownFieldNames = new Set(fields.map((f) => f.name));
  const extraFields = Object.keys(frontmatter).filter((k) => !knownFieldNames.has(k));
  const basicFields = fields.filter((f) => f.name !== "sections" && f.name !== "draft");
  const basicExtras = extraFields.filter((n) => n !== "sections" && n !== "draft");
  const sections = Array.isArray(frontmatter.sections) ? frontmatter.sections : [];
  const templateOptions = collectTemplateOptions(sections);

  return (
    <div className="flex h-full flex-col bg-surface">
      <header className="flex items-center justify-between border-b border-border bg-surface-raised px-5 py-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1 text-sm text-muted hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleDelete}>
            Delete
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </header>

      {(error || success) && (
        <div className="border-b border-border px-5 py-2">
          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-700">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-sm text-green-700">
              {success}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-[min(520px,48%)] shrink-0 flex-col overflow-auto border-r border-border bg-surface-raised px-5 py-5">
          <div className="space-y-5">
            {typeof frontmatter.draft === "boolean" && (
              <FieldInput
                field={{ name: "draft", type: "boolean", label: "Draft" }}
                value={frontmatter.draft}
                onChange={(v) => updateField("draft", v)}
                compact
                projectId={projectId}
              />
            )}

            {basicFields.map((field) => (
              <FieldInput
                key={field.name}
                field={field}
                value={frontmatter[field.name]}
                onChange={(v) => updateField(field.name, v)}
                compact
                projectId={projectId}
              />
            ))}

            {basicExtras.map((name) => (
              <FieldInput
                key={name}
                field={inferFieldSchema(name, frontmatter[name])}
                value={frontmatter[name]}
                onChange={(v) => updateField(name, v)}
                compact
                projectId={projectId}
              />
            ))}

            {sections.length > 0 && (
              <SectionAccordion
                sections={sections}
                expandedIndex={expandedSectionIndex}
                onExpand={setExpandedSectionIndex}
                onSectionChange={updateSection}
                templateOptions={templateOptions}
                projectId={projectId}
              />
            )}
          </div>
        </div>

        <BodyEditor
          key={filePath}
          projectId={projectId}
          value={body}
          onChange={setBody}
          mode={bodyMode}
          onModeChange={setBodyMode}
        />
      </div>
    </div>
  );
}