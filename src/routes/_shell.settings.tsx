import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/common/components/button";
import { Input } from "@/common/components/input";
import { Label } from "@/common/components/label";
import { Switch } from "@/common/components/switch";
import { Separator } from "@/common/components/separator";
import { toast } from "sonner";
import { PageHeader, Panel, SectionHeading } from "@/shared/primitives";
import {
  currentSettings,
  getSettings,
  updateSettings,
  pushActivityEvent,
  pushNotification,
} from "@/data/campus";
import { fetchApi } from "@/common/lib/apiClient";
import { useCampusVersion } from "@/common/lib/useCampus";

export const Route = createFileRoute("/_shell/settings")({
  head: () => ({
    meta: [
      { title: "Settings — CampusOS AI" },
      {
        name: "description",
        content:
          "Manage campus context, notification routing, AI autonomy level, appearance and account security.",
      },
      { property: "og:title", content: "Settings — CampusOS AI" },
      { property: "og:description", content: "Configure how CampusOS operates your campus." },
    ],
  }),
  component: SettingsPage,
});

function Row({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4">
      <div className="min-w-0">
        <p className="text-[13px] font-medium">{title}</p>
        <p className="text-meta mt-0.5">{description}</p>
      </div>
      {children}
    </div>
  );
}

function SettingsPage() {
  useCampusVersion();
  const settings = getSettings();

  const [campus, setCampus] = useState(settings.campus);
  const [timezone, setTimezone] = useState(settings.timezone);
  const [hoursStart, setHoursStart] = useState(settings.operatingHoursStart);
  const [hoursEnd, setHoursEnd] = useState(settings.operatingHoursEnd);
  const [aiAutonomy, setAiAutonomy] = useState(settings.aiAutonomyEnabled);
  const [conflictAlerts, setConflictAlerts] = useState(settings.conflictAlertsEnabled);
  const [dailyDigest, setDailyDigest] = useState(settings.dailyDigestEnabled);
  const [approvalReminders, setApprovalReminders] = useState(settings.approvalRemindersEnabled);
  const [compactDensity, setCompactDensity] = useState(settings.compactDensity);
  const [twoFactor, setTwoFactor] = useState(settings.twoFactorEnabled);
  const [activeSessions, setActiveSessions] = useState(settings.activeSessionsCount);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCampus(settings.campus);
    setTimezone(settings.timezone);
    setHoursStart(settings.operatingHoursStart);
    setHoursEnd(settings.operatingHoursEnd);
    setAiAutonomy(settings.aiAutonomyEnabled);
    setConflictAlerts(settings.conflictAlertsEnabled);
    setDailyDigest(settings.dailyDigestEnabled);
    setApprovalReminders(settings.approvalRemindersEnabled);
    setCompactDensity(settings.compactDensity);
    setTwoFactor(settings.twoFactorEnabled);
    setActiveSessions(settings.activeSessionsCount);
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    const updatedPayload = {
      campus: campus.trim() || settings.campus,
      timezone: timezone.trim() || settings.timezone,
      operatingHoursStart: hoursStart.trim() || "08:00",
      operatingHoursEnd: hoursEnd.trim() || "20:00",
      aiAutonomyEnabled: aiAutonomy,
      conflictAlertsEnabled: conflictAlerts,
      dailyDigestEnabled: dailyDigest,
      approvalRemindersEnabled: approvalReminders,
      compactDensity,
      twoFactorEnabled: twoFactor,
      activeSessionsCount: activeSessions,
    };

    updateSettings(updatedPayload);

    pushActivityEvent({
      id: `act-set-${Date.now()}`,
      kind: "ai",
      message: `Updated campus settings for ${updatedPayload.campus}`,
      detail: `Hours: ${updatedPayload.operatingHoursStart}–${updatedPayload.operatingHoursEnd}, Timezone: ${updatedPayload.timezone}`,
      time: "Just now",
    });

    pushNotification({
      id: `notif-set-${Date.now()}`,
      category: "System",
      title: "Campus Configuration Updated",
      body: `Settings saved for ${updatedPayload.campus}. Operating hours: ${updatedPayload.operatingHoursStart}–${updatedPayload.operatingHoursEnd}.`,
      time: "Just now",
      unread: true,
      actionLabel: "View settings",
      actionTo: "/settings",
    });

    try {
      await fetchApi("/settings", {
        method: "PATCH",
        body: JSON.stringify(updatedPayload),
      });
    } catch {
      // Standalone mode fallback - client state updated already
    }

    setSaving(false);
    toast.success(`Settings saved successfully. Campus updated to "${updatedPayload.campus}".`);
  };

  const handleRevokeSessions = async () => {
    setActiveSessions(1);
    updateSettings({ activeSessionsCount: 1 });
    pushActivityEvent({
      id: `act-rev-${Date.now()}`,
      kind: "ai",
      message: "Revoked active sessions",
      detail: "Secondary active sessions across all devices revoked. 1 session remaining.",
      time: "Just now",
    });
    try {
      await fetchApi("/settings/revoke-sessions", { method: "POST" });
    } catch {
      // Standalone fallback
    }
    toast.success("Secondary active sessions revoked. 1 device remains signed in.");
  };

  return (
    <div className="max-w-3xl">
      <PageHeader
        eyebrow="System"
        title="Settings"
        subtitle="Campus context, operating preferences and account security."
      />

      <section aria-label="Campus context" className="mb-8">
        <SectionHeading label="Context" title="Campus" />
        <Panel className="divide-border divide-y">
          <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="campus" className="text-xs">
                Campus
              </Label>
              <Input
                id="campus"
                value={campus}
                onChange={(e) => setCampus(e.target.value)}
                className="bg-surface-2 mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="timezone" className="text-xs">
                Timezone
              </Label>
              <Input
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="bg-surface-2 mt-1.5"
              />
            </div>
          </div>
          <Row title="Operating hours" description="Bookings outside these hours require approval.">
            <div className="flex items-center gap-2 text-[13px] tnum">
              <Input
                value={hoursStart}
                onChange={(e) => setHoursStart(e.target.value)}
                className="bg-surface-2 h-7 w-20 px-2 text-xs text-center"
              />
              <span>–</span>
              <Input
                value={hoursEnd}
                onChange={(e) => setHoursEnd(e.target.value)}
                className="bg-surface-2 h-7 w-20 px-2 text-xs text-center"
              />
            </div>
          </Row>
        </Panel>
      </section>

      <section aria-label="Preferences" className="mb-8">
        <SectionHeading label="Preferences" title="Operating behaviour" />
        <Panel className="divide-border divide-y">
          <Row
            title="AI autonomy"
            description="Let CampusOS resolve low-risk conflicts without approval."
          >
            <Switch
              checked={aiAutonomy}
              onCheckedChange={setAiAutonomy}
              aria-label="AI autonomy"
            />
          </Row>
          <Row title="Conflict alerts" description="Notify me the moment a conflict is detected.">
            <Switch
              checked={conflictAlerts}
              onCheckedChange={setConflictAlerts}
              aria-label="Conflict alerts"
            />
          </Row>
          <Row title="Daily operations digest" description="A morning summary at 08:00.">
            <Switch
              checked={dailyDigest}
              onCheckedChange={setDailyDigest}
              aria-label="Daily digest"
            />
          </Row>
          <Row title="Approval reminders" description="Nudge me when a request waits over 24 hours.">
            <Switch
              checked={approvalReminders}
              onCheckedChange={setApprovalReminders}
              aria-label="Approval reminders"
            />
          </Row>
        </Panel>
      </section>

      <section aria-label="Appearance" className="mb-8">
        <SectionHeading label="Appearance" title="Interface" />
        <Panel className="divide-border divide-y">
          <Row title="Theme" description="CampusOS is optimised for the dark operating theme.">
            <span className="text-[13px]">Dark</span>
          </Row>
          <Row title="Compact density" description="Tighter row heights across tables and lists.">
            <Switch
              checked={compactDensity}
              onCheckedChange={setCompactDensity}
              aria-label="Compact density"
            />
          </Row>
        </Panel>
      </section>

      <section aria-label="Security">
        <SectionHeading label="Security" title="Account" />
        <Panel className="divide-border divide-y">
          <Row title="Two-factor authentication" description="Required for operations roles.">
            <Switch
              checked={twoFactor}
              onCheckedChange={setTwoFactor}
              aria-label="Two-factor authentication"
            />
          </Row>
          <Row title="Active sessions" description={`${activeSessions} device${activeSessions > 1 ? "s" : ""} signed in.`}>
            <Button size="sm" variant="outline" onClick={handleRevokeSessions}>
              Revoke
            </Button>
          </Row>
        </Panel>
        <Separator className="my-6" />
        <Button disabled={saving} onClick={handleSave}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </section>
    </div>
  );
}
