import { Bell, Github, Languages, Sparkles, User } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AiKeySettings } from "@/components/ai-key-settings";
import { LocaleSwitcher } from "@/components/locale-switcher";

const settingsSections = [
  {
    icon: User,
    title: "Profile",
    description: "Manage your name, email, and avatar.",
    status: "Coming in Phase 3",
  },
  {
    icon: Github,
    title: "GitHub connection",
    description: "Reconnect or manage repository access permissions.",
    status: "Coming in Phase 3",
  },
  {
    icon: Bell,
    title: "Notifications",
    description: "Configure commit notifications and team alerts.",
    status: "Coming in Phase 3",
  },
];

export default async function SettingsPage() {
  const t = await getTranslations("settings");
  return (
    <div className="space-y-8">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-description">Organization and account preferences.</p>
      </div>

      <div className="grid gap-4">
        {settingsSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title} className="surface-card-hover">
              <CardHeader className="flex-row items-center gap-4 space-y-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-overlay">
                  <Icon className="h-5 w-5 text-muted" />
                </div>
                <div className="flex-1">
                  <CardTitle>{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </div>
                <span className="badge badge-neutral shrink-0">{section.status}</span>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-4 w-4 text-thunder-600" />
            {t("language")}
          </CardTitle>
          <CardDescription>{t("languageHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <LocaleSwitcher />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-thunder-600" />
            AI assistant
          </CardTitle>
          <CardDescription>
            Bring your own OpenAI key to power AI writing actions in the editor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AiKeySettings />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team & organization</CardTitle>
          <CardDescription>
            Team invites, roles, and custom commit messages.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted">
          Organization management features are on the roadmap. You&apos;ll be able to invite
          teammates, assign roles, and customize how commits appear in your repository.
        </CardContent>
      </Card>
    </div>
  );
}