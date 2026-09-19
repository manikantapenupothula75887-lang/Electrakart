# syntax=docker/dockerfile:1
# ==========================================
# ElectraKart Backend Production Dockerfile
# Multi-stage build with unprivileged node user
# ==========================================

# ------------------------------------------
# Stage 1: Build & compile TypeScript
# ------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies needed for compiling native modules if any
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript and copy migration SQL assets to dist
RUN npm run build

# ------------------------------------------
# Stage 2: Production runtime image
# ------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000
ENV HOST=0.0.0.0

# Install curl for container healthcheck
RUN apk add --no-cache curl

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy compiled JavaScript output and migration files from builder
COPY --from=builder /app/dist ./dist

# Create logs directory and assign permissions to non-root user
RUN mkdir -p /app/logs && chown -R node:node /app

# Switch to unprivileged user
USER node

EXPOSE 5000

# Container liveness healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/v1/health || exit 1

CMD ["node", "dist/server.js"]
