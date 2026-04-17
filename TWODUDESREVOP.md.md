# Two Dudes — RevOps App: Claude Code Instructions
**Version 1.1 — April 2026**

---

## Who I Am

I have no coding background. I learn through doing and through Socratic dialogue. When we build together:

- **Talk out loud.** Narrate every decision, every tradeoff, every thing to watch out for. Silent code drops are not acceptable.
- **No filler.** Real answers only.
- **Explain the why**, not just the what. I want to understand what we're building, not just have it built for me.
- **Think in destinations.** I work backwards from the end output. Translate that into app-action terms: buttons, functions, done criteria.

---

## Who We Are

Two Dudes Painting Company is a field services / contracting company operating across four divisions: **CDO, CGC, RDO, RGC**. This app replaces fragmented tools (Smartsheet, Airtable, manual spreadsheets) with a single unified RevOps platform.

**Primary users:** Dylan (owner), Pete (co-owner), Erin (Finance), PMs (project-level), Finance team (EOM close, invoicing).

**Universal linking key across every system: the PO number.** Everything ties back to it.

---

## Brand Standards

### Colors
| Name | Hex | Usage |
|---|---|---|
| Orange | `#E57A3A` | Primary accent, CTAs, active states, headers |
| Black | `#000000` | Primary text |
| Light Gray | `#D9D8D6` | Borders, backgrounds, secondary surfaces |

### Typography
- **Headlines:** Eames Century Modern Bold
- **Body:** DIN 2014 Regular
- Fallback stack: `"DIN 2014", "Arial", sans-serif`

### Design Direction
- **White-first aesthetic.** Painter's white — clean, bright, professional. White is the dominant surface color.
- **Orange as accent only**, not dominant. Used for active states, CTAs, left-border row highlights, section headers.
- **Paint can motif.** The visual language draws from looking straight down into a paint can — concentric circles, dot patterns, rings. Use subtly and purposefully, not decoratively for its own sake.
- **Industrial but not cold.** The brand has character — VW bus, tire marks, texture. The app should feel like it belongs to this company, not a generic SaaS dashboard.
- **No generic AI aesthetics.** No purple gradients. No Inter/Roboto. No cookie-cutter component libraries.

### Logo Rules
- Primary mark: full logo with white ring
- Never rotate, stretch, compress, add drop shadows, or invert colors
- Minimum size: 0.3" — do not render smaller
- Clear space: 0.5" on all sides

---

## The Stack

| Layer | Tool | Notes |
|---|---|---|
| CRM / Job data | HubSpot | Custom Projects object ID: 2-33563789 |
| Database | Supabase (PostgreSQL) | Primary backend, all calculation logic lives here. Project: FPA Tool, region: us-east-1, Postgres 17 |
| Automation / sync | Make (Integromat) | HubSpot → Supabase sync |
| App UI | Claude Code | Primary build tool |
| Analytics | Metabase | Read-only, connects via `metabase_reader` role |
| Financial | QuickBooks Online (QBO) | Invoice drafting, EOM journal entry import |
| Labor / scheduling | Connecteam | Labor entries sync into `labor_entries` table |
| Estimating | PaintScout | Source of quote data |
| Dev environment | VS Code, Git Bash, Node.js, GitHub, Vercel | |
| AI integration | Anthropic API | Embedded chat, Phase 2 |

---

## App Architecture

### The Five Sections

Data flows in one direction: **Schedule → Revenue → Finance → Benchmarks**

Each section has one owner, one job, and one question it answers. There is no overlap.

---

#### 1. Revenue
**Answers:** Where is the company headed and how does it compare to plan?
**Owner:** Dylan (read access for all)

Pure consumption layer — no data entry. Fed entirely by Schedule. Two tabs:
- **Forecast** — revenue rolled up by division and org-wide
- **vs. Plan** — actuals and forecast rolling against budget/KPI targets

Targets live in dedicated `budget_targets` and `kpi_targets` tables — never mixed with actuals. Variance computed in views or app layer, never stored.

---

#### 2. Schedule
**Answers:** What's actually on the board and when?
**Owner:** Ops, PMs, Dylan

The only place revenue data originates. Every scheduled job is a row in `schedule_events` that feeds Revenue.

**Non-negotiable design rule:** The interface must feel like a spreadsheet — keyboard navigable, inline editable, grid-native. No form patterns. If it feels like filling out a form instead of working in a grid, it's wrong.

Each row: PO, division, dates, crew, estimated revenue, status. Edits write directly to Supabase.

---

#### 3. Projects *(Phase 1 — build first)*
**Answers:** Is this specific job making money, and why or why not?
**Owner:** PMs primarily, Dylan secondarily

One record per PO. Displays: contract value, labor actuals vs. budget, change orders, invoiced amount, remaining scope. Built to surface variance mid-job, not just at close.

Change orders tracked in a dedicated `change_orders` table — never in HubSpot pipeline.

---

