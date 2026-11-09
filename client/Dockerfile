# syntax=docker/dockerfile:1
# HustleHub+ React app image (Part 3)
# Stage 1 builds the static files with Vite. Stage 2 serves them with nginx
# (running as a non-root user) over HTTPS, adds the security headers and CSP,
# and forwards /api to the API container over HTTPS.

# ---- 1. Build
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

# ---- 2. Serve
FROM nginxinc/nginx-unprivileged:1.28-alpine AS runtime
USER root
RUN apk upgrade --no-cache && rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/hustlehub.conf
COPY nginx/ /etc/nginx/snippets/
COPY --from=build /app/dist /usr/share/nginx/html
# nginx-unprivileged runs as user 101 (not root)
USER 101
EXPOSE 8443

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=6 \
  CMD wget -q -O /dev/null http://127.0.0.1:8081/healthz || exit 1
