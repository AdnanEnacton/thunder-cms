import Link from "next/link";
import { ArrowRight, GitBranch, Sparkles, Zap } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button>Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-thunder-600/30 bg-thunder-600/10 px-4 py-1.5 text-sm text-thunder-300">
            <Zap className="h-4 w-4" fill="currentColor" />
            Git-based CMS for static sites
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            The easiest way to hand off static sites to your team
          </h1>
          <p className="mt-6 text-lg text-muted">
            THUNDER-CMS connects to your GitHub repo, reads your existing Markdown and
            config files, and gives editors a visual interface — no code changes required.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg">
                Start for free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg">
                Sign in
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-20 grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: GitBranch,
              title: "Git-native workflow",
              description: "Every edit becomes a versioned commit in your repository.",
            },
            {
              icon: Sparkles,
              title: "Zero configuration",
              description: "Connect your repo, pick folders, and start editing in minutes.",
            },
            {
              icon: Zap,
              title: "Works with your stack",
              description: "Astro, Next.js, Hugo, Eleventy, and more — content stays in your files.",
            },
          ].map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-xl border border-border bg-surface-raised p-6"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-thunder-600/15">
                  <Icon className="h-5 w-5 text-thunder-400" />
                </div>
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}