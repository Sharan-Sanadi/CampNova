import { createFileRoute, useNavigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@clerk/react";
import { useEffect } from "react";
import { AppShell } from "@/layout/AppShell";

function ProtectedShell() {
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate({
        to: "/login",
        search: { redirect: location.href },
        replace: true,
      });
    }
  }, [isLoaded, isSignedIn, navigate, location.href]);

  if (!isLoaded) {
    return (
      <div className="bg-background flex min-h-dvh flex-col items-center justify-center gap-3">
        <div className="border-primary/20 border-t-primary size-8 animate-spin rounded-full border-2" />
        <p className="text-muted-foreground text-xs font-medium tracking-wide">
          Verifying CampusOS Session…
        </p>
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  return <AppShell />;
}

export const Route = createFileRoute("/_shell")({
  component: ProtectedShell,
});

