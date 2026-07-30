import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Realtime (presence) configuration for the client. Returns the WebSocket
 * server URL and — only to authenticated users — the shared handshake secret,
 * so the secret is never shipped in the public bundle. When no WS URL is
 * configured the CMS runs without presence and the client degrades gracefully.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_WS_URL ?? process.env.WS_URL ?? "";

  return NextResponse.json({
    url,
    // Only handed to logged-in users; empty when the server isn't secured.
    secret: url ? process.env.WS_AUTH_SECRET ?? "" : "",
    user: {
      id: session.user.id,
      name: session.user.name || session.user.email || "Anonymous",
      image: session.user.image ?? null,
    },
  });
}
