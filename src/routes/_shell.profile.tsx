import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PageHeader, Panel, SectionHeading, Tag } from "@/components/campusos/ui/primitives";
import { currentUser, getBookings } from "@/data/campus";

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
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="name" className="text-xs">
              Full name
            </Label>
            <Input id="name" defaultValue={currentUser.name} className="bg-surface-2 mt-1.5" />
          </div>
          <div>
            <Label htmlFor="email" className="text-xs">
              Email
            </Label>
            <Input id="email" defaultValue={currentUser.email} className="bg-surface-2 mt-1.5" />
          </div>
        </div>
        <Button className="mt-5" size="sm" onClick={() => toast.success("Profile updated")}>
          Save profile
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
