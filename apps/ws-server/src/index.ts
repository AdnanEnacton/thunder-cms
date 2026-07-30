/**
 * THUNDER-CMS realtime presence server.
 *
 * A standalone socket.io server that powers collaborative presence + live
 * cursors inside the entry editor. Each entry (project + file path) is a room;
 * the server tracks who's connected and relays cursor/selection positions
 * between peers so the CMS can render "Alice is editing" avatars and remote
 * carets in real time.
 *
 * This is intentionally stateless beyond in-memory room membership — if the
 * process restarts, clients simply rejoin. No DB, no persistence.
 *
 * Env:
 *   PORT            - listen port (default 4001)
 *   WS_ALLOW_ORIGIN - comma-separated allowed origins for CORS (default "*")
 *   WS_AUTH_SECRET  - optional shared secret; when set, clients must send it in
 *                     the socket handshake `auth.secret` or they're rejected.
 */
import { createServer } from "node:http";
import { Server, type Socket } from "socket.io";

const PORT = Number(process.env.PORT ?? 4001);
const ALLOW_ORIGIN = process.env.WS_ALLOW_ORIGIN ?? "*";
const AUTH_SECRET = process.env.WS_AUTH_SECRET ?? "";

/** A connected collaborator, as advertised in the handshake. */
interface Member {
  socketId: string;
  userId: string;
  name: string;
  image: string | null;
  color: string;
}

/** Cursor / selection state a client broadcasts as they move. */
interface CursorState {
  /** Which editor surface the caret is in ("markdown" | "visual"). */
  surface: string;
  /** Character offset of the caret (markdown textarea). */
  offset: number;
  /** Selection length from the offset (0 = plain caret). */
  length: number;
}

interface HandshakeAuth {
  secret?: string;
  room?: string;
  user?: { id?: string; name?: string; image?: string | null };
}

// Deterministic, high-contrast avatar/caret colors — assigned round-robin so
// two people in the same room never share one (until we exceed the palette).
const COLORS = [
  "#e8590c", // ember
  "#1c7ed6", // blue
  "#2f9e44", // green
  "#9c36b5", // grape
  "#e03131", // red
  "#0c8599", // teal
  "#f08c00", // amber
  "#5f3dc4", // violet
];

/** room -> (socketId -> Member) */
const rooms = new Map<string, Map<string, Member>>();

function memberList(room: string): Member[] {
  return [...(rooms.get(room)?.values() ?? [])];
}

function pickColor(room: string): string {
  const used = new Set(memberList(room).map((m) => m.color));
  return COLORS.find((c) => !used.has(c)) ?? COLORS[memberList(room).length % COLORS.length];
}

const httpServer = createServer((req, res) => {
  // Lightweight health check for platform probes.
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server(httpServer, {
  cors: {
    origin: ALLOW_ORIGIN === "*" ? "*" : ALLOW_ORIGIN.split(",").map((s) => s.trim()),
    methods: ["GET", "POST"],
  },
});

io.use((socket, next) => {
  const auth = socket.handshake.auth as HandshakeAuth;
  if (AUTH_SECRET && auth?.secret !== AUTH_SECRET) {
    next(new Error("unauthorized"));
    return;
  }
  if (!auth?.room || !auth?.user?.id) {
    next(new Error("missing room or user"));
    return;
  }
  next();
});

io.on("connection", (socket: Socket) => {
  const auth = socket.handshake.auth as HandshakeAuth;
  const room = auth.room!;
  const user = auth.user!;

  const member: Member = {
    socketId: socket.id,
    userId: user.id!,
    name: user.name || "Anonymous",
    image: user.image ?? null,
    color: pickColor(room),
  };

  let bucket = rooms.get(room);
  if (!bucket) {
    bucket = new Map();
    rooms.set(room, bucket);
  }
  bucket.set(socket.id, member);
  socket.join(room);

  // Tell the newcomer their assigned color, then broadcast the full roster.
  socket.emit("presence:self", { color: member.color });
  io.to(room).emit("presence:update", { members: memberList(room) });

  socket.on("cursor:move", (state: CursorState) => {
    // Relay to everyone else in the room, tagged with who sent it.
    socket.to(room).emit("peer:cursor", {
      socketId: socket.id,
      userId: member.userId,
      name: member.name,
      color: member.color,
      cursor: state,
    });
  });

  // Optional: broadcast that this user just saved, so peers can refresh.
  socket.on("entry:saved", () => {
    socket.to(room).emit("peer:saved", { userId: member.userId, name: member.name });
  });

  socket.on("disconnect", () => {
    const b = rooms.get(room);
    if (!b) return;
    b.delete(socket.id);
    if (b.size === 0) {
      rooms.delete(room);
    } else {
      io.to(room).emit("presence:update", { members: memberList(room) });
      socket.to(room).emit("peer:left", { socketId: socket.id });
    }
  });
});

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[thunder-ws] presence server listening on :${PORT}`);
});
