# MegaOrganize

A self-hostable personal knowledge, organization, activity, and tracking OS. Built with SvelteKit 2, Svelte 5, TypeScript, and SQLite.

## Tech Stack

| Layer     | Technology                                              |
| --------- | ------------------------------------------------------- |
| Framework | SvelteKit 2 + Svelte 5 (runes mode)                     |
| Language  | TypeScript                                              |
| Styling   | Tailwind CSS v4                                         |
| Database  | SQLite via Drizzle ORM + LibSQL                         |
| Auth      | Better Auth                                             |
| Runtime   | Bun                                                     |
| Markdown  | Marked + DOMPurify (Mermaid + highlight.js lazy-loaded) |
| Push      | Web Push (VAPID) with in-app polling fallback           |

## Getting Started

```sh
# install dependencies
bun install

# set up environment
cp .env.example .env

# push database schema
bun run db:push

# start dev server
bun run dev
```

## Database Commands

```sh
bun run db:generate  # generate migration files from schema changes
bun run db:migrate   # run pending migrations
bun run db:push      # push schema directly (dev only — skips migration files)
bun run db:studio    # open Drizzle Studio
bun run db:reindex   # rebuild the full-text search index from source tables
```

> **⚠️ Production workflow:** Always use `db:generate` + `db:migrate` for production databases.
> `db:push` is convenient for local development but does not create migration files,
> which means you lose the ability to safely evolve your schema with existing data.

## Project Structure

```
src/
  lib/
    components/
      finance/           # ExpenseForm, ExpenseCard, MonthlySummary
      item/              # ChildItemList, TagPicker, YdkDeckViewer
      layout/            # Sidebar
      reminders/         # ReminderCard, ReminderCalendar, ReminderTemplateForm
      timers/            # TimerBuilder
      ui/                # Reusable UI components (Button, Dialog, ItemImage, etc.)
      QuickCapture.svelte # Quick-add finance/reminder/item capture
    server/
      auth.ts          # Better Auth configuration
      db/              # Drizzle schema + connection
      services/        # Server-side business logic
    utils/             # Shared utility functions
  routes/
    api/               # REST API endpoints
    app/               # Authenticated app pages
    auth/              # Login, register, logout
```

## Features

### Tree-Based Knowledge System

- **Categories** — top-level containers
- **Pages** — markdown pages within categories
- **Nodes** — colored, icon-labeled sections (folders)
- **Items** — leaf content with images, markdown, video, and external links

### Wikilinks

- Link any page or item with `[[Target]]` or `[[Target|label]]`
- Backlinks panel on every page and item
- Links survive renames; creating a missing target lights up dangling links
- Click any link to open it, or create the target if it does not exist yet

### Yu-Gi-Oh Deck Builder

- Import/export `.ydk` files
- Card lookup via YGOPRODeck API
- Visual deck viewer with responsive grid
- Card count badges and enlarged card modal with 3D tilt effect

### Training Tracker

- Session management (strength, running, cycling, walking, swimming)
- Running with GPS tracking, pace, elevation
- Calendar view, history, and stats
- Exercise records with sets, reps, weight, RPE

### HIIT / WOD Timers

- Timer templates with custom steps (work, rest, rounds)
- Full-screen timer runner page
- Quick-start from the PWA home screen

### Reminders

- One-off reminders and recurring templates with todo checklists
- Web Push notifications with Done and Snooze actions, even when the app is closed
- Per-device push opt-in under Settings
- Calendar view, history, and stats overview

### Finance

- Expense tracking with monthly summaries
- Quick expense capture

### Backup & Restore

- Full JSON export/import covering every domain (knowledge tree, training, reminders, finance, decks, timers)

### Library

- Grid view of all items with tag and YDK filters
- Full-text search (SQLite FTS5) across names, descriptions, and body
  markdown of pages, items, reminders, expenses, and training sessions

### Tag System

- Create, edit, delete tags with custom colors
- Assign multiple items to tags
- Filter by tags in library

### Dashboard

- Upcoming reminders and training overview
- Activity stats across training, running, and finance

### PWA

