"use client";

import { useState } from "react";
import { Mail, MoreHorizontal, Shield, Trash2, UserPlus, Users, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface Member {
  id: string;
  role: string;
  user: { id: string; name: string | null; email: string | null; image: string | null };
}

interface Invitation {
  id: string;
  token: string;
  email: string;
  role: string;
  expiresAt: string;
  invitedBy: { name: string | null; email: string | null };
}

interface Props {
  projectId: string;
  currentUserId: string;
  isOwner: boolean;
  initialMembers: Member[];
  initialInvitations: Invitation[];
}

function Avatar({ user }: { user: { name?: string | null; email?: string | null; image?: string | null } }) {
  const initial = user.name?.charAt(0).toUpperCase() ?? user.email?.charAt(0).toUpperCase() ?? "?";
  return user.image ? (
    <img src={user.image} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-border" />
  ) : (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-thunder-100 text-sm font-semibold text-thunder-700">
      {initial}
    </div>
  );
}

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "editor", label: "Editor" },
];

export function TeamClient({
  projectId,
  currentUserId,
  isOwner,
  initialMembers,
  initialInvitations,
}: Props) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/team`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to invite");
      setInvitations((prev) => [data.invitation, ...prev]);
      setInviteSuccess(`Invitation sent to ${inviteEmail}. Share this link: ${data.inviteUrl}`);
      setInviteEmail("");
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(memberId: string, role: string) {
    const res = await fetch(`/api/projects/${projectId}/team/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      setMembers((prev) =>
        prev.map((m) => (m.user.id === memberId ? { ...m, role } : m)),
      );
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm("Remove this member from the workspace?")) return;
    const res = await fetch(`/api/projects/${projectId}/team/${memberId}`, {
      method: "DELETE",
    });
    if (res.ok) setMembers((prev) => prev.filter((m) => m.user.id !== memberId));
  }

  async function handleRevokeInvite(token: string) {
    const res = await fetch(`/api/projects/${projectId}/team/invitations/${token}`, {
      method: "DELETE",
    });
    if (res.ok) setInvitations((prev) => prev.filter((i) => i.token !== token));
  }

  return (
    <div className="space-y-6">
      {/* Members list */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted" />
            <CardTitle>Members</CardTitle>
          </div>
          <CardDescription>{members.length} member{members.length !== 1 ? "s" : ""}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {members.map((m) => {
              const isSelf = m.user.id === currentUserId;
              return (
                <div key={m.id} className="flex items-center gap-4 px-6 py-4">
                  <Avatar user={m.user} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {m.user.name ?? m.user.email}
                      {isSelf && (
                        <span className="ml-2 text-xs text-muted">(you)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted truncate">{m.user.email}</p>
                  </div>

                  {isOwner && !isSelf ? (
                    <div className="flex items-center gap-2">
                      <Select
                        value={m.role}
                        onChange={(role) => handleRoleChange(m.user.id, role)}
                        options={ROLE_OPTIONS}
                        className="w-28"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(m.user.id)}
                        className="text-destructive hover:text-destructive"
                        title="Remove member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <span className="badge badge-neutral capitalize">{m.role}</span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Invite form — owner only */}
      {isOwner && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-muted" />
              <CardTitle>Invite member</CardTitle>
            </div>
            <CardDescription>
              Invited editors don&apos;t need a GitHub account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="flex gap-2">
              <Input
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="flex-1"
              />
              <Select
                value={inviteRole}
                onChange={setInviteRole}
                options={ROLE_OPTIONS}
                className="w-32"
              />
              <Button type="submit" disabled={inviting}>
                {inviting ? "Sending…" : "Send invite"}
              </Button>
            </form>
            {inviteError && <p className="mt-2 text-sm text-destructive">{inviteError}</p>}
            {inviteSuccess && (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-sm text-emerald-800 break-all">{inviteSuccess}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted" />
              <CardTitle>Pending invitations</CardTitle>
            </div>
            <CardDescription>{invitations.length} awaiting acceptance</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {invitations.map((inv) => (
                <div key={inv.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-overlay">
                    <Mail className="h-4 w-4 text-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{inv.email}</p>
                    <p className="text-xs text-muted">
                      Invited as <span className="capitalize">{inv.role}</span> ·
                      expires {new Date(inv.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRevokeInvite(inv.token)}
                      className="text-destructive hover:text-destructive"
                      title="Revoke invitation"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!isOwner && (
        <p className="text-sm text-muted text-center">
          Only owners can invite or manage members.
        </p>
      )}
    </div>
  );
}
