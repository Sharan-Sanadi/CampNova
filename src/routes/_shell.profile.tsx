import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/common/components/button";
import { Input } from "@/common/components/input";
import { Label } from "@/common/components/label";
import { toast } from "sonner";
import { PageHeader, Panel, SectionHeading, Tag } from "@/shared/primitives";
import {
  currentUser,
  getBookings,
  updateUser,
  pushActivityEvent,
  pushNotification,
} from "@/data/campus";
import { fetchApi } from "@/common/lib/apiClient";
import { useCampusVersion } from "@/common/lib/useCampus";

export const Route = createFileRoute("/_shell/profile")({
  head: () => ({
    meta: [
      { title: "Profile — CampusOS AI" },
      {
        name: "description",
        content: "Your CampusOS profile, campus role, permissions and recent operational activity.",
      },
      { property: "og:title", content: "Profile — CampusOS AI" },
      { property: "og:description", content: "Your role and activity across the campus." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  useCampusVersion();

  const [name, setName] = useState(currentUser.name);
  const [role, setRole] = useState(currentUser.role);
  const [email, setEmail] = useState(currentUser.email);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(currentUser.name);
    setRole(currentUser.role);
    setEmail(currentUser.email);
  }, [currentUser.name, currentUser.role, currentUser.email]);

  const handleSaveProfile = async () => {
    setSaving(true);
    const updated = updateUser({ name, role, email });

    pushActivityEvent({
      id: `act-prof-${Date.now()}`,
      kind: "ai",
      message: `Updated profile details for ${updated.name}`,
      detail: `Role: ${updated.role}, Email: ${updated.email}`,
      time: "Just now",
    });

    pushNotification({
      id: `notif-prof-${Date.now()}`,
      category: "System",
      title: "Profile Updated",
      body: `Your profile details were updated successfully: ${updated.name} (${updated.role}).`,
      time: "Just now",
      unread: true,
      actionLabel: "View profile",
      actionTo: "/profile",
    });

    try {
      await fetchApi("/profile", {
        method: "PATCH",
        body: JSON.stringify({ name: updated.name, role: updated.role, email: updated.email }),
      });
    } catch {
      // Standalone mode fallback
    }

    setSaving(false);
    toast.success(`Profile saved. Updated user: ${updated.name}`);
  };

  const recent = getBookings().slice(0, 4);

  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Account" title="Profile" subtitle="How CampusOS identifies you across campus." />

      <Panel className="mb-8 p-5">
        <div className="flex items-center gap-4">
          <span className="bg-primary-soft text-primary grid size-14 shrink-0 place-items-center rounded-xl text-lg font-semibold">
            {currentUser.initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-medium tracking-tight">{currentUser.name}</p>
            <p className="text-meta truncate">
              {currentUser.role} · {currentUser.campus}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Tag>Approvals</Tag>
              <Tag>Resource admin</Tag>
              <Tag>Analytics</Tag>
            </div>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="name" className="text-xs">
              Full name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-surface-2 mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="role" className="text-xs">
              Role
            </Label>
            <Input
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="bg-surface-2 mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="email" className="text-xs">
              Email
            </Label>
            <Input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-surface-2 mt-1.5"
            />
          </div>
        </div>
        <Button className="mt-5" size="sm" disabled={saving} onClick={handleSaveProfile}>
          {saving ? "Saving..." : "Save profile"}
        </Button>
      </Panel>

      <section aria-label="Recent activity">
        <SectionHeading label="History" title="Your recent bookings" />
        <Panel className="divide-border divide-y">
          {recent.map((b) => (
            <Link
              key={b.id}
              to="/bookings/$id"
              params={{ id: b.id }}
              className="hover:bg-surface-2 flex items-center justify-between gap-4 px-5 py-3.5 transition-colors"
            >
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium">{b.title}</span>
                <span className="text-meta block truncate">
                  {b.resourceName} · {b.date}
                </span>
              </span>
              <span className="text-muted-foreground shrink-0 text-xs capitalize">{b.status}</span>
            </Link>
          ))}
        </Panel>
      </section>
    </div>
  );
}
