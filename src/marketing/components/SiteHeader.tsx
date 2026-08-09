import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/common/components/button";
import { ThemeToggle } from "@/layout/ThemeToggle";

const sections = [
  { label: "Platform", hash: "#platform" },
  { label: "Copilot", hash: "#copilot" },
  { label: "Capabilities", hash: "#capabilities" },
  { label: "Ecosystem", hash: "#ecosystem" },
];

export function SiteBrand() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="border-border bg-surface-2 grid size-7 place-items-center rounded-md border"
      >
        <span className="bg-primary block size-2 rounded-[3px]" />
      </span>
      <span className="text-[13px] font-semibold tracking-tight">CampusOS AI</span>
    </Link>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-background/85 border-border sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center gap-4 px-5 sm:px-8">
        <SiteBrand />

        <nav aria-label="Sections" className="ml-6 hidden items-center gap-6 md:flex">
          {sections.map((s) => (
            <a
              key={s.label}
              href={`/${s.hash}`}
              className="text-muted-foreground hover:text-foreground text-[13px] transition-colors"
            >
              {s.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/dashboard">Open CampusOS</Link>
          </Button>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            className="hover:bg-accent -mr-1 rounded-md p-2 md:hidden"
          >
            {open ? <X className="size-4" aria-hidden /> : <Menu className="size-4" aria-hidden />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-border border-t md:hidden">
          <nav aria-label="Sections" className="mx-auto grid max-w-[1200px] gap-1 px-5 py-3">
            {sections.map((s) => (
              <a
                key={s.label}
                href={`/${s.hash}`}
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground py-2 text-sm"
              >
                {s.label}
              </a>
            ))}
            <Link to="/login" onClick={() => setOpen(false)} className="py-2 text-sm">
              Sign in
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
