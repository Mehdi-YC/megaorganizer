# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A small set of trusted people (the owner plus a few known others), each with
their own account on a shared self-hosted instance. The owner is technical and
runs the server; the others use it day to day from a phone. The owner's own use
is the heaviest and includes running their freelance/consulting business
through the invoicing module alongside personal finance.

They reach for it in the middle of their day: capturing a thought, checking a
reminder, logging a workout, recording an expense, or issuing an invoice. It is
the one place their personal and working records live, so the job is not "take
a note" but "keep the whole of my own record straight, and get it back out
when I need it".

## Product Purpose

MegaOrganize is a self-hosted personal knowledge, organization, activity and
tracking system. It gathers the domains a person actually keeps records in —
notion-like pages and items, tasks and reminders, training and running, money,
and client invoicing — into one application on one server. Success is that a
user stops scattering their life across five subscriptions and finds anything
they recorded, from any device, including when the machine it runs on is the
only thing they control.

## Positioning

One owned database for every life domain. Notes, tasks, training, spending and
invoices share a single SQLite file on hardware the user controls, with
wikilinks and full-text search crossing the domain boundaries, and a full JSON
export that covers all of them. A neighboring product could copy any one module;
it could not truthfully claim the whole record is one portable file with no
service in the middle.

## Operating Context

- Deployed as a single Docker container with a SQLite file and a `data/`
  uploads folder; migrations run at startup and the search index builds itself
  on first boot.
- The reminder scheduler runs in-process, so no cron or external worker exists.
- Web Push (VAPID) delivers reminder notifications when the app is closed; with
  no keys the app still runs and notifies only while open.
- Installed as a PWA on phones, with home-screen quick actions and an Android
  share-sheet target into Quick Capture.
- An MCP endpoint at `POST /api/mcp` lets an AI client read and edit the
  calling account's own data, authenticated per account with email and
  password.
- Backups are a routine operation: JSON export/import plus file copies of the
  database and uploads.
- Development is Bun + Vite (`bun run dev`); `bun run check` and the lint gate
  must stay clean.

## Capabilities and Constraints

Confirmed capabilities (see README for the full inventory): tree-based knowledge
(categories → pages → nodes → items) with wikilinks and backlinks; global
full-text search; tasks; reminders with recurring templates, checklists and
push actions; training sessions, running with GPS, exercise library, programs
and calendar planning; HIIT/WOD timers; finance expenses and monthly summaries;
client invoicing (clients, products, invoices, yearly documents); tags;
dashboard; backup/restore; MCP server.

Constraints future work must preserve:

- Self-hosted, no vendor lock-in. Data stays local, and the JSON backup must
  keep covering every domain, including domains added later.
- Single deployable container backed by SQLite; no external services beyond
  optional push keys.
- Per-user data isolation. Every query, API route and MCP tool is scoped to the
  owning account.
- Phone-first PWA: installability, offline shell, quick actions and the share
  target carry as much weight as the desktop experience.
- Existing modules are load-bearing, especially backup, finance, invoicing,
  items and pages; new work extends them rather than replacing or side-lining
  them.

Deliberately undecided: whether the instance will ever accept open sign-up;
the multi-tenant/SaaS path is not committed to.

## Brand Commitments

The name is MegaOrganize (package `megaorganize`). No logo, wordmark, tone
guide or binding visual reference has been established; UI conventions in the
codebase are incumbent practice rather than a stated brand commitment.

## Evidence on Hand

- Working implementation with ~20 domain services and REST endpoints, plus a
  deck builder module.
- Real seedable local database (`local.db`) and uploaded assets in `data/`.
- Bundled exercise library and images derived from the public-domain
  free-exercise-db dataset (see `CREDITS.md`).
- No testimonials, customer logos, benchmarks, pricing or press exist; future
  work must not fabricate them.

## Product Principles

1. One record, findable everywhere: a fact entered once is reachable from every
   other surface that could need it, across domain boundaries.
2. The owner controls the data end to end; any feature that would strand data
   behind a service is out of bounds.
3. Cover the whole domain, not a demo of it: when a module ships, its export,
   search coverage and per-user scoping ship with it.
4. Reachable in seconds from a phone; capture is a keystroke, a share or a home-
   screen tap, never a navigation maze.
5. Quiet by default. It is a personal utility used daily, so it earns trust
   through consistency and speed rather than novelty.

## Accessibility & Inclusion

English-language UI only. Accessibility is practical rather than a claimed
standard: keyboard reachability, visible focus, sufficient contrast, adequate
touch targets, and dialogs that behave correctly with assistive technology.
