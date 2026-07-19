import { createAuthClient } from "better-auth/react";

// baseURL defaults to the current origin in the browser, so no config needed
// for same-origin usage.
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
