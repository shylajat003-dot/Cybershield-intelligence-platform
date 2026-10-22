FROM node:20-alpine AS builder

WORKDIR /app

# Copy backend package files first for layer caching
COPY backend/package*.json ./
RUN npm ci

# Copy backend source
COPY backend/ .

# Copy the database schema (init.sql) — needed at runtime for migrations
COPY database/ ./database/

# Build TypeScript → dist/
RUN npm run build

# ────────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY backend/package*.json ./
RUN npm ci --only=production

# Copy compiled JS output
COPY --from=builder /app/dist ./dist

# Copy database schema so migrate.ts can find it at /app/database/init.sql
COPY --from=builder /app/database ./database

EXPOSE 5000
CMD ["node", "dist/server.js"]
