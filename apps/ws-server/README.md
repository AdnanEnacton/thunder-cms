# @thunder/ws-server

Realtime presence server for THUNDER-CMS collaborative editing (Phase 5.3).

A small standalone [socket.io](https://socket.io) server. The Next.js app is
serverless and can't hold persistent WebSocket connections, so presence + live
cursors run here instead. One room per entry (`projectId::filePath`); the server
tracks who's connected and relays cursor positions between peers. State is
in-memory only — restart-safe because clients just rejoin.

## Run

```bash
pnpm --filter @thunder/ws-server dev     # tsx watch, port 4001
pnpm --filter @thunder/ws-server build   # bundle to dist/
pnpm --filter @thunder/ws-server start   # node dist/index.js
```

## Env

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `4001` | Listen port. |
| `WS_ALLOW_ORIGIN` | `*` | Comma-separated CORS origins (set to your CMS origin in prod). |
| `WS_AUTH_SECRET` | _(unset)_ | When set, clients must send it as `auth.secret` in the handshake. |

Point the web app at this server with `NEXT_PUBLIC_WS_URL` (e.g.
`https://presence.yourdomain.com`). If `NEXT_PUBLIC_WS_URL` is unset the CMS
simply runs without presence — the feature degrades gracefully.

## Deploy

Any host that supports long-lived Node processes / WebSockets works
(Render, Railway, Fly.io, a VM, etc.). Set `WS_ALLOW_ORIGIN` to your CMS origin
and `WS_AUTH_SECRET` to a shared secret also given to the web app as
`WS_AUTH_SECRET` (read at request time and forwarded to the client — see
`apps/web/src/app/api/realtime/route.ts`).

## Protocol

Client → server:
- handshake `auth`: `{ room, user: { id, name, image }, secret? }`
- `cursor:move` `{ surface, offset, length }`
- `entry:saved`

Server → client:
- `presence:self` `{ color }`
- `presence:update` `{ members: Member[] }`
- `peer:cursor` `{ socketId, userId, name, color, cursor }`
- `peer:saved` `{ userId, name }`
- `peer:left` `{ socketId }`
