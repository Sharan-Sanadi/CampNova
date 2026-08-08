import { Link } from "@tanstack/react-router";
import { ArrowRight, Brain, CalendarRange, Layers, LineChart, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, StatusPill } from "@/components/campusos/ui/primitives";

/* ------------------------------- Hero ---------------------------------- */

export function Hero() {
  return (
    <section className="border-border matte relative border-b">
      <div className="grid-fade pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <div className="mx-auto w-full max-w-[1200px] px-5 pt-24 pb-20 sm:px-8 sm:pt-32 sm:pb-28">
        <div className="grid items-start gap-14 lg:grid-cols-[1.05fr_minmax(0,0.95fr)]">
          <div className="enter-up">
            <p className="text-label text-primary">The autonomous campus</p>
            <h1 className="text-hero mt-6 max-w-[18ch]">
              The intelligence layer for campus operations.
            </h1>
            <p className="text-muted-foreground measure mt-6 text-[15px] leading-[1.65]">
              CampusOS AI reads the state of your campus, anticipates where it will break, and acts —
              turning scattered rooms, labs and requests into one accountable operating system.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Button asChild>
                <Link to="/copilot">
                  Meet the Copilot
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/dashboard">Open CampusOS</Link>
              </Button>
              <a
                href="/#platform"
                className="text-muted-foreground hover:text-foreground px-1 text-[13px] transition-colors duration-150"
              >
                How it works
              </a>
            </div>


            <dl className="border-border mt-12 grid max-w-lg grid-cols-3 gap-6 border-t pt-6">
              {[
                ["Utilisation visibility", "Live"],
                ["Scheduling conflicts", "Resolved in one step"],
                ["Decisions", "Evidence-backed"],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-label text-muted-foreground/80 leading-[1.5] min-h-[3em]">
                    {label}
                  </dt>

                  <dd className="mt-1.5 text-[13px] font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <HeroPreview />
        </div>
      </div>
    </section>
  );
}

function HeroPreview() {
  return (
    <Panel className="enter-up overflow-hidden p-0">
      <div className="border-border bg-surface-2 flex items-center justify-between border-b px-4 py-2.5">
        <p className="text-label">Copilot · Northgate Campus</p>
        <StatusPill tone="success">Live</StatusPill>
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        <p className="bg-primary text-primary-foreground ml-auto w-fit max-w-[80%] rounded-xl rounded-br-sm px-3.5 py-2 text-[13px] leading-relaxed">
          I need a 60-seat lab tomorrow 2–4 PM with a projector.
        </p>

        <ul className="text-meta space-y-1.5 font-mono">
          {[
            "Parsed constraints · capacity ≥ 60, projector",
            "Scanned 24 resources · 18 bookings",
            "Ranked 3 candidates by fit",
          ].map((line) => (
            <li key={line} className="flex gap-2">
              <span className="text-success">✓</span>
              {line}
            </li>
          ))}
        </ul>

        <div className="border-border rounded-lg border p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[13px] font-medium">Innovation Lab B</p>
              <p className="text-meta mt-1">Northgate Science Wing · 72 seats · projector, VR rig</p>
            </div>
            <StatusPill tone="success">94% fit</StatusPill>
          </div>
          <div className="text-meta mt-3.5 flex items-center gap-3">
            <span>Tomorrow · 14:00–16:00</span>
            <span aria-hidden>·</span>
            <span>No conflicts</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}

/* ---------------------------- Value shift ------------------------------ */

export function ValueShift() {
  const rows = [
    ["Room booking as paperwork", "Requests resolved by an operator that reasons"],
    ["Utilisation discovered a term late", "Pressure surfaced before it becomes a problem"],
    ["Decisions buried in inboxes", "Every action carries its evidence"],
  ];

  return (
    <section id="platform" className="border-border scroll-mt-16 border-b">
      <div className="mx-auto w-full max-w-[1200px] px-5 py-20 sm:px-8 sm:py-24">
        <p className="text-label text-primary">The shift</p>
        <h2 className="text-display mt-4 max-w-[24ch]">
          Campus software records what happened. CampusOS decides what happens next.
        </h2>

        <div className="divide-border border-border mt-12 divide-y border-t">
          {rows.map(([before, after]) => (
            <div key={before} className="grid gap-3 py-5 sm:grid-cols-2 sm:gap-10">
              <p className="text-muted-foreground text-sm line-through decoration-1">{before}</p>
              <p className="text-sm font-medium">{after}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- Workflow -------------------------------- */

export function Workflow() {
  const steps = [
    {
      icon: Layers,
      title: "Understand",
      body: "CampusOS ingests resources, timetables, bookings and constraints into a single live model of the campus.",
    },
    {
      icon: LineChart,
      title: "Predict",
      body: "It reads pressure ahead of time — capacity strain, conflicting sessions, under-used space, maintenance risk.",
    },
    {
      icon: Zap,
      title: "Act",
      body: "It recommends and executes the next best action, with reasoning attached so a human can always audit it.",
    },
  ];

  return (
    <section className="border-border border-b">
      <div className="mx-auto w-full max-w-[1200px] px-5 py-20 sm:px-8 sm:py-24">
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-6">
          {steps.map((s, i) => (
            <Panel key={s.title} className="p-5">
              <div className="flex items-center justify-between">
                <span className="bg-primary/10 text-primary grid size-8 place-items-center rounded-md">
                  <s.icon className="size-4" aria-hidden />
                </span>
                <span className="text-meta font-mono">0{i + 1}</span>
              </div>
              <h3 className="mt-4 text-base font-medium tracking-tight">{s.title}</h3>
              <p className="text-muted-foreground mt-2 text-[13px] leading-relaxed">{s.body}</p>
            </Panel>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------- Copilot section --------------------------- */

export function CopilotSection() {
  const capabilities = [
    "Finds the right room against real constraints, not keyword search",
    "Resolves double-bookings and proposes the least disruptive fix",
    "Explains utilisation pressure with the bookings behind it",
    "Confirms actions only after you approve them",
  ];

  return (
    <section id="copilot" className="border-border scroll-mt-16 border-b">
      <div className="mx-auto grid w-full max-w-[1200px] items-center gap-14 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-2">
        <div>
          <p className="text-label text-primary">AI Copilot</p>
          <h2 className="text-display mt-4 max-w-[20ch]">
            An operator you can talk to, not a chatbot bolted on.
          </h2>
          <p className="text-muted-foreground mt-5 max-w-lg text-sm leading-relaxed">
            Copilot sits on the same data as the rest of CampusOS. Ask in plain language; it reasons
            over resources and bookings, shows the evidence, and offers the action.
          </p>
          <ul className="mt-8 space-y-3">
            {capabilities.map((c) => (
              <li key={c} className="flex gap-3 text-[13px] leading-relaxed">
                <Brain className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
                <span className="text-muted-foreground">{c}</span>
              </li>
            ))}
          </ul>
          <Button asChild className="mt-9">
            <Link to="/copilot">
              Open Copilot
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </div>

        <Panel className="p-5">
          <p className="text-label text-muted-foreground/80">Sample request</p>
          <p className="mt-3 text-sm leading-relaxed">
            “Two sessions are booked in Lecture Hall 2 on Thursday morning — sort it out.”
          </p>
          <div className="border-border mt-5 space-y-3 border-t pt-5">
            {[
              ["Conflict identified", "Two overlapping sessions, 09:00–10:30"],
              ["Impact assessed", "Larger cohort keeps the hall"],
              ["Action proposed", "Relocate the smaller session to Seminar Room 4"],
            ].map(([title, detail]) => (
              <div key={title}>
                <p className="text-[13px] font-medium">{title}</p>
                <p className="text-meta mt-0.5">{detail}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </section>
  );
}

/* --------------------------- Capabilities ------------------------------ */

export function Capabilities() {
  const items = [
    {
      icon: CalendarRange,
      title: "Resource intelligence",
      body: "Every lab, hall and studio modelled with capacity, equipment and real availability.",
    },
    {
      icon: LineChart,
      title: "Utilisation analysis",
      body: "See where the campus is straining and where it is quietly empty.",
    },
    {
      icon: Zap,
      title: "Action workflows",
      body: "Booking, relocation and approval flows that finish the job instead of raising a ticket.",
    },
    {
      icon: ShieldCheck,
      title: "Auditable by design",
      body: "Every recommendation carries the data it was drawn from, ready for governance review.",
    },
  ];

  return (
    <section id="capabilities" className="border-border scroll-mt-16 border-b">
      <div className="mx-auto w-full max-w-[1200px] px-5 py-20 sm:px-8 sm:py-24">
        <p className="text-label text-primary">Capabilities</p>
        <h2 className="text-display mt-4 max-w-[22ch]">Built for the operational reality of a campus.</h2>

        <div className="mt-12 grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <Panel key={item.title} className="p-5">
              <span className="bg-primary/10 text-primary grid size-8 place-items-center rounded-md">
                <item.icon className="size-4" aria-hidden />
              </span>
              <h3 className="mt-4 text-[15px] font-medium tracking-tight">{item.title}</h3>
              <p className="text-muted-foreground mt-2 text-[13px] leading-relaxed">{item.body}</p>
            </Panel>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------- Ecosystem -------------------------------- */

export function Ecosystem() {
  const modules = [
    ["Command center", "Live campus state at a glance", "/dashboard"],
    ["Resources", "The physical inventory of the campus", "/resources"],
    ["Bookings", "Every reservation, request and approval", "/bookings"],
    ["Copilot", "The intelligence layer across all of it", "/copilot"],
  ] as const;

  return (
    <section id="ecosystem" className="border-border scroll-mt-16 border-b">
      <div className="mx-auto w-full max-w-[1200px] px-5 py-20 sm:px-8 sm:py-24">
        <p className="text-label text-primary">Ecosystem</p>
        <h2 className="text-display mt-4 max-w-[20ch]">One system, four surfaces.</h2>

        <div className="divide-border border-border mt-12 divide-y border-t">
          {modules.map(([title, body, to]) => (
            <Link
              key={title}
              to={to}
              className="hover:bg-surface-1 group flex items-center justify-between gap-6 px-1 py-5 transition-colors"
            >
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-meta mt-1">{body}</p>
              </div>
              <ArrowRight
                className="text-muted-foreground group-hover:text-foreground size-4 shrink-0 transition-colors"
                aria-hidden
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- Closing --------------------------------- */

export function ClosingCta() {
  return (
    <section id="roadmap" className="scroll-mt-16">
      <div className="mx-auto w-full max-w-[1200px] px-5 py-24 sm:px-8">
        <Panel className="p-8 text-center sm:p-14">
          <p className="text-label text-primary">Understand → Predict → Act</p>
          <h2 className="text-display mx-auto mt-4 max-w-[24ch]">
            Give your campus an operating system that thinks.
          </h2>
          <p className="text-muted-foreground mx-auto mt-5 max-w-md text-sm leading-relaxed">
            Explore the Northgate Campus deployment — a working command center and a Copilot that
            reasons over real operational data.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/copilot">
                Try the Copilot
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/contact">Talk to us</Link>
            </Button>
          </div>
        </Panel>
      </div>
    </section>
  );
}
