# CampusOS AI — Module Handoff Manifest

> Read this before extending CampusOS in another workspace. It is the integration
> contract for merging independently built modules into the canonical codebase.

## 1. Product vision

CampusOS AI is the intelligence layer for the autonomous campus. It connects
fragmented campus workflows and turns campus data into decisions:
**Understand → Predict → Act.** It is not an ERP, not an admin dashboard, and not a
chat wrapper — it is a premium operating surface for campus operations.

## 2. Design language

Dark-first enterprise. Restrained, dense, calm, precise. Color carries meaning
(green = healthy, amber = attention, red = critical, azure = information/action).
No neon, no decorative gradients, no glassmorphism, no sparkle icons everywhere.
Motion is 150–320ms ease-out and communicates state only.

Typography: **Inter** (UI) + **IBM Plex Mono** (numeric detail), loaded via a `<link>`
in `src/routes/__root.tsx`. Never `@import` a font URL in CSS (Tailwind v4 / Lightning CSS).

## 3. Routes

| Route | Purpose |
| --- | --- |
| `/login` | Sign-in (outside the app shell) |
| `/` | Campus Command Center |
| `/copilot` | AI Campus Copilot |
| `/resources`, `/resources/:id` | Resource explorer + detail |
| `/bookings`, `/bookings/:id` | Smart bookings + detail/conflict resolution |
| `/intelligence` | Campus Intelligence Center |
| `/analytics` | Analytics |
| `/approvals`, `/activity` | Operations |
| `/notifications`, `/settings`, `/profile` | System & account |

File-based routing (TanStack Start). Every in-app route is a child of the pathless
layout `src/routes/_shell.tsx`, which renders `AppShell`. A new module page is a new
`src/routes/_shell.<name>.tsx` file — nothing else needs to change.
Never edit `src/routeTree.gen.ts`.

## 4. Component architecture

```
src/components/campusos/
  ui/primitives.tsx     Panel, PageHeader, SectionHeading, MetricCard,
                        StatusPill, StatusDot, Tag, Sparkline,
                        UtilizationBar, EmptyState, statusTone()
  layout/AppShell.tsx   Sidebar + top bar + ⌘K palette + <Outlet />
  layout/CommandPalette.tsx
  dashboard/            InsightCallout, OperationsTimeline, LiveActivity, QuickActions
  copilot/              CopilotWorkspace
```
`src/components/ui/*` is stock shadcn — customise via variants, never fork a second
design system. Keep module components under `components/campusos/<module>/` and keep
them small; route files stay thin.

## 5. Design tokens

All tokens live in `src/styles.css` (`@theme inline` + `:root`). oklch only.
Surfaces: `background`, `surface`, `surface-2`, `card`, `popover`.
Semantics: `primary`, `success`, `warning`, `destructive`, `info`, `muted`.
Lines: `border`, `border-strong`. Radius base `0.5rem`.
Typography utilities: `text-display`, `text-metric`, `text-label`, `text-meta`, `tnum`.
Surface utilities: `panel`, `panel-hover`, `grid-fade`, `enter-up`, `pulse-dot`.

**Never hardcode a color in a component** (`text-white`, `bg-[#...]`). Add a token instead.

## 6. Mock data

Everything renders from `src/data/campus.ts`. Types (`Resource`, `Booking`,
`CampusInsight`, `ActivityEvent`, `NotificationItem`) are the API contract.

## 7–8. Module boundaries & shared components

One module owns one folder under `components/campusos/` plus its route files. Modules
must not restyle primitives locally — extend `ui/primitives.tsx` so every module
inherits the change.

## 9. Dependencies

TanStack Start/Router/Query · React 19 · Tailwind v4 · shadcn/Radix · recharts ·
lucide-react · sonner · cmdk · date-fns · zod.

## 10–12. Integration points / what is mocked

