import type { Metadata } from "next";
import { Outfit, Instrument_Serif } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";
import { CommandPalette } from "@/components/command-palette";
import { rtlLocales, type Locale } from "@/i18n/config";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  title: "THUNDER-CMS",
  description: "Git-based CMS for static site generators. Connect your repo and edit visually.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const dir = rtlLocales.includes(locale as Locale) ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${outfit.variable} ${instrumentSerif.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&m)){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased">
        <NextIntlClientProvider>
          {children}
          <CommandPalette />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
