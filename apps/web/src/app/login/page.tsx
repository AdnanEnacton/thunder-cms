import Link from "next/link";
import { GitBranch, Shield, Zap } from "lucide-react";
import { LoginForm } from "@/components/auth-form";
import { Logo } from "@/components/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const highlights = [
  { icon: GitBranch, text: "Edit content directly in your repo" },
  { icon: Shield, text: "Secure GitHub OAuth integration" },
  { icon: Zap, text: "Visual editor for Markdown & MDX" },
];

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh">
      <div className="relative hidden w-[44%] flex-col justify-between overflow-hidden bg-[#0c0c0e] p-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(rgba(242,241,239,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(242,241,239,0.04) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_30%_40%,rgba(196,92,38,0.28),transparent_60%)]"
          aria-hidden
        />

        <div className="relative">
          <Logo light size="lg" />
        </div>

        <div className="relative">
          <h1 className="font-display text-4xl tracking-tight text-white">
            Content in Git.
            <br />
            Editing for everyone.
          </h1>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-white/50">
            Give your team a calm editing surface without leaving the repository.
          </p>

          <ul className="mt-10 space-y-3">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-white/70">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/8">
                  <Icon className="h-4 w-4 text-thunder-400" />
                </div>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/35">
          Works with Astro, Next.js, Hugo, Eleventy, and more.
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center bg-surface px-6 py-12">
        <div className="mb-8 lg:hidden">
          <Logo size="lg" />
        </div>

        <div className="w-full max-w-[400px] space-y-6">
          <Card className="shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Welcome back</CardTitle>
              <CardDescription>
                Sign in to manage your content with THUNDER-CMS.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LoginForm />
              <p className="mt-6 text-center text-sm text-muted">
                No account?{" "}
                <Link
                  href="/register"
                  className="font-medium text-thunder-600 hover:text-thunder-700 hover:underline"
                >
                  Create one
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