Currently mocked: all campus data, Copilot reasoning (staged UI phases with a
simulated tool trace), approvals/booking mutations (toast feedback), auth (`/login`
navigates straight to `/`).

Replace, in this order, without touching UI: the service functions in
`src/data/campus.ts` → real fetches; Copilot phases → a streamed server response with
the same `thinking → tools → result` phases; toasts → real mutations + query
invalidation; `/login` → real auth with a route guard on `_shell`.

## 13. Extending CampusOS

1. Add `src/routes/_shell.<module>.tsx`, thin, with its own `head()` metadata.
2. Add `src/components/campusos/<module>/` for its components.
3. Add types + service functions to `src/data/campus.ts`.
4. Register the nav entry in `AppShell.tsx` and the command palette.
5. Use only existing primitives and tokens.

## 14. Do-not-break rules

- Do not introduce a second design system, CSS framework, or router.
- Do not hardcode colors; do not add a light theme without redefining every token.
- Do not edit `src/routeTree.gen.ts`.
- Do not remove `<Outlet />` from `__root.tsx` or `_shell.tsx`.
- Do not create dead navigation entries — every nav item must resolve to a real route.
- Do not bypass `src/data/campus.ts` with inline fixtures inside components.

## 15. Typography system (final)

**Inter** (UI) + **IBM Plex Mono** (numeric/technical detail), loaded via `<link>` in
`src/routes/__root.tsx`. Base body: 14px / 1.55 / -0.006em, antialiased, `cv02–cv04`.
Headings get `-0.022em` tracking and `text-wrap: balance`; paragraphs `text-wrap: pretty`.

Utilities (all in `src/styles.css`): `text-hero`, `text-display`, `text-metric`,
`text-label` (uppercase micro-label), `text-meta` (quiet metadata), `tnum`,
`measure` (62ch editorial body width).

## 16. Theme system

`:root` = light, `.dark` = dark — the **same** token set in two modes, oklch only.
`src/lib/theme.ts` owns persistence (`campusos-theme` in localStorage) and the
flash-free `themeBootstrapScript` injected in `__root.tsx`; it respects
`prefers-color-scheme` when nothing is stored. `ThemeToggle`
(`components/campusos/layout/ThemeToggle.tsx`) is mounted in both the marketing
header and the app top bar. Body transitions colors over `--dur-base`.

## 17. Motion & surface language

Tokens: `--dur-fast|base|slow` (150/220/320ms) with `--ease-out-soft`.
Utilities: `enter-up` (page/section entry), `panel-hover` and `lift` (1px tactile
elevation, no scale, no glow), `pulse-dot` (live status), `matte` + `grid-fade`
(barely-visible depth on the landing hero), `section-y`, `rule-top`.
`prefers-reduced-motion` disables all of it.

## 18. Live campus context

`components/campusos/layout/CampusClock.tsx` renders real browser-local time and
date in the app top bar, ticking on aligned minute boundaries (one timer, one
re-render per minute, layout reserved to avoid hydration shift). The campus status
pill next to it (`StatusDot tone="success" pulse`) is the operational indicator.

## 19. Public pages

`/` landing, `/about`, `/contact`, `/privacy`, `/terms`, `/cookies` — all under the
`_site` layout with their own `head()` metadata. Footer covers Product (Copilot,
Resources, Bookings, Intelligence, Analytics), Platform, Company and Legal.

## 20. Real vs mocked (integration map)

| Area | State |
| --- | --- |
| Design system, theme, routing, layouts, clock | **Real** |
| Campus data (`src/data/campus.ts`) | Mocked, deterministic — swap for fetches |
| Copilot reasoning (`src/data/copilot.ts`) | Deterministic engine — swap for a streamed model response keeping the `thinking → tools → result` phases |
| Bookings / approvals mutations | Toast feedback only — replace with mutations + query invalidation |
| Auth (`/login`) | Mocked navigation — add real auth + a guard on `_shell` |

