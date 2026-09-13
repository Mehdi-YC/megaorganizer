#!/bin/sh
set -e
bun run db:push
exec bun run dev --host 0.0.0.0
