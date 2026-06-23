import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/sign-out-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <DashboardSidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-6">
          <Logo />
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted">{session.user.email}</span>
            <SignOutButton />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}