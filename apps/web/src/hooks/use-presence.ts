"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

export interface PresenceMember {
  socketId: string;
  userId: string;
  name: string;
  image: string | null;
  color: string;
}

export interface PeerCursor {
  socketId: string;
  userId: string;
  name: string;
  color: string;
  surface: string;
  offset: number;
  length: number;
}

export interface CursorState {
  surface: string;
  offset: number;
  length: number;
}

interface RealtimeConfig {
  url: string;
  secret: string;
  user: { id: string; name: string; image: string | null };
}

interface UsePresenceResult {
  /** True once connected to a configured presence server. */
  enabled: boolean;
  /** Everyone currently in this entry, including yourself. */
  members: PresenceMember[];
  /** The color the server assigned to you. */
  selfColor: string | null;
  /** Latest known caret/selection of each remote peer. */
  peers: PeerCursor[];
  /** Broadcast your caret position to peers (throttled by the caller). */
  sendCursor: (state: CursorState) => void;
  /** Notify peers you just saved the entry. */
  sendSaved: () => void;
}

/**
 * Collaborative presence for a single entry. Connects to the standalone
 * socket.io server (see `apps/ws-server`) if `NEXT_PUBLIC_WS_URL` is configured,
 * joins a per-entry room, and exposes the live roster + peer cursors. If no WS
 * server is configured it stays inert (`enabled: false`) so the editor works
 * exactly as before.
 */
export function usePresence(projectId: string, filePath: string): UsePresenceResult {
  const [enabled, setEnabled] = useState(false);
  const [members, setMembers] = useState<PresenceMember[]>([]);
  const [selfColor, setSelfColor] = useState<string | null>(null);
  const [peers, setPeers] = useState<PeerCursor[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let cancelled = false;
    let socket: Socket | null = null;

    async function connect() {
      let config: RealtimeConfig;
      try {
        const res = await fetch("/api/realtime");
        if (!res.ok) return;
        config = await res.json();
      } catch {
        return;
      }
      if (cancelled || !config.url) return;

      const room = `${projectId}::${filePath}`;
      socket = io(config.url, {
        transports: ["websocket"],
        auth: {
          room,
          secret: config.secret || undefined,
          user: config.user,
        },
        reconnectionAttempts: 5,
        timeout: 8000,
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        if (!cancelled) setEnabled(true);
      });
      socket.on("presence:self", (data: { color: string }) => {
        if (!cancelled) setSelfColor(data.color);
      });
      socket.on("presence:update", (data: { members: PresenceMember[] }) => {
        if (!cancelled) setMembers(data.members ?? []);
      });
      socket.on("peer:cursor", (data: {
        socketId: string;
        userId: string;
        name: string;
        color: string;
        cursor: CursorState;
      }) => {
        if (cancelled) return;
        setPeers((prev) => {
          const next = prev.filter((p) => p.socketId !== data.socketId);
          next.push({
            socketId: data.socketId,
            userId: data.userId,
            name: data.name,
            color: data.color,
            surface: data.cursor.surface,
            offset: data.cursor.offset,
            length: data.cursor.length,
          });
          return next;
        });
      });
      socket.on("peer:left", (data: { socketId: string }) => {
        if (!cancelled) setPeers((prev) => prev.filter((p) => p.socketId !== data.socketId));
      });
      socket.on("disconnect", () => {
        if (!cancelled) setEnabled(false);
      });
      socket.on("connect_error", () => {
        // Presence is best-effort; stay quiet and leave the editor working.
        if (!cancelled) setEnabled(false);
      });
    }

    connect();

    return () => {
      cancelled = true;
      socket?.disconnect();
      socketRef.current = null;
      setEnabled(false);
      setMembers([]);
      setPeers([]);
      setSelfColor(null);
    };
  }, [projectId, filePath]);

  const sendCursor = useCallback((state: CursorState) => {
    socketRef.current?.emit("cursor:move", state);
  }, []);

  const sendSaved = useCallback(() => {
    socketRef.current?.emit("entry:saved");
  }, []);

  return { enabled, members, selfColor, peers, sendCursor, sendSaved };
}
