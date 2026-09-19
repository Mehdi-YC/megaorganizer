FROM oven/bun:1 AS base

WORKDIR /app

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

# Install dependencies (production only)
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# Copy built files
COPY --from=base /app/build ./build
COPY --from=base /app/package.json ./

# Create uploads directory
RUN mkdir -p static/uploads

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["bun", "run", "build/index.js"]