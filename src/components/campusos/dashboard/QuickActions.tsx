import { Link } from "@tanstack/react-router";
import { AlertTriangle, CalendarPlus, Search, Sparkles } from "lucide-react";

const actions = [
  { label: "Find a resource", to: "/resources", icon: Search },
  { label: "Book a resource", to: "/bookings", icon: CalendarPlus },
  { label: "Resolve a conflict", to: "/bookings/BK-2475", icon: AlertTriangle },
  { label: "Ask CampusOS", to: "/copilot", icon: Sparkles },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {actions.map((a) => (
        <Link
          key={a.label}
          to={a.to}
          className="panel panel-hover flex flex-col gap-3 p-3.5"
        >
          <a.icon className="text-muted-foreground size-4" aria-hidden />
          <span className="text-[13px] font-medium">{a.label}</span>
        </Link>
      ))}
    </div>
  );
}