- Installable progressive web app with offline service worker
- Home-screen quick actions (start timer, new session, quick capture)
- Share text and links from any app straight into Quick Capture
- Quick Capture on the `c` key: markdown body with wikilinks, quick reminders, and one-tap Start Training

## UI Components

Reusable components in `src/lib/components/ui/`:

| Component         | Description                        |
| ----------------- | ---------------------------------- |
| `Badge`           | Status badge                       |
| `Button`          | Styled button with variants        |
| `Checkbox`        | Styled checkbox                    |
| `ConfirmButton`   | Two-click delete confirmation      |
| `ConfirmDialog`   | In-app confirmation modal          |
| `Dialog`          | Modal dialog                       |
| `EmptyState`      | Empty state placeholder            |
| `GridItemImage`   | Grid card image with blur fallback |
| `Input`           | Text input with consistent styling |
| `ItemImage`       | Auto small/large image display     |
| `MindMap`         | Graph/roadmap visualization        |
| `PageHeader`      | Page title + actions layout        |
| `RunMap`          | Leaflet map for GPS runs           |
| `SearchInput`     | Search input with icon             |
| `Select`          | Styled select                      |
| `SessionListItem` | Training session list row          |
| `Spinner`         | Loading spinner                    |
| `StatGroupCard`   | Grouped stats display              |
| `TagChips`        | Colored tag pills                  |
| `Textarea`        | Multi-line text input              |

Domain components live in `src/lib/components/{finance,item,reminders,timers}/`,
plus `QuickCapture.svelte` for quick-add capture.

## API Endpoints

| Endpoint              | Methods                | Description                                          |
| --------------------- | ---------------------- | ---------------------------------------------------- |
| `/api/categories`     | GET, POST, PUT, DELETE | Category CRUD                                        |
| `/api/pages`          | GET, POST, PUT, DELETE | Page CRUD                                            |
| `/api/tree`           | GET, POST, PUT, DELETE | Tree elements CRUD, search, subtree, move            |
| `/api/tree/hierarchy` | GET                    | Full tree hierarchy                                  |
| `/api/attachments`    | GET, POST, DELETE      | File upload, download, delete                        |
| `/api/tags`           | GET, POST, PUT, DELETE | Tag CRUD                                             |
| `/api/training`       | GET, POST, PUT, DELETE | Training sessions, activities, records               |
| `/api/running`        | GET, POST, PUT, DELETE | Running activities & GPS data                        |
| `/api/timers`         | GET, POST, PUT, DELETE | HIIT/WOD timer templates & steps                     |
| `/api/reminders`      | GET, POST, PUT, DELETE | One-off reminders, templates, complete/snooze, stats |
| `/api/finance`        | GET, POST, PUT, DELETE | Expenses, monthly summaries, settings                |
| `/api/links`          | GET                    | Resolve a wikilink target name to a URL              |
| `/api/push`           | GET, POST              | Web Push config, device subscribe/unsubscribe        |
| `/api/search`         | GET                    | FTS5 global search across all content                |
| `/api/mcp`            | POST                   | Read-only MCP server (bearer token)                  |
| `/api/cards`          | GET                    | YGOPRODeck card lookup for the deck viewer           |
| `/api/backup`         | GET, POST              | Full data export (GET) / import (POST)               |
| `/share-target`       | POST                   | PWA share_target endpoint (Android share sheet)      |

## MCP Server (read-only)

