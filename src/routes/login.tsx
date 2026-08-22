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
  const clerkPublishableKey = import.meta.env["VITE_CLERK_PUBLISHABLE_KEY"] as string | undefined;

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded) {
    return (
      <div className="bg-background flex min-h-dvh flex-col items-center justify-center gap-3">
        <div className="border-primary/20 border-t-primary size-8 animate-spin rounded-full border-2" />
        <p className="text-muted-foreground text-xs font-medium tracking-wide">
          Loading authentication portal…
        </p>
      </div>
    );
  }

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
          Secure Campus Operations Workspace · Production Auth Enabled
        </p>
      </div>

      <div className="relative flex items-center justify-center px-5 py-16">
        <Panel className="w-full max-w-md p-7 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <span
              aria-hidden
              className="border-border bg-surface-2 grid size-9 shrink-0 place-items-center rounded-lg border"
            >
              <span className="bg-primary size-2.5 rounded-[3px]" />
            </span>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">Sign in to CampusOS</h2>
              <p className="text-muted-foreground mt-0.5 text-xs">Use Google or your campus credentials.</p>
            </div>
          </div>
          <div>
            {clerkPublishableKey ? (
              <SignIn
                routing="path"
                path="/login"
                signUpUrl="/login"
                fallbackRedirectUrl="/dashboard"
                forceRedirectUrl="/dashboard"
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    cardBox: "!bg-transparent !shadow-none !border-0 !p-0 !m-0 w-full max-w-none",
                    card: "!bg-transparent !shadow-none !border-0 !p-0 !m-0 w-full max-w-none",
                    header: "hidden",
                    headerTitle: "hidden",
                    headerSubtitle: "hidden",
                    socialButtonsBlockButton:
                      "!border !border-border !bg-surface-2 hover:!bg-accent !text-foreground !text-xs !font-medium !h-10 !rounded-md w-full !transition-colors !shadow-none",
                    socialButtonsBlockButtonText: "!text-foreground !font-medium !text-xs",
                    dividerLine: "!bg-border !h-px",
                    dividerText: "!text-muted-foreground !text-[11px] !font-medium",
                    formFieldLabel: "!text-foreground !text-xs !font-medium !mb-1",
                    formFieldInput:
                      "!bg-background !border !border-border !text-foreground !text-xs !rounded-md !h-10 !px-3 w-full focus:!border-primary",
                    formButtonPrimary:
                      "!bg-primary hover:!bg-primary/90 !text-primary-foreground !text-xs !font-medium !h-10 !rounded-md w-full !shadow-none !transition-colors",
                    footerActionText: "!text-muted-foreground !text-xs",
                    footerActionLink: "!text-primary hover:!underline !text-xs !font-medium",
                    footer: "!bg-transparent !border-t !border-border !pt-4 !mt-5",
                  },
                }}
              />
            ) : (
              <div className="space-y-3 text-center">
                <p className="text-destructive text-xs">
                  VITE_CLERK_PUBLISHABLE_KEY is not configured in environment.
                </p>
                <Button className="w-full" onClick={() => navigate({ to: "/dashboard" })}>
                  Continue to Command Center
                </Button>
              </div>
            )}
          </div>
          <div className="border-border mt-6 border-t pt-4 text-center">
            <Link to="/" className="text-muted-foreground text-xs hover:text-foreground hover:underline">
              ← Return to landing page
            </Link>
          </div>
        </Panel>
      </div>
    </div>
  );
}
