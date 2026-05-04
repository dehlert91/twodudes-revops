# Two Dudes — Design Skill

Use this system for any Two Dudes surface (internal tooling or twodudes.com).

## Non-negotiables
- Import design tokens from `tailwind.config.js` + `src/index.css` — never redefine them inline.
- Single accent: orange `#E57A3A` (Tailwind: `orange`, CSS: `--td-orange`). No secondary brand colors.
- Type: **DIN 2014** for all text (`font-sans` / `font-display`); **DM Mono** (`font-mono`) for numeric data — dollar amounts, PO numbers, hours, counts. Non-negotiable in data-dense surfaces.
- "Two Dudes" is two words with a space. Never alternate colors between the words in typeset text — the orange/black split is reserved for the horizontal logo artwork only.
- Section labels: uppercase, weight 600, letter-spacing 0.06em (use `<SectionLabel>` or `.td-label`).
- Buttons: 4px radius (not pill). Primary = orange fill, white text. Secondary = transparent with orange border.
- Sidebar: `bg-charcoal` (`#434343`), white text, orange left-border + orange text on active item.
- Page top: 6px orange strip (`<div className="td-strip" />`) for brand recognition.

## Voice
Direct, warm, slightly playful. Prefer "Save" over "Submit", "Nothing here yet" over "No records found".

## Icons
Heroicons — outline, 1.5px stroke. 16 / 20 / 24 px.

## Reusable components
Always check `src/components/ui.jsx` before inventing: `Button`, `Badge`, `StatusDot`, `SectionLabel`, `KpiCard`, `ProgressBar`. The `AppShell` wraps pages.

## When in doubt
Check `design-system/preview/*.html` for an approved pattern before inventing one.