#### 4. Finance *(Phase 1 — build second)*
**Answers:** What needs to be closed out or invoiced?
**Owner:** Finance team (Erin)

Two tabs:
- **Invoicing Queue** — jobs ready to invoice. Send Invoice → popup with description dropdown → drafts invoice in QBO
- **EOM Close** — WIP close process. Exports CSV formatted for QBO journal entry import (fields: date, credit, debit, PO number, journal entry name)

**Design rule:** Finance does review and approval, not data entry. Every manual step is a future automation target.

---

#### 5. Benchmarks
**Answers:** How did we actually perform?
**Owner:** Everyone (read only, displayed in Metabase)

Finalized post-close data only. Nothing lands here until Finance has closed it. Metabase connects via a dedicated `metabase_reader` read-only Postgres role through views only — never raw tables.

---

## Build Phases

### Phase 1 — Foundation (Target: 4/11/26)
| Item | Status |
|---|---|
| HubSpot CO fix | Done (closed 3/24) |
| Supabase schema + RLS | Done — see schema section below |
| Projects section | Up next |
| EOM Close CSV export | Up next |
| Metabase connect | In progress |

**Exit criteria:** A PM can open any job and see its full financials. Finance can run EOM close and export to QBO without touching a spreadsheet.

### Phase 2 — Operations Layer (Target: 5/26/26)
| Item | Notes |
|---|---|
| Schedule grid | Keyboard-nav, Supabase writes, grid-native UX |
| Revenue dashboard | Forecast, vs. Plan tab |
| Key financials | Bottom-up forecast, budget/KPI tables vs. actuals |
| AI chat embed | Anthropic API, Tier 1 floating widget first |

**Exit criteria:** Dylan opens the app, sees where the company stands today and 90 days out, drills any job, asks a plain-English question, gets a live-data answer.

---

## Supabase Schema

### Project Details
- **Name:** FPA Tool
- **ID:** `viqaqyjkmwocwqrujdln`
- **Region:** us-east-1
- **Postgres:** 17

### Tables

| Table | Rows | Purpose |
|---|---|---|
| `projects` | 356 | Core project records — PO is primary key |
| `labor_entries` | 21,046 | Connecteam labor data |
| `qbo_expenses` | 8,471 | QBO expense sync |
| `qbo_invoices` | 1,557 | QBO invoice sync |
| `qbo_journal_entries` | 1,037 | QBO journal entry sync |
| `employees` | 84 | Employee records |
| `divisions` | 4 | CDO/CGC/RDO/RGC lookup |
| `change_orders` | 0 | CO table — built, may be deprecated |
| `schedule_events` | 0 | Scheduling — scaffolded, not yet populated |
| `budget_targets` | 0 | Budget — scaffolded, not yet populated |
| `kpi_targets` | 0 | KPI targets — scaffolded, not yet populated |
| `segment_benchmarks` | 0 | Benchmarks — scaffolded, not yet populated |
| `users` | 0 | App users — scaffolded, not yet populated |

### Date Fields by Table

These are the canonical date fields for all filtering, period reporting, and Finance use cases. Always use these — never `created_at` or `synced_at` — for business logic.

| Table | Field | Type | Use |
|---|---|---|---|
| `projects` | `date_job_sold` | date | When job was sold |
| `projects` | `estimated_start_date` | date | Planned start |
| `projects` | `estimated_completion_date` | date | Planned end |
| `projects` | `closed_at` | timestamptz | When Finance closed the job |
| `labor_entries` | `work_date` | date | **Primary labor period filter** |
| `qbo_expenses` | `transaction_date` | date | **Primary expense period filter** |
| `qbo_invoices` | `invoice_date` | date | **Primary invoice period filter** |
| `qbo_invoices` | `due_date` | date | Payment due |
| `qbo_journal_entries` | `je_date` | date | Journal entry date |
| `schedule_events` | `event_date` | date | Scheduled start |
| `schedule_events` | `end_date` | date | Scheduled end |
| `kpi_targets` | `effective_from` | date | KPI validity start |
| `kpi_targets` | `effective_to` | date | KPI validity end |
| `budget_targets` | `fiscal_year` + `period_month` | int + int | Budget period — no native date column, requires conversion to join real date ranges |
| `employees` | `hire_date` | date | Employee start |

### Date Filtering Architecture

Static Supabase views cannot accept date parameters — a view doing `SUM(labor_hours)` always returns all-time totals. For period-specific rollups use **Postgres RPC functions** with `start_date` / `end_date` params:

```js
supabase.rpc('get_project_summary', {
  po: 'PO-2024-001',
  start_date: '2025-01-01',
  end_date: '2025-03-31'
})
```

- **Static views** → all-time totals (contract value, total invoiced, total COs)
- **RPC functions** → period aggregates (labor hours in a month, expenses in a quarter, revenue by period)
- **Raw row queries with date filters** → transaction-level drill-down (show me every labor entry in January)

### RLS Policy Summary

