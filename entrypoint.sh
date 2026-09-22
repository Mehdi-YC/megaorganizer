#!/bin/sh
set -e

# Ensure the database directory exists before migrating. libsql cannot create
# the file if its parent directory is missing (SQLITE_CANTOPEN / error 14).
DB_PATH="${DATABASE_URL#file:}"
DB_DIR="$(dirname "$DB_PATH")"
mkdir -p "$DB_DIR"

# Apply database migrations (non-interactive)
bun run db:migrate

# Start the production server
exec bun ./build/index.js
