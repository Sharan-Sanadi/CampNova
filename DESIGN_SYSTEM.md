# CampusOS AI — Design Contract

The single source of truth for every CampusOS module. Tokens live in `src/styles.css`;
primitives live in `src/components/campusos/ui/primitives.tsx`.

## Typography

| Role | Utility | Notes |
| --- | --- | --- |
| Display | `text-display` | Hero statements only, one per screen |
| Page title | `text-2xl font-medium tracking-tight` | Via `PageHeader` |
| Section title | `text-base font-medium` | Via `SectionHeading` |
| Metric | `text-metric` | Editorial numerals, tabular |
| Body | `text-sm` | Default reading size |
| Body small / meta | `text-meta` | Muted, 12px |
| Label | `text-label` | 11px uppercase, tracked, muted |
| Numbers | `tnum` | Always tabular in tables, metrics, times |

Fonts: Inter (UI), IBM Plex Mono (`font-mono`) for identifiers.

## Color

- Surfaces: `bg-background` → `bg-surface` → `bg-surface-2` (three elevation steps only).
- Text: `text-foreground`, `text-muted-foreground`. Never `text-white`/`text-black`.
- Semantics: `success` healthy/available · `warning` attention/pending ·
  `destructive` critical/conflict · `primary` information & action.
- At most one accent-colored element per card. Color must mean something.

## Spacing & layout

4px scale. Card padding `p-5` (`p-4` on mobile). Section gap `gap-6`. Grid gap `gap-3`.
Content max width `1400px`, set by `AppShell`.

## Radius, borders, shadows

Base radius `0.5rem`; panels use `rounded-xl` via the `panel` utility. Hierarchy comes
from 1px `border` / `border-strong`, not from shadows. Shadows only for floating layers.

## Motion

150ms hover · 220ms surface change · 320ms entrance (`enter-up`, staggered ≤60ms).
Ease `cubic-bezier(0.22, 1, 0.36, 1)`. Everything is disabled under
`prefers-reduced-motion`.

## Components

- **Buttons** — one primary action per view; `outline` for secondary; `ghost` for tertiary/dismiss.
- **Cards** — always `Panel`; add `panel-hover` only when the whole card is a link.
- **Status** — `StatusPill` / `StatusDot` with `statusTone(status)`; never invent new badge styles.
- **Charts** — recharts, no vertical gridlines, muted axes, one series color per meaning,
  and every chart carries an AI observation beneath it.
- **Tables** — only where scanning rows beats cards; sticky header, `divide-border` rows,
  `hover:bg-surface-2`, status via `StatusPill`.
- **Empty/loading/error** — use `EmptyState`; never ship a blank region or "coming soon".

## Responsive

Breakpoints: mobile < 640, tablet 640–1024, desktop ≥ 1024 (sidebar appears at `lg`).
Header rows use `grid-cols-[minmax(0,1fr)_auto]` + `min-w-0` + `shrink-0`.
Wide tables and timelines scroll horizontally inside their panel — never the page.

## Accessibility

Semantic landmarks (`header`, `nav`, `main`, `section` with `aria-label`), one `h1` per
page, `aria-label` on every icon-only control, `aria-pressed` on filter toggles, visible
focus ring (`:focus-visible` outline in `primary`), 44px touch targets for primary
mobile actions, and `h-dvh` instead of `h-screen`.
