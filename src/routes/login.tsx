import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/campusos/ui/primitives";
import { currentUser } from "@/data/campus";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — CampusOS AI" },
      {
        name: "description",
        content: "Sign in to CampusOS AI, the intelligence layer for the autonomous campus.",
      },
      { property: "og:title", content: "Sign in — CampusOS AI" },
      { property: "og:description", content: "Access your campus operating system." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="relative grid min-h-dvh lg:grid-cols-2">
      <div className="grid-fade pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative hidden flex-col justify-between p-12 lg:flex">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="border-border bg-surface-2 grid size-7 place-items-center rounded-md border"
          >
            <span className="bg-primary block size-2 rounded-[3px]" />
          </span>
          <span className="text-[13px] font-semibold tracking-tight">CampusOS AI</span>
        </div>
        <div className="max-w-md">
          <h1 className="text-display">The intelligence layer for the autonomous campus.</h1>
          <p className="text-muted-foreground mt-5 text-sm leading-relaxed">
            CampusOS connects fragmented campus workflows and turns operational data into decisions.
            Understand what is happening, predict what is coming, and act before it becomes a
            problem.
          </p>
          <div className="text-muted-foreground mt-8 flex gap-6 text-xs">
            <span>Understand</span>
            <span>·</span>
            <span>Predict</span>
            <span>·</span>
            <span>Act</span>
          </div>
        </div>
        <p className="text-muted-foreground/60 text-[11px]">
          Northgate Campus · 34 bookable resources · 148 active bookings
        </p>
      </div>

      <div className="relative flex items-center justify-center px-5 py-16">
        <Panel className="w-full max-w-sm p-7">
          <h2 className="text-lg font-medium tracking-tight">Sign in to CampusOS</h2>
          <p className="text-meta mt-1.5">Use your campus credentials to continue.</p>
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/dashboard" });
            }}
          >
            <div>
              <Label htmlFor="email" className="text-xs">
                Campus email
              </Label>
              <Input
                id="email"
                type="email"
                defaultValue={currentUser.email}
                className="bg-surface-2 mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-xs">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                defaultValue="campusos"
                className="bg-surface-2 mt-1.5"
              />
            </div>
            <Button type="submit" className="w-full">
              Continue <ArrowRight className="size-4" aria-hidden />
            </Button>
          </form>
          <p className="text-meta mt-6">
            Exploring the demo?{" "}
            <Link to="/" className="text-primary hover:underline">
              Enter the command center
            </Link>
          </p>
        </Panel>
      </div>
    </div>
  );
}
