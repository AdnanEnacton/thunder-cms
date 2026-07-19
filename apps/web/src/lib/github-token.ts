/**
 * Returns the user's GitHub OAuth access token (plaintext).
 *
 * Account tokens are encrypted at rest (better-auth `encryptOAuthTokens`), so we
 * read them back through better-auth's `getAccessToken` API, which decrypts (and
 * refreshes when applicable). The dynamic import of `@/lib/auth` keeps this off
 * the static import graph — auth.ts -> org-github.ts -> github-token.ts would
 * otherwise form a cycle.
 */
export async function getGithubTokenForUser(
  userId: string,
): Promise<string | null> {
  const { authInstance } = await import("@/lib/auth");
  try {
    const result = await authInstance.api.getAccessToken({
      body: { providerId: "github", userId },
    });
    return result?.accessToken ?? null;
  } catch {
    return null;
  }
}
