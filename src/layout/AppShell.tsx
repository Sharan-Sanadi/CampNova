import { useEffect, useState } from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Bell,
  Boxes,
  Brain,
  Calendar,
  CheckSquare,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/common/components/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/common/components/dropdown-menu";
import { cn } from "@/common/lib/utils";
import { campusHealth, currentUser, getBookings, getNotifications } from "@/data/campus";
import { CommandPalette } from "./CommandPalette";
import { StatusDot } from "@/shared/primitives";
import { ThemeToggle } from "./ThemeToggle";
import { CampusClock } from "./CampusClock";
import { SpatialLayer } from "@/experience/spatial/SpatialLayer";
import { useCampusVersion } from "@/common/lib/useCampus";


type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const nav: { section: string; items: NavItem[] }[] = [
  {
    section: "Primary",
    items: [
      { to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
      { to: "/copilot", label: "Copilot", icon: Sparkles },
    ],
  },
  {
    section: "Operations",
    items: [
      { to: "/resources", label: "Resources", icon: Boxes },
      { to: "/bookings", label: "Bookings", icon: Calendar },
      { to: "/approvals", label: "Approvals", icon: CheckSquare },
      { to: "/activity", label: "Activity", icon: Activity },
    ],
  },
  {
    section: "Intelligence",
    items: [
      { to: "/intelligence", label: "Campus Intelligence", icon: Brain },
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    section: "System",
    items: [
      { to: "/notifications", label: "Notifications", icon: Bell },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];


const pageTitles: Record<string, string> = {
  "/dashboard": "Command Center",

  "/copilot": "AI Campus Copilot",
  "/resources": "Resources",
  "/bookings": "Bookings",
  "/intelligence": "Campus Intelligence",
  "/analytics": "Analytics",
  "/approvals": "Approvals",
  "/activity": "Activity",
  "/notifications": "Notifications",
  "/settings": "Settings",
  "/profile": "Profile",
};

function Brand() {
  return (
    <Link to="/dashboard" className="flex items-center gap-2.5 px-2 py-0.5">
      <span
        aria-hidden
        className="border-border bg-surface-2 grid size-7 place-items-center rounded-md border"
      >
        <span className="bg-primary block size-2 rounded-[3px]" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-semibold tracking-tight">CampusOS AI</span>
        <span className="text-muted-foreground block truncate text-[10px] tracking-wide">
          Intelligence Layer
        </span>
      </span>
    </Link>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const unread = getNotifications().filter((n) => n.unread).length;
  return (
    <nav className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto" aria-label="Primary">
      {nav.map((group) => (
        <div key={group.section} className="shrink-0">
          <p className="text-label text-muted-foreground/60 mb-1.5 px-2.5">{group.section}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={onNavigate}
                  activeOptions={{ exact: item.exact ?? false }}
                  className="text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:text-foreground group relative flex h-9 w-full shrink-0 items-center gap-2.5 rounded-md px-2.5 text-[13px] leading-5 font-medium transition-colors duration-150"
                >
                  <item.icon className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">{item.label}</span>
                  {item.label === "Notifications" && unread > 0 ? (
                    <span className="text-primary bg-primary-soft tnum ml-auto rounded px-1.5 py-0.5 text-[10px] font-semibold">
                      {unread}
                    </span>
                  ) : null}
                  <span className="bg-primary absolute top-1/2 left-0 h-4 w-[3px] -translate-y-1/2 rounded-full opacity-0 transition-opacity group-data-[status=active]:opacity-100" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}


function CampusPulse() {
  const active = getBookings().filter((b) => b.status === "approved").length;
  return (
    <section
      aria-label="Campus pulse"
      className="border-border bg-sidebar-accent/30 rounded-md border px-2.5 py-2"
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-label text-muted-foreground/70">Campus Pulse</p>
        <span className="text-success inline-flex items-center gap-1 text-[10px] font-medium">
          <StatusDot tone="success" pulse />
          Healthy
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="tnum text-base font-medium tracking-tight">{campusHealth.utilization}%</span>
        <span className="text-muted-foreground text-[11px]">utilization</span>
      </div>
      <div className="bg-surface-2 mt-1 h-[3px] w-full overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full transition-all duration-500"
          style={{ width: `${campusHealth.utilization}%` }}
        />
      </div>
      <dl className="text-muted-foreground mt-1.5 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5">
          <dt>Active bookings</dt>
          <dd className="text-foreground tnum font-medium">{active}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <dt>Pending</dt>
          <dd className="text-foreground tnum font-medium">{campusHealth.pendingActions}</dd>
        </div>
      </dl>
    </section>
  );
}

function UserCard() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="border-border hover:bg-sidebar-accent flex w-full items-center gap-2.5 rounded-md border px-2 py-1.5 text-left transition-colors">
        <span className="bg-primary-soft text-primary grid size-7 shrink-0 place-items-center rounded-md text-[11px] font-semibold">
          {currentUser.initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium">{currentUser.name}</span>
          <span className="text-muted-foreground block truncate text-[11px]">
            {currentUser.role} · {currentUser.campus}
          </span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
          {currentUser.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile">Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings">Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/login">Sign out</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell() {
  useCampusVersion(); // keep sidebar counters in sync with booking/notification mutations
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const title =
    pageTitles[pathname] ??
    (pathname.startsWith("/resources/")
      ? "Resource detail"
      : pathname.startsWith("/bookings/")
        ? "Booking detail"
        : "CampusOS");

  return (
    <div className="bg-background relative flex min-h-dvh">
      {/* Shared CampusOS spatial world — visual layer only */}
      <SpatialLayer />

      {/* Desktop sidebar */}
      <aside className="bg-sidebar/85 border-sidebar-border sticky top-0 z-10 hidden h-dvh w-60 backdrop-blur-xl shrink-0 flex-col gap-2.5 border-r px-2.5 py-3 lg:flex">
        <Brand />
        <NavList />
        <div className="border-border space-y-2 border-t pt-2.5">
          <CampusPulse />
          <UserCard />
        </div>
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="bg-background/85 border-border sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 backdrop-blur-md sm:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              aria-label="Open navigation"
              className="hover:bg-accent -ml-1 rounded-md p-2 lg:hidden"
            >
              <Menu className="size-4" aria-hidden />
            </SheetTrigger>
            <SheetContent side="left" className="bg-sidebar w-64 px-2.5 py-3">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex h-full min-h-0 flex-col gap-3">
                <Brand />
                <NavList onNavigate={() => setMobileOpen(false)} />
                <div className="border-border space-y-2 border-t pt-2.5">
                  <CampusPulse />
                  <UserCard />
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex min-w-0 items-center gap-2">
            <span className="text-muted-foreground hidden text-[13px] sm:inline">CampusOS</span>
            <span className="text-muted-foreground/50 hidden sm:inline">/</span>
            <span className="truncate text-[13px] font-medium">{title}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setPaletteOpen(true)}
              aria-label="Search campus or ask CampusOS"
              className="border-border text-muted-foreground hover:border-border-strong hover:text-foreground active:bg-surface-2 flex min-h-9 items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors"
            >
              <Search className="size-3.5" aria-hidden />
              <span className="hidden sm:inline">Search or ask…</span>
              <kbd className="border-border bg-surface-2 hidden rounded border px-1 py-0.5 text-[10px] sm:inline">
                ⌘K
              </kbd>
            </button>
            <ThemeToggle />
            <Link
              to="/notifications"
              aria-label="Notifications"
              className="hover:bg-accent text-muted-foreground hover:text-foreground relative rounded-md p-2 transition-colors duration-150"
            >
              <Bell className="size-4" aria-hidden />
              <span className="bg-primary absolute top-1.5 right-1.5 size-1.5 rounded-full" />
            </Link>
            <span className="border-border text-muted-foreground hidden items-center gap-1.5 rounded-md border px-2 py-1.5 text-[11px] tracking-wide lg:inline-flex">
              <StatusDot tone="success" pulse />
              <span className="sr-only">Campus status: </span>
              {currentUser.campus}
            </span>
            <CampusClock className="hidden md:block" label={currentUser.campus.split(" ")[0]} />


          </div>
        </header>

        <main className={cn("mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 sm:py-7")}>
          <div key={pathname} className="enter-up">
            <Outlet />
          </div>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
