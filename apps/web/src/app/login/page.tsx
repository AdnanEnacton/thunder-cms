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
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="hidden w-[45%] flex-col justify-between bg-gradient-to-br from-thunder-700 via-thunder-800 to-[#001a4d] p-12 lg:flex">
        <Logo size="lg" className="[&_span]:text-white [&_span:last-child]:text-thunder-200" />

        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Content management,
            <br />
            reimagined.
          </h1>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-thunder-200">
            Give your team a beautiful editing experience without leaving Git.
          </p>

          <ul className="mt-10 space-y-4">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-thunder-100">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-4 w-4 text-white" />
                </div>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-thunder-300">
          Trusted by teams building with Astro, Next.js, Hugo, and more.
        </p>
      </div>

      {/* Form panel */}
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