import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  if (!req.auth) {
    const login = new URL("/login", req.nextUrl.origin);
    return Response.redirect(login);
  }
});

export const config = {
  matcher: ["/dashboard/:path*"],
};