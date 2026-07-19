import { symmetricEncrypt, symmetricDecrypt } from "better-auth/crypto";

/**
 * At-rest encryption for tokens we store ourselves (e.g.
 * `Organization.githubAccessToken`). Uses better-auth's symmetric primitives
 * keyed by BETTER_AUTH_SECRET, so encrypt/decrypt are internally consistent.
 *
 * Note: this is a separate scheme from better-auth's own account-token
 * encryption (`account.encryptOAuthTokens`), which uses an enveloped format and
 * must be read back via `auth.api.getAccessToken`. Do not cross the two.
 */

const SECRET = process.env.BETTER_AUTH_SECRET;

/**
 * With a raw string key, `symmetricEncrypt` returns bare lowercase hex. A GitHub
 * token (e.g. `gho_...`) contains non-hex characters, so it never matches — this
 * lets us tolerate legacy plaintext values still sitting in the column.
 */
function looksEncrypted(value: string): boolean {
  return value.length % 2 === 0 && /^[0-9a-f]+$/i.test(value);
}

export async function encryptToken(plaintext: string): Promise<string> {
  if (!SECRET) throw new Error("BETTER_AUTH_SECRET is not set");
  return symmetricEncrypt({ key: SECRET, data: plaintext });
}

export async function decryptToken(
  value: string | null | undefined,
): Promise<string | null> {
  if (!value) return null;
  if (!SECRET) throw new Error("BETTER_AUTH_SECRET is not set");
  if (!looksEncrypted(value)) return value; // legacy plaintext tolerance
  try {
    return await symmetricDecrypt({ key: SECRET, data: value });
  } catch {
    return null;
  }
}
