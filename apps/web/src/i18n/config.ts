/**
 * i18n configuration (Phase 5.1). THUNDER-CMS uses cookie-based locale
 * selection (no `[locale]` URL segment) so it layers onto the existing
 * dashboard routes without restructuring. The active locale is stored in the
 * `THUNDER_LOCALE` cookie and read at request time by `request.ts`.
 */

export const LOCALE_COOKIE = "THUNDER_LOCALE";

export const defaultLocale = "en" as const;

/** The 12 shipped locales. `en` is complete; the rest are translator stubs. */
export const locales = [
  "en",
  "es",
  "fr",
  "de",
  "pt",
  "it",
  "nl",
  "ja",
  "ko",
  "zh",
  "ru",
  "ar",
] as const;

export type Locale = (typeof locales)[number];

/** Human labels for the switcher (shown in each locale's own language). */
export const localeLabels: Record<Locale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  pt: "Português",
  it: "Italiano",
  nl: "Nederlands",
  ja: "日本語",
  ko: "한국어",
  zh: "中文",
  ru: "Русский",
  ar: "العربية",
};

/** Right-to-left locales, for setting `dir` on <html>. */
export const rtlLocales: Locale[] = ["ar"];

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}
