import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

const steps = [
  {
    n: "01",
    title: "Connect a repo",
    body: "Authorize GitHub and pick the repository that already holds your content.",
  },
  {
    n: "02",
    title: "Point at folders",
    body: "Choose content and media paths. Thunder writes a small config — nothing else changes.",
  },
  {
    n: "03",
    title: "Edit and commit",
    body: "Editors work visually. Every save is a real Git commit on the branch you choose.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-surface text-foreground">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/8 bg-[#0c0c0e]/70 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Logo light />
          <nav className="flex items-center gap-1.5">
            <Link href="/login">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/70 hover:bg-white/8 hover:text-white"
              >
                Sign in
              </Button>
            </Link>
            <Link href="/register">
              <Button
                size="sm"
                className="bg-thunder-500 text-white hover:bg-thunder-400"
              >
                Get started
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="landing-hero relative flex min-h-dvh flex-col justify-center px-6 pb-20 pt-28">
        <div className="landing-hero-grid" aria-hidden />
        <div className="landing-hero-glow" aria-hidden />

        <div className="relative z-10 mx-auto w-full max-w-4xl">
          <p className="landing-fade-up font-display text-[clamp(3.5rem,12vw,7.5rem)] leading-[0.9] tracking-tight text-white">
            THUNDER
          </p>

          <h1 className="landing-fade-up landing-fade-up-delay-1 mt-6 max-w-xl text-balance text-2xl font-medium tracking-tight text-white/90 sm:text-3xl">
            Hand your static site to the team — keep everything in Git.
          </h1>

          <p className="landing-fade-up landing-fade-up-delay-2 mt-5 max-w-lg text-base leading-relaxed text-white/50 sm:text-lg">
            Connect a GitHub repo, open Markdown in a visual editor, and ship commits.
            No CMS lock-in. No schema migrations.
          </p>

          <div className="landing-fade-up landing-fade-up-delay-3 mt-10 flex flex-wrap items-center gap-3">
            <Link href="/register">
              <Button
                size="lg"
                className="bg-thunder-500 text-white shadow-[0_0_32px_rgba(196,92,38,0.35)] hover:bg-thunder-400"
              >
                Start for free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="border-white/15 bg-transparent text-white/80 hover:border-white/30 hover:bg-white/5 hover:text-white"
              >
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-surface-raised px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-thunder-600">
            How it works
          </p>
          <h2 className="mt-3 max-w-md font-display text-3xl tracking-tight text-foreground sm:text-4xl">
            Three steps. Same repo you already own.
          </h2>

          <ol className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8">
            {steps.map((step) => (
              <li key={step.n} className="relative">
                <span className="font-display text-4xl text-thunder-500/35">{step.n}</span>
                <h3 className="mt-3 text-base font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-border px-6 py-24">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_100%,rgba(196,92,38,0.12),transparent_65%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
            Ready when your repo is.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-muted">
            Connect the first project in a few minutes. Your content never leaves GitHub.
          </p>
          <Link href="/register" className="mt-8 inline-block">
            <Button size="lg">
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border bg-surface-subtle px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <Logo />
          <p className="text-sm text-muted">
            &copy; {new Date().getFullYear()} THUNDER-CMS
          </p>
        </div>
      </footer>
    </div>
  );
}
