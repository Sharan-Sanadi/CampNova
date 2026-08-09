import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SignIn, useAuth } from "@clerk/react";
import { useEffect } from "react";
import { Button } from "@/common/components/button";
import { Panel } from "@/shared/primitives";

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
  const { isLoaded, isSignedIn } = useAuth();
  const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate({ to: "/dashboard" });
    }
  }, [isLoaded, isSignedIn, navigate]);

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
          <div className="mt-6">
            {clerkPublishableKey ? (
              <SignIn routing="path" path="/login" signUpUrl="/login" fallbackRedirectUrl="/dashboard" />
            ) : (
              <Button className="w-full" onClick={() => navigate({ to: "/dashboard" })}>
                Continue demo
              </Button>
            )}
          </div>
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