All tables have RLS enabled. Role hierarchy: `owner > finance > pm > ops > read_only`

| Table | Read | Write |
|---|---|---|
| `projects` | All authenticated | owner, ops, pm |
| `labor_entries` | All authenticated | owner, finance, ops, pm |
| `employees` | All authenticated | owner, ops |
| `qbo_expenses` | All authenticated | owner, finance |
| `qbo_invoices` | All authenticated | owner, finance |
| `qbo_journal_entries` | All authenticated | owner, finance |
| `change_orders` | All authenticated | owner, pm |
| `schedule_events` | All authenticated | owner, ops, pm |
| `budget_targets` | All authenticated | owner, finance |
| `kpi_targets` | All authenticated | owner only |
| `segment_benchmarks` | All authenticated | owner, finance |
| `divisions` | All authenticated | — |
| `users` | Own record + owner sees all | owner only |

### Indexes

| Table | Indexed Fields |
|---|---|
| `labor_entries` | `work_date`, `po_number`, `employee_id`, `is_overhead` |
| `qbo_expenses` | `transaction_date`, `po_number`, composite `(po_number, transaction_date)` |
| `qbo_invoices` | `invoice_date`, `po_number`, composite `(po_number, invoice_date)` |
| `schedule_events` | `po_number` |
| `budget_targets` | composite `(fiscal_year, period_month, division_id)` |

### Important Schema Notes

- `projects` has stored columns `hours_to_date`, `labor_cost_to_date`, `material_cost_to_date`, `set_cost_to_date`, `amount_billed_to_date` — these are Make sync targets, not canonical. Always build Finance views from `labor_entries` + `qbo_expenses`, not from these stored fields.
- `budget_targets` uses `fiscal_year` (int) + `period_month` (int) — no native date column. Requires conversion when joining against transaction tables.
- `change_orders` is empty and may be deprecated depending on how CO tracking evolves.
- All Postgres functions have `SET search_path = public` — required, do not omit on any new functions.

---

## Technical Rules (Non-Negotiable)

### Data & Calculations
- **Calculated fields live in Supabase views, never in stored columns.** Total contract value, labor variance, remaining scope — all computed at query time.
- **Targets and actuals always in separate tables.** Variance computed in views or app layer only, never stored.
- **Change orders in a dedicated Supabase table** — never in HubSpot pipeline.
- **Period rollups via RPC functions**, not static views. Static views for all-time totals only.

### Security
- **RLS policies written and verified manually.** Never trust auto-generated RLS.
- **Service role keys never in client-side code.** Anon key + RLS for all app-facing queries.
- **Secrets never in Git.** `.env` in `.gitignore` before first commit. `.env.example` documents required variables without values.
- **All new Postgres functions must include `SET search_path = public`** — mutable search_path is a SQL injection vector.

### HubSpot + Make Integration
- `hs_object_id` maps at the **top level of the iterator bundle**, not inside `properties`
- Custom objects require HTTP module, Raw body type, CRM Search API
- HubSpot Get steps won't return custom properties unless explicitly listed under "Additional Properties to Retrieve"
- `is_known()` works in HubSpot formulas. `is_present()` and `coalesce()` do not — confirmed in this portal.

### General
- **No form patterns in Schedule.** Grid-native only.
- **Build-vs-buy analysis** before committing to any new tool or library.

---

## Mobile Requirements

Mobile compatibility is a **hard requirement**, not an afterthought. At minimum:

- **Projects** must be fully mobile-usable — PMs need to pull up a PO on a job site. Design mobile-first.
- **Finance invoicing queue** should work on mobile.
- **EOM Close** can be desktop-only — this is a heads-down Finance task.
- **Schedule** — read access on mobile minimum, edit access if feasible.

---

## Key HubSpot Properties & IDs
- Projects custom object ID: `2-33563789`
- AWO naming convention: `Deal Name - AWO1`, `AWO2`, etc. driven by `awo_count` counter on prime deal
- Total contract value formula: `if(is_known([properties.change_order_amount]), [properties.amount] + [properties.change_order_amount], [properties.amount])`

---

## Known Gotchas
- **HubSpot code actions cannot write outputs to number/currency field types** — offload all calculations to Supabase instead.
- **Make/Zapier stale sample IDs** — 404 errors during test runs are often stale sample deal IDs, not logic errors. Re-pull live samples before debugging.
- **Supabase 502s on Pro** — transient infrastructure hiccups, not code issues. Wrap Supabase calls in a retry with 1.5s delay.
- **Smartsheet column `663427674335108`** only accepts `INTP` or `EXTP` as valid project type values — constraint until Smartsheet is retired.
- **`projects` stored cost columns are sync targets, not canonical** — always build Finance views from `labor_entries` + `qbo_expenses`, not from `labor_cost_to_date` etc.
- **`budget_targets` has no date column** — uses `fiscal_year` + `period_month` integers. Convert to date range when joining against transaction tables.
