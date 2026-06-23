import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "THUNDER-CMS",
  description: "Git-based CMS for static site generators. Connect your repo and edit visually.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}