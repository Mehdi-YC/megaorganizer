#!/bin/sh
set -e

# --- Diagnostics: print a redacted view of the runtime config ----------------
REDACTED_DB_URL=$(printf '%s' "$DATABASE_URL" | sed -E 's#(://[^@/]*@)#://***@#; s#([?&](authToken|token|password|secret)=)[^&]*#\1***#gi')
echo "entrypoint: DATABASE_URL=${REDACTED_DB_URL}"
echo "entrypoint: ORIGIN=${ORIGIN}"

# --- Ensure the database directory exists before migrating. libsql cannot ---
# --- create the file if its parent directory is missing (SQLITE_CANTOPEN). ---
DB_PATH="${DATABASE_URL#file:}"
DB_DIR="$(dirname "$DB_PATH")"
mkdir -p "$DB_DIR" data/uploads static/uploads
echo "entrypoint: db dir = $DB_DIR"
[ -w "$DB_DIR" ] || { echo "ERROR: db directory is not writable: $DB_DIR"; exit 1; }

# --- Pre-flight: verify the database can actually be opened ------------------
if ! DATABASE_URL="$DATABASE_URL" bun -e '
  const { createClient } = require("@libsql/client");
  const client = createClient({ url: process.env.DATABASE_URL });
  client.execute("SELECT 1")
    .then(() => { console.log("db open: OK"); process.exit(0); })
    .catch((err) => { console.error("db open: FAILED ->", err.message); process.exit(1); });
'; then
  exit 1
fi

# Apply database migrations (non-interactive). This runs the same migrator
# drizzle-kit uses, but heals stale journal timestamps (prevents re-running
# already-applied migrations, which died with "table already exists") and
# prints real error messages instead of hiding them behind a spinner.
bun ./migrate.mjs

# Start the production server
exec bun ./build/index.js