No secrets, API keys or network calls exist in the codebase; nothing needs to be
redacted before export.

## 21. Known limitations

Single seeded campus (Northgate); Copilot understands the four intent classes in
`src/data/copilot.ts`; charts render from static series; notifications and activity
are read-only.

---

# CAMPUSOS v5 — CAMPUS INTELLIGENCE

## Sidebar bug fix (critical)

**Root cause.** `NavList` in `src/components/campusos/layout/AppShell.tsx` ran in a
`fill` mode that forced every nav group and every `<li>` to stretch inside the
fixed `h-dvh` sidebar (`flex-grow: items.length`, `flexBasis: 0`, `flex-1`,
plus a dynamic `flex-[${n}]` class Tailwind never generates). Because flex items
default to `flex-shrink: 1`, once brand + Campus Pulse + user card consumed the
available height, the nav rows were compressed **below** their 36px content
height, so labels, icons and section headings overlapped.

**Fix.** Removed the stretch/`fill` layout. Nav items now have a fixed `h-9`,
`shrink-0`, natural rhythm; groups are `shrink-0`; the `<nav>` is
`min-h-0 flex-1 overflow-y-auto` so navigation scrolls internally while brand,
pulse and profile stay in their own bands. Also regrouped sections into
PRIMARY / OPERATIONS / INTELLIGENCE / SYSTEM and renamed the Intelligence entry
to "Campus Intelligence".

**Files modified.** `src/components/campusos/layout/AppShell.tsx`
(nav data, `NavList`, `<NavList />` call sites — desktop aside + mobile Sheet).

## Route
`/intelligence` → `src/routes/_shell.intelligence.tsx` (existing route reused,
no duplicate created).

## Components
`src/components/campusos/intelligence/pieces.tsx`
- `SignalMetric` — key campus signals
- `CampusPulseChart` — hourly activity pulse
- `SignalFeed` — detected / observed / predicted feed with follow-ups
- `PredictionCard` — predictive operations + inline explainability
- `RiskList`, `OpportunityList`, `RecommendationList`
- `CampusHealthPanel`, `CrossSystemChain`, `IntelAlert`, `AskCampusOS`

All visuals reuse the existing primitives (`Panel`, `SectionHeading`,
`StatusPill`, `PageHeader`) and the existing theme tokens. No second design
system, no new dependency.

## Mock intelligence — `src/data/intelligence.ts`
Centralised, deterministic, replaceable service layer:
`getCampusSignals`, `getCampusPredictions`, `getCampusRisks`,
`getCampusOpportunities`, `getCampusRecommendations`, `getCampusPulse`,
`getCampusHealthReport`, `getCrossSystemChain`, `getSignalMetrics`,
`getFeaturedPrediction`. Types: `CampusSignal`, `CampusPrediction`,
`CampusRisk`, `CampusOpportunity`, `CampusRecommendation`, `PulsePoint`.

## Integrations
- **Copilot** — `AskCampusOS` deep-links to `/copilot?q=<contextual question>`;
  the existing `CopilotShell` handles it. No second chat UI.
- **Resources** — insights carrying `relatedResource` link to
  `/resources/$id` (existing detail screen).
- **Bookings** — pressure / conflict / schedule items link to `/bookings`
  (existing Booking Intelligence workflows).

## REAL vs MOCKED
- REAL: routing, theme, live clock, navigation, Copilot deep-link handoff,
  resource/booking navigation, filters and time-context state.
- MOCKED: all signals, predictions, risks, opportunities, recommendations,
  pulse values, campus health scores and cross-system chain.
- READY FOR INTEGRATION: replace the `getX()` bodies in
  `src/data/intelligence.ts` with API/AI calls returning the same shapes
  (CAMPUS DATA → DATA PREP → AI SERVICE → PREDICTIONS → RECOMMENDATIONS → UI →
  HUMAN ACTION). No component reads raw data objects.
