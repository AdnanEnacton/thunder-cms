"use client";

import { useEffect, useState } from "react";
import { Check, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiKey, setApiKey, getModel, setModel } from "@/lib/ai/client";

export function AiKeySettings() {
  const [keyInput, setKeyInput] = useState("");
  const [model, setModelState] = useState("gpt-4o-mini");
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setModelState(getModel());
    setSaved(!!getApiKey());
    setMounted(true);
  }, []);

  function save() {
    setApiKey(keyInput.trim());
    setModel(model.trim() || "gpt-4o-mini");
    setSaved(!!keyInput.trim() || !!getApiKey());
    setKeyInput("");
  }

  function clear() {
    setApiKey("");
    setSaved(false);
  }

  if (!mounted) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-thunder-50 text-thunder-600 dark:bg-thunder-500/15 dark:text-thunder-300">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">OpenAI API key</p>
          <p className="text-xs text-muted">
            {saved ? "Key is set. Stored only in this browser." : "Bring your own key (BYOK). Stored locally only."}
          </p>
        </div>
        {saved && <span className="badge badge-success"><Check className="h-3 w-3" /> Set</span>}
      </div>

      <Input
        type="password"
        value={keyInput}
        onChange={(e) => setKeyInput(e.target.value)}
        placeholder={saved ? "Enter a new key to replace" : "sk-..."}
      />

      <div className="flex items-center gap-2">
        <label className="text-xs text-muted">Model</label>
        <input
          value={model}
          onChange={(e) => setModelState(e.target.value)}
          className="flex-1 rounded-md border border-border bg-surface-subtle px-2.5 py-1.5 text-xs outline-none focus:border-thunder-400"
          placeholder="gpt-4o-mini"
        />
      </div>

      <div className="flex items-center justify-between">
        <a
          href="https://platform.openai.com/api-keys"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-thunder-600 hover:underline"
        >
          Get a key <ExternalLink className="h-3 w-3" />
        </a>
        <div className="flex gap-2">
          {saved && (
            <Button variant="ghost" size="sm" onClick={clear}>
              Clear
            </Button>
          )}
          <Button size="sm" onClick={save} disabled={!keyInput.trim() && !model.trim()}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
