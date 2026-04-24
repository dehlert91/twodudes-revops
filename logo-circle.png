# Project Detail Panel — Redesign Patch

Drop-in replacement for the project detail side-panel. Converts the flat
dense list into a prioritized hierarchy with a unified Financials table.

## What changed

- **Header** — PO moved into a one-click copy button (green-check micro-interaction), title kept prominent, stage + status badges grouped together
- **Hero KPIs** — 4 tiles pinned at the top: Revenue / Est GP% / GP $/hr / Hours to Date (with `X hrs remaining` sub-label)
- **Schedule track** — Uber-style vertical timeline (start dot → est completion dot, orange fill shows % elapsed) with a big "%-complete" stat to the right. Replaces the old 3-row Schedule + Progress sections
- **Financials** (new) — single table merging Revenue, Costs, Profitability. Columns are **Forecast** (blue-tinted = plan) · To Date · Remaining · **At Completion** (orange-tinted = outcome) · % Rev. Section bars group rows (Revenue / Costs / Profitability). Shows totals in each section header
- **Job Info** — same rows, tighter. Removed Division (inferred from Segment elsewhere). Customer + PM get emphasis weight
- **Billing & WIP** — unchanged structurally, moved below Financials
- **Hide empty** toggle — strips all the `—` rows in the section rows (Job Info, Billing) when no data is present
- **Sticky footer** — primary "View in HubSpot" orange button + Edit, instead of an inline link
- **Pin** button reserved in the header for a future shortlist feature
- **Width** — 760px (was `max-w-xl` = 576px). The Financials grid needs the room

## Files to change

| File | Change |
|---|---|
| `src/components/projects/ProjectDetailPanel.jsx` | Replace wholesale with `ProjectDetailPanel.jsx` in this folder |
| `src/components/projects/columns/formatters.js` | Add `fmtHours` + `fmtDate` (see `formatters.js` in this folder) |

No other callers, hooks, or routes need to change. The export signature
`ProjectDetailPanel({ project, onClose })` is unchanged.

## Tokens used

All from your existing `tailwind.config.js` — no new tokens needed:
- Colors: `orange`, `orange-dark`, `charcoal`, `muted`, `line`, `line-soft`, `surface`, `surface-muted`, `success`, `error`
- Type: `font-display`, `font-mono`, size helpers via arbitrary values to match design
- Spacing, radii, shadows: `rounded-sm`/`md`, `shadow-card`/`elevated`

Forecast / At-Completion column tints are inline arbitrary values
(`bg-[#EEF3F8]`, `bg-[#FDF4ED]`) since they're component-local accents,
not global tokens. If you want them semantic, I'd add
`colors.plan = '#EEF3F8'` + `colors.actual = '#FDF4ED'` to the config.

## Known limitations

- Sample GP forecast is computed client-side (Revenue − Forecasted Cost). If you'd rather read `forecasted_gp` straight from Supabase, just replace the `gpForecast` calc in `FinancialsTable`
- `duration_days` (for the Schedule track) is read from the project; not in the current `project_details` view. Either derive it, or the track gracefully hides that chip
