"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles, Loader2, X, Key, Check, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getApiKey, setApiKey, runAiAction, type AiAction } from "@/lib/ai/client";

interface AiAssistantProps {
  open: boolean;
  body: string;
  onClose: () => void;
  onApply: (newBody: string) => void;
}

const TEXT_ACTIONS: { id: AiAction; label: string }[] = [
  { id: "improve", label: "Improve writing" },
  { id: "grammar", label: "Fix grammar" },
  { id: "shorter", label: "Make shorter" },
  { id: "longer", label: "Make longer" },
];

const SUGGEST_ACTIONS: { id: AiAction; label: string }[] = [
  { id: "title", label: "Suggest titles" },
  { id: "summary", label: "Summarize" },
];

export function AiAssistant({ open, body, onClose, onApply }: AiAssistantProps) {
  const [keyInput, setKeyInput] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState("");
  const [resultIsText, setResultIsText] = useState(true);
  const [customPrompt, setCustomPrompt] = useState("");
  const [error, setError] = useState("");

  if (!open) return null;

  function checkKey() {
    const k = getApiKey();
    setHasKey(!!k);
    if (!k) setShowKeyForm(true);
  }

  function saveKey() {
    setApiKey(keyInput.trim());
    setHasKey(!!keyInput.trim());
    setShowKeyForm(false);
    setKeyInput("");
  }

  async function run(action: AiAction) {
    if (!hasKey) {
      checkKey();
      return;
    }
    setRunning(true);
    setError("");
    setResult("");
    try {
      const out = await runAiAction(action, body, customPrompt.trim() || undefined);
      setResult(out);
      setResultIsText(action === "title" || action === "summary");
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI request failed");
    } finally {
      setRunning(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-thunder-50 text-thunder-600 dark:bg-thunder-500/15 dark:text-thunder-300">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold">AI assistant</h2>
              <p className="text-xs text-muted">BYOK · OpenAI · key stored in your browser</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasKey ? (
              <button
                type="button"
                onClick={() => setShowKeyForm(!showKeyForm)}
                className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
                title="Manage API key"
              >
                <Check className="h-3 w-3 text-emerald-500" /> Key set
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowKeyForm(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-thunder-600 hover:underline"
              >
                <Key className="h-3 w-3" /> Set API key
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted hover:bg-surface-overlay"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {showKeyForm && (
          <div className="space-y-2 border-b border-border bg-surface-subtle px-5 py-4">
            <label className="text-xs font-medium">OpenAI API key</label>
            <Input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="sk-..."
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted">Stored only in this browser (localStorage). Get a key at platform.openai.com.</p>
              <Button size="sm" onClick={saveKey} disabled={!keyInput.trim()}>
                Save key
              </Button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto px-5 py-4">
          <div className="grid grid-cols-2 gap-2">
            {TEXT_ACTIONS.map((a) => (
              <button
                key={a.id}
                type="button"
                disabled={running}
                onClick={() => run(a.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border border-border bg-surface-subtle px-3 py-2.5 text-sm font-medium transition-colors hover:bg-surface-overlay disabled:opacity-50",
                )}
              >
                <Wand2 className="h-3.5 w-3.5 text-thunder-600" />
                {a.label}
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {SUGGEST_ACTIONS.map((a) => (
              <button
                key={a.id}
                type="button"
                disabled={running}
                onClick={() => run(a.id)}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface-subtle px-3 py-2.5 text-sm font-medium transition-colors hover:bg-surface-overlay disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5 text-thunder-600" />
                {a.label}
              </button>
            ))}
          </div>

          <div className="mt-3 space-y-2">
            <label className="text-xs font-medium">Custom instruction (optional)</label>
            <Input
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g. Rewrite in a playful tone"
            />
            <Button size="sm" variant="secondary" disabled={running || !hasKey} onClick={() => run("improve")}>
              {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              Run custom
            </Button>
          </div>

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

          {result && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Result</p>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-surface-subtle p-3 text-sm">
                {result}
              </pre>
              {!resultIsText && (
                <Button
                  size="sm"
                  onClick={() => {
                    onApply(result);
                    onClose();
                  }}
                >
                  Apply to content
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
