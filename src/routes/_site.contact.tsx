import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/common/components/button";
import { Input } from "@/common/components/input";
import { Textarea } from "@/common/components/textarea";
import { Label } from "@/common/components/label";
import { Panel } from "@/shared/primitives";

const title = "Contact CampusOS AI — Talk to the team";
const description =
  "Get in touch about deploying CampusOS AI on your campus, integrating existing timetabling data, or seeing the Copilot on your own resources.";

export const Route = createFileRoute("/_site/contact")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <div className="mx-auto grid w-full max-w-[1000px] gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[0.9fr_1.1fr]">
      <div>
        <p className="text-label text-primary">Contact</p>
        <h1 className="text-display mt-4">Let's look at your campus.</h1>
        <p className="text-muted-foreground mt-5 text-sm leading-relaxed">
          Tell us how your rooms, labs and bookings are managed today. We'll show what CampusOS
          Copilot would surface on your own operational data.
        </p>

        <dl className="border-border mt-10 space-y-4 border-t pt-6">
          <div className="flex items-start gap-3">
            <Mail className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
            <div>
              <dt className="text-[13px] font-medium">Email</dt>
              <dd className="text-meta mt-0.5">operations@campusos.ai</dd>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
            <div>
              <dt className="text-[13px] font-medium">Reference deployment</dt>
              <dd className="text-meta mt-0.5">Northgate Campus, Science Wing</dd>
            </div>
          </div>
        </dl>
      </div>

      <Panel className="p-6">
        {sent ? (
          <div className="py-6">
            <p className="text-sm font-medium">Message received</p>
            <p className="text-muted-foreground mt-2 text-[13px] leading-relaxed">
              Thanks — we'll come back to you within two working days.
            </p>
            <Button variant="outline" size="sm" className="mt-6" onClick={() => setSent(false)}>
              Send another
            </Button>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
              toast.success("Message sent", { description: "We'll be in touch shortly." });
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" required placeholder="Jordan Reyes" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="institution">Institution</Label>
                <Input id="institution" required placeholder="Northgate University" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" required placeholder="you@university.edu" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">What are you trying to solve?</Label>
              <Textarea
                id="message"
                required
                rows={5}
                placeholder="We manage 40 teaching spaces across three buildings and lose hours a week to scheduling conflicts…"
              />
            </div>
            <Button type="submit" className="w-full">
              Send message
            </Button>
          </form>
        )}
      </Panel>
    </div>
  );
}
