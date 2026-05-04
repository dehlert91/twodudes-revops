# Two Dudes Design System — Handoff

This folder is a drop-in patch for `dehlert91/twodudes-revops`. Unzip it at the **repo root** and every file lands exactly where it needs to go.

## What's inside

```
handoff/
├── tailwind.config.js              → replaces your current tailwind.config.js
├── SKILL.md                        → new, goes at repo root (or .claude/ if using Claude Code)
├── src/
│   ├── index.css                   → replaces src/index.css (or merge if you have custom rules)
│   └── components/
│       ├── AppShell.jsx            → new — sidebar + header wrapping layout
│       └── ui.jsx                  → new — Button, Badge, KpiCard, ProgressBar, etc.
├── public/
│   └── assets/
│       ├── logo-horizontal.png     → new — use in AppShell
│       └── logo-circle.png         → new — favicon / square contexts
└── design-system/                  → new — specimen cards, for reference only
    ├── colors_and_type.css
    └── preview/*.html
```

## Install

From your repo root:

```bash
# 1. Unzip the handoff bundle here (or copy files in manually)
#    The paths are set so everything merges cleanly.

# 2. Verify the 3 files that overwrite existing ones look right:
git diff tailwind.config.js src/index.css

# 3. Stage + commit
git add tailwind.config.js src/index.css SKILL.md src/components/ public/assets/ design-system/
git commit -m "Add Two Dudes design system

- Extend Tailwind with brand tokens (color, type, spacing, radii, shadow)
- Add CSS variables in index.css for non-Tailwind contexts
- Add AppShell component (sidebar + header)
- Add reusable UI primitives (Button, Badge, KpiCard, ProgressBar)
- Add specimen cards in design-system/ for reference
- Add SKILL.md — AI assistant instructions for this system"

# 4. Push
git push
```

## Using it

### In any page component

```jsx
import AppShell from './components/AppShell';
import { Button, Badge, KpiCard, SectionLabel, ProgressBar } from './components/ui';

export default function ProjectsPage() {
  return (
    <AppShell>
      <div className="p-lg">
        <SectionLabel>Projects</SectionLabel>
        <h1 className="text-h1 text-ink mt-1.5">Projects Dashboard</h1>

        <div className="grid grid-cols-4 gap-md mt-lg">
          <KpiCard label="MTD Revenue" value="$284,150" sub="▲ 12.4% vs last month" subTone="success" />
          <KpiCard label="Jobs In Progress" value="17" sub="4 need attention" />
          <KpiCard label="GP Margin" value="28.4%" sub="▲ 1.8pp vs target" subTone="success" />
          <KpiCard label="Need to Invoice" value="$62,800" sub="3 over 30 days" subTone="warning" />
        </div>

        <Button variant="primary" className="mt-md">+ New Job</Button>
      </div>
    </AppShell>
  );
}
```

### Tailwind tokens available

| Token family | Examples |
|---|---|
| **Colors** | `bg-orange`, `bg-orange-dark`, `bg-orange-light`, `bg-ink`, `bg-charcoal`, `bg-surface-subtle`, `bg-surface-muted`, `text-muted`, `border-line`, `bg-success`, `bg-warning`, `bg-error`, `bg-info` |
| **Fonts** | `font-sans` (DIN 2014), `font-display` (same), `font-mono` (DM Mono) |
| **Sizes** | `text-label`, `text-small`, `text-body`, `text-h3`, `text-h2`, `text-h1`, `text-display` |
| **Spacing** | `p-xs`, `p-sm`, `p-md`, `p-lg`, `p-xl`, `p-2xl` (plus `m-*`, `gap-*`) |
| **Radii** | `rounded-sm` (4px), `rounded-md` (8px), `rounded-lg` (12px) |
| **Shadows** | `shadow-card`, `shadow-elevated`, `shadow-focus` |

### CSS variables (for non-Tailwind contexts)

If you need raw values in inline styles or third-party component configs, use the CSS variables: `var(--td-orange)`, `var(--font-body)`, `var(--td-text-primary)`, etc. Full list in `src/index.css`.

## Font situation

Current render uses **Barlow** (Google Fonts) as a stand-in for **DIN 2014** and **Playfair Display** nowhere — display type uses the same DIN 2014 weight. When you have a licensed DIN 2014 webfont:

1. Drop `.woff2` files in `public/fonts/`
2. Uncomment the `@font-face` block at the top of `src/index.css`
3. Remove the Google Fonts `@import` line
4. No component changes needed — tokens resolve to `din-2014` automatically

## What to ask the AI next

Paste into Cursor / Claude:

> Build a `<ProjectsListPage>` component using AppShell + the ui.jsx primitives. Mid-fi, real data, follow SKILL.md.

The AI will stay on-brand because the tokens are real and SKILL.md tells it the rules.

## Open questions for a follow-up session

- [ ] Convert the three wireframe variations (filter list, kanban, health cards) into production React components?
- [ ] Build out Revenue / Schedule / Finance / Benchmarks pages?
- [ ] Marketing site UI kit (twodudes.com)?
- [ ] Licensed font swap once you have `.woff2` files?
