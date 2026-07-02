import { redirect } from "next/navigation";
import { prisma } from "@thunder/database";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AcceptInviteButton } from "./accept-invite-button";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { organization: true, invitedBy: { select: { name: true, email: true } } },
  });

  if (!invitation || invitation.accepted || invitation.expiresAt < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invitation invalid</CardTitle>
            <CardDescription>
              This invitation link has expired or has already been used.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const session = await auth();
  const isLoggedIn = !!session?.user?.id;
  const emailMatches = session?.user?.email === invitation.email;

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>You&apos;ve been invited</CardTitle>
          <CardDescription>
            <strong>{invitation.invitedBy.name ?? invitation.invitedBy.email}</strong> invited you
            to join <strong>{invitation.organization.name}</strong> as{" "}
            <strong>{invitation.role}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isLoggedIn ? (
            <p className="text-sm text-muted">
              Please{" "}
              <a href={`/login?callbackUrl=/invite/${token}`} className="text-thunder-600 underline">
                sign in
              </a>{" "}
              or{" "}
              <a href={`/register?callbackUrl=/invite/${token}`} className="text-thunder-600 underline">
                create an account
              </a>{" "}
              with <strong>{invitation.email}</strong> to accept this invitation.
            </p>
          ) : !emailMatches ? (
            <p className="text-sm text-muted">
              This invitation was sent to <strong>{invitation.email}</strong> but you are signed in
              as <strong>{session.user.email}</strong>. Please sign out and sign in with the correct
              account.
            </p>
          ) : (
            <AcceptInviteButton token={token} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
