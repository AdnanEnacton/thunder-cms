"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  History,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { BlockDef, ContentDocument, FieldSchema, PageTypeDef } from "@thunder/types";
import { BodyEditor } from "@/components/content/body-editor";
import { FieldInput } from "@/components/content/field-input";
import { SectionAccordion } from "@/components/content/section-accordion";
import { PageBuilder } from "@/components/content/page-builder/page-builder";
import { COMPONENT_PAGE_TYPE } from "@/lib/blocks/registry";
import { collectTemplateOptions } from "@/lib/content/field-ui";
import { inferFieldSchema } from "@/lib/content/schema";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadingState } from "@/components/ui/loading-state";
import { CommitMessageDialog } from "@/components/content/commit-message-dialog";
import { ConflictDialog } from "@/components/content/conflict-dialog";
import { VersionHistory } from "@/components/content/version-history";
import { AiAssistant } from "@/components/content/ai-assistant";

interface EntryEditorProps {
  projectId: string;
  filePath: string;
  onBack?: () => void;
}

interface ProjectSettings {
  commitMessageMode: "auto" | "custom";
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [settings, setSettings] = useState<ProjectSettings>({ commitMessageMode: "auto" });
  const [blockDefs, setBlockDefs] = useState<BlockDef[]>([]);
  const [pageTypeDefs, setPageTypeDefs] = useState<PageTypeDef[]>([]);
  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [showConflict, setShowConflict] = useState(false);
  const [resolvingConflict, setResolvingConflict] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<{ userName: string; at: string } | null>(null);
  // Remembers the commit message of the last save attempt so an overwrite
  // (after a conflict) reuses it instead of the default.
  const lastMessageRef = useRef<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      setExpandedSectionIndex(null);
      const [entryRes, settingsRes, blocksRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/content/entry?path=${encodeURIComponent(filePath)}`),
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/blocks`),
      ]);

      const data = await entryRes.json();
      setLoading(false);

      if (!entryRes.ok) {
        setError(data.error ?? "Failed to load entry");
        return;
      }

      setSha(data.sha);
      setFormat(data.format);
      setFrontmatter(data.frontmatter ?? {});
      setBody(data.body ?? "");
      setFields(data.fields ?? []);

      if (settingsRes.ok) {
        const s = await settingsRes.json();
        setSettings({
          commitMessageMode: s.project?.commitMessageMode ?? "auto",
        });
      }

      if (blocksRes.ok) {
        const b = await blocksRes.json();
        setBlockDefs(Array.isArray(b.blocks) ? b.blocks : []);
        setPageTypeDefs(Array.isArray(b.pageTypes) ? b.pageTypes : []);
      }

      refreshLastUpdated();
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, filePath]);

  async function refreshLastUpdated() {
    try {
      const params = new URLSearchParams({ paths: filePath });
      const res = await fetch(`/api/projects/${projectId}/content/entries/last-updated?${params.toString()}`);
      const data = await res.json();
      setLastUpdated(data.items?.[filePath] ?? null);
    } catch {
      setLastUpdated(null);
    }
  }

  function updateField(name: string, value: unknown) {
    setFrontmatter((prev) => ({ ...prev, [name]: value }));
  }

  function updateSection(index: number, value: unknown) {
    const sections = Array.isArray(frontmatter.sections) ? [...frontmatter.sections] : [];
    sections[index] = value;
    updateField("sections", sections);
  }

  async function performSave(message: string | null, overrideSha?: string) {
    lastMessageRef.current = message;
    setSaving(true);
    setError("");
    setSuccess("");

    const response = await fetch(`/api/projects/${projectId}/content/entry`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: filePath, sha: overrideSha ?? sha, frontmatter, body, format, message }),
    });

    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      if (response.status === 409 || data.conflict) {
        // Someone committed a newer version — let the user choose how to resolve.
        setShowConflict(true);
        return false;
      }
      setError(data.error ?? "Failed to save");
      return false;
    }

    if (data.sha) setSha(data.sha);
    setSuccess("Saved successfully");
    setPendingMessage(null);
    refreshLastUpdated();
    router.refresh();
    return true;
  }

  // Discard local edits and reload the newest version from the repo.
  async function reloadLatest() {
    setResolvingConflict(true);
    const res = await fetch(
      `/api/projects/${projectId}/content/entry?path=${encodeURIComponent(filePath)}`,
    );
    const data = await res.json();
    setResolvingConflict(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to reload entry");
      return;
    }

    setSha(data.sha);
    setFormat(data.format);
    setFrontmatter(data.frontmatter ?? {});
    setBody(data.body ?? "");
    setFields(data.fields ?? []);
    setShowConflict(false);
    setError("");
    setSuccess("Reloaded the latest version.");
  }

  // Force-save local edits over the newer version (fetch latest SHA, then save).
  async function overwriteLatest() {
    setResolvingConflict(true);
    const res = await fetch(
      `/api/projects/${projectId}/content/entry?path=${encodeURIComponent(filePath)}`,
    );
    const data = await res.json();

    if (!res.ok) {
      setResolvingConflict(false);
      setError(data.error ?? "Failed to resolve conflict");
      return;
    }

    setShowConflict(false);
    const saved = await performSave(lastMessageRef.current, data.sha);
    setResolvingConflict(false);
    if (saved) setPendingMessage(null);
  }

  function handleSaveClick() {
    const title = (frontmatter.title as string) || filePath.split("/").pop() || "entry";
    if (settings.commitMessageMode === "custom") {
      setPendingMessage(`Update: "${title}"`);
      setShowCommitDialog(true);
    } else {
      performSave(null);
    }
  }

  async function handleDelete() {
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
    return (
      <LoadingState
        variant="panel"
        title="Loading entry"
        description="Fetching content and metadata from your repository."
        className="h-full bg-surface"
      />
    );
  }

  const knownFieldNames = new Set(fields.map((f) => f.name));
  const extraFields = Object.keys(frontmatter).filter((k) => !knownFieldNames.has(k));
  const basicFields = fields.filter((f) => f.name !== "sections" && f.name !== "draft");
  const basicExtras = extraFields.filter((n) => n !== "sections" && n !== "draft");
  const sections = Array.isArray(frontmatter.sections) ? frontmatter.sections : [];
  const templateOptions = collectTemplateOptions(sections);
  const entryTitle = (frontmatter.title as string) || filePath.split("/").pop() || "Untitled";
  // A page is block-based when explicitly typed "component" or when its `type`
  // matches a custom (non-markdown) page type — all of which are block-based.
  const pageTypeKey = typeof frontmatter.type === "string" ? frontmatter.type : undefined;
  const isComponentPage =
    pageTypeKey === COMPONENT_PAGE_TYPE ||
    (!!pageTypeKey &&
      pageTypeKey !== "markdown" &&
      pageTypeDefs.some((pt) => pt.key === pageTypeKey));

  return (
    <div className="flex h-full flex-col bg-surface">
      <header className="flex items-center justify-between border-b border-border bg-surface-raised px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted transition-colors hover:bg-surface-overlay hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          )}
          <div className="min-w-0 border-l border-border pl-3">
            <p className="truncate text-sm font-semibold tracking-tight">{entryTitle}</p>
            <p className="truncate font-mono text-[11px] text-muted">
              {filePath}
              {lastUpdated && (
                <span className="ml-2 font-sans text-muted-foreground">
                  · Updated by {lastUpdated.userName} on{" "}
                  {new Date(lastUpdated.at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(true)}
            className="text-muted hover:text-foreground"
            title="Version history"
          >
            <History className="h-3.5 w-3.5" />
            History
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAi(true)}
            className="text-muted hover:text-thunder-600"
            title="AI assistant"
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-muted hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
          <Button size="sm" onClick={handleSaveClick} disabled={saving}>
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </header>

      {(error || success) && (
        <div className="border-b border-border px-5 py-2">
          {error && (
            <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-1.5 text-sm text-destructive">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
              {success}
            </p>
          )}
        </div>
      )}

      {isComponentPage ? (
        <div className="flex flex-1 overflow-hidden">
          <PageBuilder
            projectId={projectId}
            frontmatter={frontmatter}
            onFrontmatterChange={setFrontmatter}
          />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex w-[min(520px,48%)] shrink-0 flex-col overflow-auto border-r border-border bg-surface-raised">
            <div className="border-b border-border px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Metadata
              </p>
            </div>
            <div className="space-y-5 px-5 py-5">
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
                  blocks={blockDefs}
                />
              )}
            </div>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden">
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
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete this entry?"
        description="This will permanently remove the file from your GitHub repository."
        confirmLabel="Delete entry"
        variant="destructive"
        onConfirm={() => {
          setShowDeleteConfirm(false);
          handleDelete();
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <CommitMessageDialog
        open={showCommitDialog}
        defaultTitle={(frontmatter.title as string) || filePath.split("/").pop() || "entry"}
        saving={saving}
        onClose={() => {
          setShowCommitDialog(false);
          setPendingMessage(null);
        }}
        onConfirm={(message) => performSave(message)}
      />

      <ConflictDialog
        open={showConflict}
        busy={resolvingConflict}
        onReload={reloadLatest}
        onOverwrite={overwriteLatest}
        onCancel={() => setShowConflict(false)}
      />

      <VersionHistory
        open={showHistory}
        projectId={projectId}
        filePath={filePath}
        onClose={() => setShowHistory(false)}
        onRestored={() => {
          setSuccess("Restored — reloading entry…");
          setError("");
          setTimeout(() => window.location.reload(), 800);
        }}
      />

      <AiAssistant
        open={showAi}
        body={body}
        onClose={() => setShowAi(false)}
        onApply={(newBody) => {
          setBody(newBody);
          setSuccess("AI result applied. Remember to Save.");
          setError("");
        }}
      />
    </div>
  );
}