MegaOrganize exposes a read-only [Model Context Protocol](https://modelcontextprotocol.io)
endpoint so an AI client can answer questions about your own data ("what did I
do last week?", "how much did I spend in August?", "find my notes on X").

It is a stateless Streamable HTTP server at `POST /api/mcp`. Every tool call is
scoped to one account; no tool can read or write another user's rows, and no
tool writes at all.

### Setup

Nothing to configure on the server. Each account authenticates with its own
email and password, so every user connects their own agent to their own data.
The endpoint URL is shown under **Edit Profile → AI Access**.

Send the credentials with every request, either as a bearer value or as HTTP
Basic auth:

```http
Authorization: Bearer you@example.com:your-password
Authorization: Basic <base64 of "you@example.com:your-password">
```

An email is locked out for 15 minutes after 10 failed attempts, and
authenticated calls are rate-limited per account (120/minute). The endpoint
never creates a session and never writes a row.

Because the client stores the password, a leaked client config is a leaked
account, not just read access. Change the password to revoke access everywhere.

### OpenCode

Keep the credential in the environment rather than in the JSON file:

```sh
export MEGAORGANIZE_MCP_CREDENTIALS="you@example.com:your-password"
```

```jsonc
// opencode.json
{
	"$schema": "https://opencode.ai/config.json",
	"mcp": {
		"megaorganize": {
			"type": "remote",
			"url": "https://your.domain/api/mcp",
			"oauth": false,
			"headers": {
				"Authorization": "Bearer {env:MEGAORGANIZE_MCP_CREDENTIALS}"
			}
		}
	}
}
```

### Claude Code

```jsonc
// .mcp.json
{
	"mcpServers": {
		"megaorganize": {
			"type": "http",
			"url": "https://your.domain/api/mcp",
			"headers": {
				"Authorization": "Bearer ${MEGAORGANIZE_MCP_CREDENTIALS}"
			}
		}
	}
}
```

Any other Streamable HTTP MCP client works the same way: POST to `/api/mcp`
with an `Authorization` header holding `email:password`.

### Tools

| Tool                     | What it returns                                                    |
| ------------------------ | ------------------------------------------------------------------ |
| `search`                 | Full-text hits across pages, items, reminders, expenses, training  |
| `list_categories`        | Categories in display order, with their pages                      |
| `list_pages`             | Pages, newest first; filter by category or text                    |
| `get_page`               | Page markdown, category, nested children, backlinks, attachments   |
| `list_items`             | Nodes/items; filter by type, tag, favorite, text, or date          |
| `get_item`               | Item markdown, tags, parents, children, backlinks, metadata        |
| `list_tags`              | Tags with item and expense counts                                  |
| `list_reminders`         | Reminders with todo checklists; pending/completed/all, date range  |
| `list_expenses`          | Expenses with total and count for the filter                       |
| `finance_summary`        | Monthly spending totals, currency, monthly limit                   |
| `list_training_sessions` | Sessions with activity types and total duration                    |
| `get_training_session`   | Activities, linked items, exercise records, running metrics        |
| `timeline`               | Merged activity feed for a date range ("what did I do last week")  |
| `get_stats`              | Training, spending, habit streaks, counts, pending reminders, note |

## Scripts

| Script           | Description                |
| ---------------- | -------------------------- |
| `bun run dev`    | Start development server   |
| `bun run build`  | Production build           |
| `bun run lint`   | Check formatting + linting |
| `bun run format` | Auto-format code           |
| `bun run check`  | Svelte type checking       |

## Deploying (Docker)

1. **Back up first**: Settings → Backup export, plus a file copy of `local.db`
   and `static/uploads`.
2. `git pull`, then set `.env`: `ORIGIN=https://your.domain`, and for Web Push
   generate keys with `bunx web-push generate-vapid-keys` into
   `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`. Without the
   VAPID keys the app runs but push stays off (in-app notifications only).
3. **One-time, if you have existing uploads** (uploads moved from
   `static/uploads` to `data/uploads`; old files stay readable but new ones
   go to the new folder):
   `mkdir -p data/uploads && cp -a static/uploads/. data/uploads/`
4. `docker compose up -d --build`. Migrations apply automatically at startup
   and the full-text search index self-builds on first boot. No cron needed:
   the reminder scheduler runs in-process.
5. Verify: login works, search finds body text, `/favicon.ico` returns 200,
   Settings → Push shows "Enable on this device", and a test reminder
   notifies.
6. On phones, remove and re-add the PWA to refresh the icons, launcher
   shortcuts, and share-sheet target, then enable push per device.

## Environment Variables

See `.env.example` for required variables:

- `DATABASE_URL` — SQLite connection string (default: `file:local.db`)
- `BETTER_AUTH_SECRET` — Secret for auth sessions
- `ORIGIN` — App origin URL (default: `http://localhost:5173`)
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — Web Push keys (generate with
  `bunx web-push generate-vapid-keys`); without them push is disabled and
  reminders notify only while the app is open
- `VAPID_SUBJECT` — Contact for push service operators (e.g. `mailto:you@example.com`)
