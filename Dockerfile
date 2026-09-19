# syntax=docker/dockerfile:1
# ==========================================
# ElectraKart Frontend Production Dockerfile
# Multi-stage build with optimized Nginx SPA server
# ==========================================

# ------------------------------------------
# Stage 1: Build React 19 SPA
# ------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Build arguments for Vite environment variables
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_ALLOW_DEMO_FALLBACK=false

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_ALLOW_DEMO_FALLBACK=$VITE_ALLOW_DEMO_FALLBACK

COPY package*.json ./
RUN npm ci

COPY . .

# Run Vite production bundle build
RUN npm run build

# ------------------------------------------
# Stage 2: Serve with Nginx Alpine
# ------------------------------------------
FROM nginx:1.27-alpine AS runner

# Remove default Nginx site configuration
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copy custom ElectraKart Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy production SPA build assets
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
