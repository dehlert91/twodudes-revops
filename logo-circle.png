# V3 Sidebar — drop into your repo

Two files. Copy them into `twodudes-revops` at the matching paths, then commit.

## Files

```
src/components/layout/AppShell.jsx   ← replaces current AppShell
public/assets/logo-circle.png        ← new asset (used by sidebar)
```

## What changed

- **Layout:** 68px light-orange rail (`#F0A882`) that always shows + a 220px peach panel (`#F7CDB1`) that collapses/expands via a chevron button on the rail.
- **Logo:** circular Two Dudes mark, 44px, white disc with a soft shadow so it reads as an elevated button.
- **Active state:** translucent white chip with a dark left bar — charcoal type on peach for solid contrast (no white-on-light-orange).
- **Top chrome removed:** no orange strip, no search/bell/avatar header. Pages render directly in `<main>`. Each page can add its own header.
- **Tailwind/tokens:** uses your existing `tailwind.config.js` classes (`flex`, `font-sans`, `bg-surface`, etc.) plus a few inline styles for the brand-specific peach tones that aren't in the config. Nothing else needs to change.

## Header on pages

Your old header (search + notifications + avatar) is gone from the shell. If you want it back on specific pages (e.g. ProjectsPage), lift it into that page's layout — it doesn't belong in the shell when the sidebar owns the brand identity.

## One thing to check

`ProjectsPage.jsx` and others may have relied on the shell providing the search input. If so, move that input into the page's own toolbar — the `ProjectsToolbar.jsx` in your repo is probably the right home for it.
