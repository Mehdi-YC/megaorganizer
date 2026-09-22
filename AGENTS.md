# PR evidence rule

Every PR must show what changed:

- Visual change → before/after screenshots (mobile + desktop viewport when layout is involved), captured at both revisions with the same seeded data.
- Behavior / performance / non-visual → before/after metric table (the number that proves the change).
- File or structure change → before/after tree (or `wc -l`).

Host images as assets on a draft release (`evidence/pr-<n>`) and embed by release URL. Never commit evidence artifacts.

# Commands

- `bun run check` — svelte-check, must stay 0 errors / 0 warnings.
- `bunx eslint src` / `bunx prettier --check .` — `bun run lint` gate.
- Prod smoke: build the Dockerfile, run with `DATABASE_URL=file:/app/data/local.db`, `BETTER_AUTH_SECRET`, `ORIGIN`.
- Build-time env: `vite build` evaluates the server graph, so `DATABASE_URL` and `BETTER_AUTH_SECRET` must be set when building.
