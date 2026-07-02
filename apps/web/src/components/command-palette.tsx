"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  Activity,
  FileText,
  ImageIcon,
  LayoutDashboard,
  Search,
  Settings,
  Sparkles,
  Users,
  CornerDownLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PaletteItem {
  id: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  group: string;
}

interface Collection {
  id: string;
  label: string;
  rootId: string;
  folderPath: string | null;
  group: string | null;
}

interface SearchResult {
  path: string;
  title: string;
  draft: boolean;
  collectionId: string;
}

export function CommandPalette() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const projectId = pathname.match(/\/dashboard\/projects\/([^\/]+)/)?.[1];
  const isProject = projectId && projectId !== "new";

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActive(0);
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !isProject) return;
    fetch(`/api/projects/${projectId}/content/collections`)
      .then((r) => r.json())
      .then((d) => setCollections(d.collections ?? []))
      .catch(() => {});
  }, [open, isProject, projectId]);

  useEffect(() => {
    if (!open || !isProject) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      fetch(`/api/projects/${projectId}/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => setResults(d.entries ?? []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(t);
  }, [query, open, isProject, projectId]);

  const navItems: PaletteItem[] = useMemo(() => {
    if (!isProject) return [];
    const base = `/dashboard/projects/${projectId}`;
    const items: PaletteItem[] = [
      { id: "nav-content", label: "Content", icon: FileText, group: "Navigate", action: () => router.push(base) },
      { id: "nav-media", label: "Media library", icon: ImageIcon, group: "Navigate", action: () => router.push(`${base}?view=media`) },
      { id: "nav-team", label: "Team", icon: Users, group: "Navigate", action: () => router.push(`${base}/team`) },
      { id: "nav-activity", label: "Activity log", icon: Activity, group: "Navigate", action: () => router.push(`${base}/activity`) },
      { id: "nav-dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Navigate", action: () => router.push("/dashboard") },
    ];
    if (collections.length) {
      for (const c of collections) {
        items.push({
          id: `col-${c.id}`,
          label: c.group ? `${c.group} / ${c.label}` : c.label,
          hint: c.folderPath ?? undefined,
          icon: FileText,
          group: "Collections",
          action: () => router.push(`${base}?view=content&collection=${c.id}`),
        });
      }
    }
    return items;
  }, [isProject, projectId, collections, router]);

  const filteredNav = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return navItems;
    return navItems.filter(
      (i) => i.label.toLowerCase().includes(q) || (i.hint?.toLowerCase().includes(q) ?? false),
    );
  }, [navItems, query]);

  const allItems: PaletteItem[] = useMemo(() => {
    const searchItems: PaletteItem[] = results.map((r) => ({
      id: `search-${r.path}`,
      label: r.title,
      hint: r.path,
      icon: FileText,
      group: "Entries",
      action: () => router.push(`/dashboard/projects/${projectId}?view=content&entry=${encodeURIComponent(r.path)}`),
    }));
    return [...filteredNav, ...searchItems];
  }, [filteredNav, results, projectId, router]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, allItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        allItems[active]?.action();
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, allItems, active]);

  if (!open) return null;

  const groups = useMemo(() => {
    const map = new Map<string, PaletteItem[]>();
    for (const item of allItems) {
      const arr = map.get(item.group) ?? [];
      arr.push(item);
      map.set(item.group, arr);
    }
    return Array.from(map.entries());
  }, [allItems]);

  let flatIndex = -1;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-start justify-center bg-foreground/40 p-4 pt-[12vh] backdrop-blur-[2px]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isProject ? "Search entries, collections, navigate…" : "Press Esc to close"}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border bg-surface-subtle px-1.5 py-0.5 text-[10px] text-muted">ESC</kbd>
        </div>

        <div className="max-h-[50vh] overflow-auto p-2">
          {!isProject ? (
            <p className="px-3 py-6 text-center text-sm text-muted">
              Open a project to search its content.
            </p>
          ) : allItems.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted">
              {searching ? "Searching…" : "No results."}
            </p>
          ) : (
            groups.map(([group, items]) => (
              <div key={group} className="mb-1">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group}
                </p>
                {items.map((item) => {
                  flatIndex += 1;
                  const idx = flatIndex;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => {
                        item.action();
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm",
                        idx === active ? "bg-thunder-50 text-thunder-700 dark:bg-thunder-500/15 dark:text-thunder-300" : "text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted" />
                      <span className="truncate">{item.label}</span>
                      {item.hint && (
                        <span className="ml-auto truncate font-mono text-[11px] text-muted">{item.hint}</span>
                      )}
                      {idx === active && <CornerDownLeft className="h-3 w-3 shrink-0 text-muted" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border bg-surface-subtle px-3 py-2 text-[11px] text-muted">
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" /> THUNDER-CMS
          </span>
          <span className="flex items-center gap-3">
            <span>↑↓ navigate</span>
            <span>↵ select</span>
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
