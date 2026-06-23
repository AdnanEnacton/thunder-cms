import Link from "next/link";
import { LoginForm } from "@/components/auth-form";
import { Logo } from "@/components/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Sign in to manage your content with THUNDER-CMS.</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
            <p className="mt-4 text-center text-sm text-muted">
              No account?{" "}
              <Link href="/register" className="text-thunder-400 hover:underline">
                Create one
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}