# syntax=docker/dockerfile:1

# Application image (ADR 0017, docs/exploitation.md): the API and the
# built frontend (PWA), served on the same origin by the API. Migrations
# are applied by the migration image (backend/migrations/Dockerfile)
# before the API starts.

ARG NODE_IMAGE=node:24.22.1-trixie-slim

# The dependencies are pure JavaScript: building on the platform of the
# build machine gives the same files for amd64 and arm64, without
# emulation.
FROM --platform=$BUILDPLATFORM ${NODE_IMAGE} AS frontend
# Public, read at build time (ADR 0013): the OAuth web client of the
# Google Cloud project countrep, the same as in frontend/.env.android.
ARG VITE_GOOGLE_WEB_CLIENT_ID=14127079549-o2h7n8qpjnru8v257fpqkjo8mppluqfo.apps.googleusercontent.com
# Shown in the settings; given by the CI, no git in the build.
ARG GIT_HASH=dev
ENV VITE_GOOGLE_WEB_CLIENT_ID=${VITE_GOOGLE_WEB_CLIENT_ID} \
    GIT_HASH=${GIT_HASH}
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
# No VITE_API_URL: the API is on the same origin, under /api.
RUN npm run build

FROM --platform=$BUILDPLATFORM ${NODE_IMAGE} AS backend
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npx tsc

FROM --platform=$BUILDPLATFORM ${NODE_IMAGE} AS dependencies
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM ${NODE_IMAGE}
ENV NODE_ENV=production
WORKDIR /app
COPY backend/package.json ./
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=backend /app/dist ./dist
COPY --from=frontend /app/dist ./public
# Read at start: the highest migration is the schema version required.
COPY backend/migrations/*.sql ./migrations/
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.PORT || 3000}/api/health/db`).then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "dist/server.js"]
