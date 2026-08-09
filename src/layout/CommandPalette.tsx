import { Link, useNavigate } from "@tanstack/react-router";
import {
  Calendar,
  BarChart3,
  Boxes,
  Sparkles,
  LayoutDashboard,
  Brain,
  CheckSquare,
  Activity,
  Bell,
  Settings,
  Search,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/common/components/command";

const commands = [
  { group: "Navigate", label: "Command Center", to: "/dashboard", icon: LayoutDashboard },
  { group: "Navigate", label: "AI Copilot", to: "/copilot", icon: Sparkles },
  { group: "Navigate", label: "Resources", to: "/resources", icon: Boxes },
  { group: "Navigate", label: "Bookings", to: "/bookings", icon: Calendar },
  { group: "Navigate", label: "Campus Intelligence", to: "/intelligence", icon: Brain },
  { group: "Navigate", label: "Analytics", to: "/analytics", icon: BarChart3 },
  { group: "Operations", label: "Approvals", to: "/approvals", icon: CheckSquare },
  { group: "Operations", label: "Activity", to: "/activity", icon: Activity },
  { group: "System", label: "Notifications", to: "/notifications", icon: Bell },
  { group: "System", label: "Settings", to: "/settings", icon: Settings },
  { group: "Ask", label: "Find an available lab this afternoon", to: "/copilot", icon: Search },
  { group: "Ask", label: "Resolve the Computer Lab 03 conflict", to: "/copilot", icon: Search },
];

const groups = ["Navigate", "Operations", "System", "Ask"];

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search campus, jump to a module, or ask CampusOS…" />
      <CommandList>
        <CommandEmpty>No matches on this campus.</CommandEmpty>
        {groups.map((g) => (
          <CommandGroup key={g} heading={g}>
            {commands
              .filter((c) => c.group === g)
              .map((c) => (
                <CommandItem
                  key={`${g}-${c.label}`}
                  value={`${g} ${c.label}`}
                  onSelect={() => {
                    onOpenChange(false);
                    navigate({ to: c.to });
                  }}
                >
                  <c.icon className="size-4" aria-hidden />
                  <span>{c.label}</span>
                </CommandItem>
              ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

export { Link };
