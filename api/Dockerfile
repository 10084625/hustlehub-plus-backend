# syntax=docker/dockerfile:1
# HustleHub+ API image (Part 3)
# Multi-stage: dependencies are installed in one stage and only the result is
# copied into a small, locked-down runtime image.

# ---- 1. Production dependencies only (no test tools in the final image)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# ---- 2. Runtime
FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    PORT=5000 \
    LOG_FORMAT=json \
    LOG_LEVEL=http \
    LOG_DIR=/app/logs
WORKDIR /app

# Security hardening:
#  - apply the latest Alpine security patches
#  - remove npm, npx, corepack and yarn: the app never needs a package
#    manager at runtime, and removing them shrinks the attack surface (and
#    the bundled copies of their own dependencies that scanners flag)
RUN apk upgrade --no-cache \
 && rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx \
           /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn-* \
 && mkdir -p /app/logs /app/certs \
 && chown node:node /app/logs

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json healthcheck.js ./
COPY --chown=node:node src ./src
COPY --chown=node:node scripts ./scripts

# Never run as root inside the container
USER node
EXPOSE 5000

HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=6 CMD ["node", "healthcheck.js"]
CMD ["node", "src/server.js"]
