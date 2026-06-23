import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted">Organization and account settings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Profile and GitHub connection settings coming in Phase 3.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted">
          Team invites, roles, and custom commit messages will be added here.
        </CardContent>
      </Card>
    </div>
  );
}