#!/bin/sh
set -e

# Run database migrations
bun run db:push

# Start production server
exec bun run preview --host 0.0.0.0