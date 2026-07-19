import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { RegisterForm } from "@/components/auth-form";
import { Logo } from "@/components/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const perks = [
  "Connect unlimited GitHub repositories",
  "Visual Markdown & MDX editor",
  "Media library with direct repo uploads",
  "No credit card required",
];

export default function RegisterPage() {
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
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_70%_30%,rgba(196,92,38,0.28),transparent_60%)]"
          aria-hidden
        />

        <div className="relative">
          <Logo light size="lg" />
        </div>

        <div className="relative">
          <h1 className="font-display text-4xl tracking-tight text-white">
            Start editing
            <br />
            in minutes.
          </h1>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-white/50">
            Create an account, connect a repository, and open the editor. Setup stays under five
            minutes.
          </p>

          <ul className="mt-10 space-y-3">
            {perks.map((perk) => (
              <li key={perk} className="flex items-center gap-3 text-sm text-white/70">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-thunder-400" />
                {perk}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/35">
          Free to start. Your content always stays in your repository.
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center bg-surface px-6 py-12">
        <div className="mb-8 lg:hidden">
          <Logo size="lg" />
        </div>

        <div className="w-full max-w-[400px] space-y-6">
          <Card className="shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Create your account</CardTitle>
              <CardDescription>
                Start managing static site content in minutes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RegisterForm />
              <p className="mt-6 text-center text-sm text-muted">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-medium text-thunder-600 hover:text-thunder-700 hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
