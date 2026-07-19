// DEPRECATED — do not run.
//
// This script used to copy a GitHub OAuth token from an owner's Account row into
// Organization.githubAccessToken. That is now handled automatically by the app:
//   - Account tokens are encrypted at rest (better-auth `encryptOAuthTokens`).
//   - The `account.create/update` database hook syncs the org token (encrypted
//     via lib/token-crypto) on every GitHub sign-in.
//   - lib/org-github.ts `resolveOrgGithubToken()` backfills on demand.
//
// Reading Account.accessToken directly here would yield better-auth's enveloped
// ciphertext, which is NOT compatible with our org-token encryption scheme, so
// this script has been neutralized to prevent writing corrupt tokens.

console.error(
  "backfill-org-github is deprecated and disabled. Org GitHub tokens are now " +
    "synced automatically by the app on GitHub sign-in. See lib/org-github.ts.",
);
process.exit(1);
