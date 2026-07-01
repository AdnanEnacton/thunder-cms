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
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="hidden w-[45%] flex-col justify-between bg-gradient-to-br from-thunder-700 via-thunder-800 to-[#001a4d] p-12 lg:flex">
        <Logo size="lg" className="[&_span]:text-white [&_span:last-child]:text-thunder-200" />

        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Start editing
            <br />
            in minutes.
          </h1>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-thunder-200">
            Create your account and connect your first repository. Setup takes less than five
            minutes.
          </p>

          <ul className="mt-10 space-y-3">
            {perks.map((perk) => (
              <li key={perk} className="flex items-center gap-3 text-sm text-thunder-100">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-thunder-300" />
                {perk}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-thunder-300">
          Free to get started. Your content always stays in your repository.
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