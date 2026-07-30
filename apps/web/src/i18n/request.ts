import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "./config";

/** Read the active locale from the cookie, falling back to the default. */
export async function getCurrentLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
}

/**
 * Deep-merges a partial locale catalog over the complete English base so any
 * key a translator hasn't filled in yet falls back to English instead of
 * showing a missing-message error. This is what lets the 11 non-English files
 * ship as partial stubs.
 */
function deepMerge(
  base: Record<string, unknown>,
  overrides: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    const existing = out[key];
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      existing &&
      typeof existing === "object" &&
      !Array.isArray(existing)
    ) {
      out[key] = deepMerge(existing as Record<string, unknown>, value as Record<string, unknown>);
    } else if (value !== undefined && value !== "") {
      out[key] = value;
    }
  }
  return out;
}

export default getRequestConfig(async () => {
  const locale = await getCurrentLocale();

  const en = (await import("../../messages/en.json")).default as Record<string, unknown>;
  const messages =
    locale === defaultLocale
      ? en
      : deepMerge(en, (await import(`../../messages/${locale}.json`)).default);

  return { locale, messages };
});
