import { Link } from "@tanstack/react-router";
import { SiteBrand } from "./SiteHeader";

const columns: {
  title: string;
  links: { label: string; to?: string; href?: string }[];
}[] = [
  {
    title: "Product",
    links: [
      { label: "AI Copilot", to: "/copilot" },
      { label: "Resources", to: "/resources" },
      { label: "Bookings", to: "/bookings" },
      { label: "Intelligence", to: "/intelligence" },
      { label: "Analytics", to: "/analytics" },
    ],
  },
  {
    title: "Platform",
    links: [
      { label: "Command center", to: "/dashboard" },
      { label: "How it works", href: "/#platform" },
      { label: "Capabilities", href: "/#capabilities" },
      { label: "Ecosystem", href: "/#ecosystem" },
      { label: "Roadmap", href: "/#roadmap" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "Contact", to: "/contact" },
      { label: "Sign in", to: "/login" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", to: "/privacy" },
      { label: "Terms", to: "/terms" },
      { label: "Cookies", to: "/cookies" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-border bg-surface/60 border-t">

      <div className="mx-auto w-full max-w-[1200px] px-5 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
          <div className="max-w-xs">
            <SiteBrand />
            <p className="text-muted-foreground mt-4 text-[13px] leading-relaxed">
              The intelligence layer for the autonomous campus. Understand, predict and act — across
              every room, resource and request.
            </p>
          </div>

          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="text-label text-muted-foreground/80">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.to ? (
                      <Link
                        to={link.to}
                        className="text-muted-foreground hover:text-foreground text-[13px] transition-colors"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        className="text-muted-foreground hover:text-foreground text-[13px] transition-colors"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="border-border mt-12 flex flex-wrap items-center justify-between gap-3 border-t pt-6">
          <p className="text-meta">
            © {new Date().getFullYear()} CampusOS AI · Northgate Campus deployment
          </p>
          <p className="text-meta">Understand → Predict → Act</p>
        </div>
      </div>
    </footer>
  );
}
