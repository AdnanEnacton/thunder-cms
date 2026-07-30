"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { LOCALE_COOKIE, locales, localeLabels, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

interface LocaleSwitcherProps {
  className?: string;
}

/**
 * Interface-language selector (Phase 5.1). Writes the chosen locale to the
 * `THUNDER_LOCALE` cookie and refreshes so the server re-renders with the new
 * messages. No page reload, no URL change.
 */
export function LocaleSwitcher({ className }: LocaleSwitcherProps) {
  const t = useTranslations("settings");
  const active = useLocale() as Locale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(next: string) {
    // One-year, site-wide cookie. Read server-side in src/i18n/request.ts.
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <label className={cn("flex items-center gap-2", className)}>
      <Globe className="h-4 w-4 shrink-0 text-muted" />
      <span className="sr-only">{t("language")}</span>
      <select
        value={active}
        disabled={pending}
        onChange={(e) => change(e.target.value)}
        className="rounded-lg border border-border bg-surface-subtle px-2.5 py-1.5 text-sm outline-none transition-colors hover:border-thunder-300/50 focus:border-thunder-400 disabled:opacity-60"
      >
        {locales.map((loc) => (
          <option key={loc} value={loc}>
            {localeLabels[loc]}
          </option>
        ))}
      </select>
    </label>
  );
}
