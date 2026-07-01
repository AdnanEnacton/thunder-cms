import Link from "next/link";
import {
  ArrowRight,
  GitBranch,
  Layers,
  Lock,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: GitBranch,
    title: "Git-native workflow",
    description:
      "Every edit becomes a versioned commit. Your content stays in your repo — always yours.",
    accent: "from-blue-500/10 to-blue-600/5",
  },
  {
    icon: Sparkles,
    title: "Zero configuration",
    description:
      "Connect your repo, pick folders, and start editing in minutes. No migrations, no lock-in.",
    accent: "from-violet-500/10 to-violet-600/5",
  },
  {
    icon: Layers,
    title: "Works with your stack",
    description:
      "Astro, Next.js, Hugo, Eleventy, and more. We read your existing files — no code changes.",
    accent: "from-emerald-500/10 to-emerald-600/5",
  },
];

const pillars = [
  { icon: Lock, label: "Your repo, your data" },
  { icon: Users, label: "Built for teams" },
  { icon: Zap, label: "Ship faster" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen gradient-mesh">
      <header className="sticky top-0 z-50 border-b border-border/60 glass">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Logo />
          <nav className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">
                Get started
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 pb-24 pt-20 sm:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-thunder-500/20 bg-thunder-500/8 px-4 py-1.5 text-sm font-medium text-thunder-700">
              <Zap className="h-3.5 w-3.5" fill="currentColor" />
              Git-based CMS for static sites
            </div>

            <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
              The easiest way to hand off static sites to your team
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-muted">
              THUNDER-CMS connects to your GitHub repo, reads your existing Markdown and
              config files, and gives editors a visual interface — no code changes required.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link href="/register">
                <Button size="lg" className="min-w-[180px]">
                  Start for free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary" size="lg" className="min-w-[180px]">
                  Sign in
                </Button>
              </Link>
            </div>

            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted">
              {pillars.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-thunder-500" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Everything your team needs
            </h2>
            <p className="mt-3 text-muted">
              A polished editing experience on top of the workflow you already trust.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="surface-card surface-card-hover group p-7"
                >
                  <div
                    className={`mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${feature.accent} ring-1 ring-border transition-transform duration-200 group-hover:scale-105`}
                  >
                    <Icon className="h-5 w-5 text-thunder-600" />
                  </div>
                  <h3 className="text-base font-semibold tracking-tight">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="relative overflow-hidden rounded-2xl border border-thunder-500/15 bg-gradient-to-br from-thunder-600 to-thunder-800 px-8 py-14 text-center shadow-lg sm:px-16">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12),transparent_60%)]" />
            <div className="relative">
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Ready to empower your content team?
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-base text-thunder-100">
                Connect your first repository in under five minutes. No credit card required.
              </p>
              <Link href="/register" className="mt-8 inline-block">
                <Button
                  size="lg"
                  className="bg-white text-thunder-700 hover:bg-thunder-50 hover:text-thunder-800"
                >
                  Get started free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface-raised">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8">
          <Logo />
          <p className="text-sm text-muted">
            &copy; {new Date().getFullYear()} THUNDER-CMS. Git-native content management.
          </p>
        </div>
      </footer>
    </div>
  );
}