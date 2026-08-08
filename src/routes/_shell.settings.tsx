import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { PageHeader, Panel, SectionHeading } from "@/components/campusos/ui/primitives";
import { currentUser } from "@/data/campus";

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
              <Input id="campus" defaultValue={currentUser.campus} className="bg-surface-2 mt-1.5" />
            </div>
            <div>
              <Label htmlFor="timezone" className="text-xs">
                Timezone
              </Label>
              <Input id="timezone" defaultValue="Asia/Kolkata (GMT+5:30)" className="bg-surface-2 mt-1.5" />
            </div>
          </div>
          <Row title="Operating hours" description="Bookings outside these hours require approval.">
            <span className="text-[13px] tnum">08:00 – 20:00</span>
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
            <Switch aria-label="AI autonomy" />
          </Row>
          <Row title="Conflict alerts" description="Notify me the moment a conflict is detected.">
            <Switch defaultChecked aria-label="Conflict alerts" />
          </Row>
          <Row title="Daily operations digest" description="A morning summary at 08:00.">
            <Switch defaultChecked aria-label="Daily digest" />
          </Row>
          <Row title="Approval reminders" description="Nudge me when a request waits over 24 hours.">
            <Switch defaultChecked aria-label="Approval reminders" />
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
            <Switch aria-label="Compact density" />
          </Row>
        </Panel>
      </section>

      <section aria-label="Security">
        <SectionHeading label="Security" title="Account" />
        <Panel className="divide-border divide-y">
          <Row title="Two-factor authentication" description="Required for operations roles.">
            <Switch defaultChecked aria-label="Two-factor authentication" />
          </Row>
          <Row title="Active sessions" description="2 devices signed in.">
            <Button size="sm" variant="outline" onClick={() => toast("Sessions revoked")}>
              Revoke
            </Button>
          </Row>
        </Panel>
        <Separator className="my-6" />
        <Button onClick={() => toast.success("Settings saved")}>Save changes</Button>
      </section>
    </div>
  );
}
