# MegaOrganize

A self-hostable personal knowledge, organization, activity, and tracking OS. Built with SvelteKit 2, Svelte 5, TypeScript, and SQLite.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | SvelteKit 2 + Svelte 5 (runes mode) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | SQLite via Drizzle ORM + LibSQL |
| Auth | Better Auth |
| Runtime | Bun |
| Markdown | Snarkdown (runtime) + mdsvex (dev) |

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
bun run db:push      # push schema changes to SQLite
bun run db:generate  # generate migration files
bun run db:migrate   # run pending migrations
bun run db:studio    # open Drizzle Studio
```

## Project Structure

```
src/
  lib/
    components/
      layout/          # Sidebar
      ui/              # Reusable UI components (Button, Dialog, ItemImage, etc.)
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

### Yu-Gi-Oh Deck Builder
- Import/export `.ydk` files
- Card lookup via YGOPRODeck API
- Visual deck viewer with responsive grid
- Card count badges and enlarged card modal with 3D tilt effect

### Training Tracker
- Session management (strength, running, cycling, walking, swimming)
- Running with GPS tracking, pace, elevation
- Calendar view and history
- Exercise records with sets, reps, weight, RPE

### Library
- Grid view of all items with tag and YDK filters
- Search across all content

### Tag System
- Create, edit, delete tags with custom colors
- Assign multiple items to tags
- Filter by tags in library

### Roadmap & Tier List
- Graph-based roadmaps with nodes and edges
- Drag-and-drop tier lists

## UI Components

Reusable components in `src/lib/components/ui/`:

| Component | Description |
|-----------|------------|
| `Button` | Styled button with variants |
| `Input` | Text input with consistent styling |
| `Textarea` | Multi-line text input |
| `Dialog` | Modal dialog |
| `Checkbox` | Styled checkbox |
| `Badge` | Status badge |
| `NavItem` | Navigation item |
| `ItemImage` | Auto small/large image display |
| `GridItemImage` | Grid card image with blur fallback |
| `EmptyState` | Empty state placeholder |
| `PageHeader` | Page title + actions layout |
| `SearchInput` | Search input with icon |
| `TagChips` | Colored tag pills |
| `ConfirmButton` | Two-click delete confirmation |

## API Endpoints

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/categories` | GET, POST, PUT, DELETE | Category CRUD |
| `/api/pages` | GET, POST, PUT, DELETE | Page CRUD |
| `/api/tree` | GET, POST, PUT, DELETE | Tree elements, search, relationships |
| `/api/tags` | GET, POST, PUT, DELETE | Tag CRUD |
| `/api/training` | GET, POST, PUT, DELETE | Training sessions & activities |
| `/api/running` | GET, POST | Running activities & GPS data |

## Scripts

| Script | Description |
|--------|------------|
| `bun run dev` | Start development server |
| `bun run build` | Production build |
| `bun run lint` | Check formatting + linting |
| `bun run format` | Auto-format code |
| `bun run check` | Svelte type checking |

## Environment Variables

See `.env.example` for required variables:

- `DATABASE_URL` — SQLite connection string (default: `file:local.db`)
- `BETTER_AUTH_SECRET` — Secret for auth sessions
- `ORIGIN` — App origin URL (default: `http://localhost:5173`)
