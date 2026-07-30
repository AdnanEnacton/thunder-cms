"use client";

import { Users } from "lucide-react";
import type { PresenceMember } from "@/hooks/use-presence";

interface PresenceBarProps {
  members: PresenceMember[];
  /** The current user's assigned color, so we can mark "you" in the stack. */
  selfColor: string | null;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Live collaborator avatars for the entry header. Renders overlapping avatars
 * for everyone currently in the entry (from the presence server). Renders
 * nothing when you're the only one here, so solo editing stays uncluttered.
 */
export function PresenceBar({ members, selfColor }: PresenceBarProps) {
  // Show peers first; only surface the bar when someone else is present.
  const others = members.filter((m) => m.color !== selfColor);
  if (others.length === 0) return null;

  const shown = members.slice(0, 5);
  const overflow = members.length - shown.length;

  return (
    <div
      className="flex items-center gap-2 rounded-lg border border-thunder-300/40 bg-thunder-50/60 px-2 py-1 dark:bg-thunder-500/10"
      title={`${members.length} editing now: ${members.map((m) => m.name).join(", ")}`}
    >
      <Users className="h-3.5 w-3.5 shrink-0 text-thunder-600 dark:text-thunder-300" />
      <div className="flex -space-x-1.5">
        {shown.map((m) => (
          <span
            key={m.socketId}
            className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface-raised text-[9px] font-bold text-white shadow-sm"
            style={{ backgroundColor: m.color }}
            title={m.color === selfColor ? `${m.name} (you)` : m.name}
          >
            {m.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.image} alt={m.name} className="h-full w-full rounded-full object-cover" />
            ) : (
              initials(m.name)
            )}
          </span>
        ))}
        {overflow > 0 && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface-raised bg-muted text-[9px] font-bold text-white">
            +{overflow}
          </span>
        )}
      </div>
    </div>
  );
}
