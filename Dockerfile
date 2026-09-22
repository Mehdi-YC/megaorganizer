FROM oven/bun:1 AS base

WORKDIR /app

# The server module graph is evaluated during `vite build`, so these must be
# present at build time. They are supplied by docker-compose build args.
ARG DATABASE_URL=file:local.db
ARG BETTER_AUTH_SECRET
ENV DATABASE_URL=$DATABASE_URL
ENV BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET

# Install dependencies
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Build for production
RUN bun run build

# Production stage
FROM oven/bun:1-slim AS production

WORKDIR /app

# Install dependencies (production only). Runtime server packages
# (@libsql/client, better-auth, drizzle-orm, drizzle-kit) live in
# package.json `dependencies`, so they are available here.
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# Copy built files, migrations, and migration config
COPY --from=base /app/build ./build
COPY --from=base /app/package.json ./
COPY --from=base /app/drizzle ./drizzle
COPY --from=base /app/drizzle.config.ts ./drizzle.config.ts

# Entrypoint applies migrations, then starts the server
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Create uploads directory
RUN mkdir -p static/uploads

# Set environment
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
