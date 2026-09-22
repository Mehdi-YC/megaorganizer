#!/bin/sh
set -e

# Apply database migrations (non-interactive)
bun run db:migrate

# Start the production server
exec bun ./build/index.js
