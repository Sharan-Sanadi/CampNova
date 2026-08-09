import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/common/lib/utils";

/* CampusOS shared primitives — all modules must consume these. */

export function Panel({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("panel", className)} {...props}>
      {children}
    </div>
  );
}

export function SectionHeading({
  label,
  title,
  action,
}: {
  label?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div className="min-w-0">
        {label ? <p className="text-label text-muted-foreground mb-1.5">{label}</p> : null}
        <h2 className="truncate text-base font-medium tracking-tight">{title}</h2>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export type Tone = "success" | "warning" | "critical" | "info" | "neutral";

const toneText: Record<Tone, string> = {
  success: "text-success",
  warning: "text-warning",
  critical: "text-destructive",
  info: "text-primary",
  neutral: "text-muted-foreground",
};

const toneBg: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  critical: "bg-destructive",
  info: "bg-primary",
  neutral: "bg-muted-foreground",
};

export function StatusDot({ tone = "neutral", pulse }: { tone?: Tone; pulse?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-1.5 rounded-full", toneBg[tone], pulse && "pulse-dot")}
    />
  );
}

export function StatusPill({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "border-border bg-surface-2 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        toneText[tone],
        className,
      )}
    >
      <StatusDot tone={tone} />
      {children}
    </span>
  );
}

export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "border-border text-muted-foreground rounded-md border px-1.5 py-0.5 text-[11px] font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  trend,
  direction,
  meaning,
  index = 0,
}: {
  label: string;
  value: string;
  trend?: string;
  direction?: "up" | "down";
  meaning?: string;
  index?: number;
}) {
  const Icon = direction === "down" ? ArrowDownRight : ArrowUpRight;
  return (
    <div
      className="panel panel-hover enter-up p-4 sm:p-5"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <p className="text-label text-muted-foreground">{label}</p>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-metric">{value}</span>
        {trend ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium tnum",
              direction === "down" ? "text-success" : "text-primary",
            )}
          >
            <Icon className="size-3" aria-hidden />
            {trend}
          </span>
        ) : null}
      </div>
      {meaning ? <p className="text-meta mt-2">{meaning}</p> : null}
    </div>
  );
}

export function Sparkline({
  values,
  className,
  tone = "primary",
}: {
  values: number[];
  className?: string;
  tone?: "primary" | "muted";
}) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = 28 - ((v - min) / span) * 24 - 2;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  return (
    <svg
      viewBox="0 0 100 28"
      preserveAspectRatio="none"
      className={cn("h-7 w-full", className)}
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        className={tone === "primary" ? "stroke-primary" : "stroke-muted-foreground"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function UtilizationBar({ value }: { value: number }) {
  const tone: Tone = value >= 80 ? "critical" : value >= 60 ? "warning" : "success";
  return (
    <div className="bg-surface-2 h-1 w-full overflow-hidden rounded-full">
      <div
        className={cn("h-full rounded-full transition-all duration-500", toneBg[tone])}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:flex-wrap sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="text-label text-primary mb-2">{eyebrow}</p> : null}
        <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{title}</h1>
        {subtitle ? (
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel flex flex-col items-center px-6 py-12 text-center">
      {icon ? <div className="text-muted-foreground mb-3">{icon}</div> : null}
      <p className="text-sm font-medium">{title}</p>
      <p className="text-meta mt-1.5 max-w-sm">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

const statusToneMap: Record<string, Tone> = {
  approved: "success",
  confirmed: "success",
  completed: "info",
  draft: "neutral",
  available: "success",
  pending: "warning",
  "in-use": "info",
  conflict: "critical",
  rejected: "critical",
  maintenance: "warning",
  cancelled: "neutral",
};

export const statusTone = (status: string): Tone => statusToneMap[status] ?? "neutral";
