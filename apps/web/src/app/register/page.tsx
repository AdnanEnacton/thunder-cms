import Link from "next/link";
import { RegisterForm } from "@/components/auth-form";
import { Logo } from "@/components/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Create your account</CardTitle>
            <CardDescription>Start managing static site content in minutes.</CardDescription>
          </CardHeader>
          <CardContent>
            <RegisterForm />
            <p className="mt-4 text-center text-sm text-muted">
              Already have an account?{" "}
              <Link href="/login" className="text-thunder-400 hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}