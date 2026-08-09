import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SiteHeader } from "@/marketing/components/SiteHeader";
import { SiteFooter } from "@/marketing/components/SiteFooter";

export const Route = createFileRoute("/_site")({
  component: SiteLayout,
});

function SiteLayout() {
  return (
    <div className="bg-background text-foreground flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
