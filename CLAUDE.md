# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

CountRep is an offline-first PWA for logging daily exercise repetitions (bodyweight / resistance band). Two independent npm packages, no workspace tooling:

- `frontend/` — Vue 3 + TypeScript, Vite, Pinia, Vue Router, Tailwind 4, Dexie (IndexedDB), `vite-plugin-pwa`
- `backend/` — Fastify 5 + raw SQL via `pg` (no ORM), JWT auth, WebAuthn passkeys (`@simplewebauthn`)

Production: `https://countrep.architech.lu`. UI text, comments and log messages are mostly in French.

## Commands

```bash
# frontend (Vite dev server on :5173, exposed on LAN via server.host)
cd frontend && npm run dev
cd frontend && npm run build     # vue-tsc -b && vite build — this is the type check

# backend (Fastify on 0.0.0.0:3000)
cd backend && npm run dev        # tsx src/server.ts
cd backend && npm run build      # tsc → dist/
```

There are no tests and no linter configured. Use `npm run build` in each package to type-check.

## Configuration

- `backend/.env` (gitignored, loaded by `dotenv` in `src/db.ts`): `DATABASE_HOST/PORT/NAME/USER/PASSWORD`, `JWT_SECRET`, `RP_ID` (WebAuthn relying party, default `localhost`), `EXPECTED_ORIGIN` (WebAuthn origin + CORS).
- `frontend/.env.development`: `VITE_API_URL` points to the backend (LAN IP). In production `VITE_API_URL` is empty and the API is served same-origin under `/api`.
- CORS allow-list is hard-coded in `backend/src/server.ts`; update it when the dev host changes.
- `backend/schema.sql` is the full current schema (reference, from a dump). `backend/database.sql` holds GRANTs for the `countrep_app` role and ad-hoc dated migrations. Schema changes are applied manually: append the migration to `database.sql` with a date comment **and** update `schema.sql`.
- DB constraints the client must respect or a pending workout gets stuck (server 500): `reps` integer > 0, `exercise` must exist in `exercises` (FK).

## Architecture

### Offline-first workout data flow

IndexedDB is the source of truth for the UI; the server is a sync target.

```
View → composables/useWorkouts → repositories/workoutRepository → db.ts (Dexie)
                               ↘ services/sync.ts → api/workouts.ts → Fastify → PostgreSQL
```

- Each `LocalWorkout` (`frontend/src/db.ts`) carries `syncStatus` (`pending`|`synced`) and `syncOperation` (`none`|`create`|`update`|`delete`). Local writes mark the record pending; `services/sync.ts#syncOne` dispatches on the operation, and `workoutRepository.markSynced` resets it only if `updatedAt` did not change during the request.
- A record never pushed keeps `syncOperation: 'create'` when edited, and is removed locally (no API call) when deleted. A PATCH that gets 404 is replayed as a create.
- Deletes are soft locally (`deletedAt` set, pending `delete`) until the server confirms; a 404 on DELETE counts as success. UI code must filter out `deletedAt` records.
- `useWorkouts().sync()` runs on mount and on the `online` event: push pending → pull all from server → reload. Pull never overwrites a pending local record, and removes local `synced` records missing on the server.
- IDs are client-generated UUIDs; the server `POST` is an idempotent upsert on `id` (scoped to `user_id`), so creates can be replayed safely.
- Timestamps cross the API as epoch milliseconds; the backend converts with `to_timestamp($n / 1000.0)`. `date` is `YYYY-MM-DD`, `workoutTime` is `HH:MM[:SS]` (Postgres `time`).
- Bump the Dexie `version(n)` in `db.ts` when changing indexed fields.

Exercises are **not** offline: `composables/useExercises.ts` (module-level shared refs) fetches the public catalog (`GET /api/exercises`) and the user's selection (`/api/user/exercises`, max `MAX_EXERCISES = 10`, duplicated in frontend and backend — keep them in sync).

### Auth

- Passwordless: WebAuthn register/login in `backend/src/routes/auth.ts` issues a 7-day JWT `{ userId }`. Additional devices are registered via `/api/auth/add-device*` while authenticated.
- Sliding session: `POST /api/auth/refresh` swaps a valid token for a fresh one; `services/session.ts#ensureFreshToken` calls it once the token is over a day old (app start, `visibilitychange`, before each sync).
- Frontend stores the token in `localStorage` (`stores/auth.ts`); `isAuthenticated` checks the JWT `exp` client-side.
- Local data belongs to one account at a time (`localStorage` `countrep.owner`, set by `setToken`). Logins must call `services/session.ts#prepareLocalDataFor(token)` before `setToken` (wipes another account's data, with confirmation if pending). Logout must go through `logoutSafely()` (sync attempt + confirmation) — `authStore.logout()` deletes the whole IndexedDB.
- All authenticated calls go through `api/client.ts#apiFetch`, which adds the bearer token and, on 401, calls `authStore.markSessionExpired()` (drops the token, keeps IndexedDB); `App.vue` then redirects to login.
- Backend protection: `verifyJWT` (`middleware/auth.ts`) as an `onRequest` hook per route plugin (whole plugin in `workouts.ts`, a nested `register` scope in `exercises.ts`, `preHandler` on individual auth routes). It sets `request.userId`; every query must filter by `user_id`.
- Route guarding lives in `router.beforeEach` in `frontend/src/router/router.ts` (routes use `meta.requiresAuth`).

### Frontend UI

- Views: `today` (calendar + exercise selector + rep entry modal), `journal`, `stats`, `profile`, `login`; bottom nav in `App.vue`.
- `stores/exercise.ts` persists the selected exercise in `localStorage`; `ExerciseSelector` is a controlled component (`v-model`) and is not coupled to the store.
- Exercise illustrations are static files at `frontend/public/exercises/<exercise-id>.jpg`, the filename must match the exercise `id`.
- `__GIT_HASH__` is injected at build time by `vite.config.ts`; PWA updates use `registerType: 'prompt'` (`composables/usePwaUpdate.ts`).

### Backend conventions

- One Fastify plugin per file in `backend/src/routes/`, registered in `server.ts`. ESM: local imports use the `.js` extension.
- SQL rows (snake_case) are mapped by hand to camelCase API objects in each route; request bodies are cast with `as`, no Fastify schemas.

## Architecture Decision Records

Significant decisions (API/schema/local-data contracts, security, anything costly to undo) are recorded as ADRs in `docs/adr/` (Nygard format, in French, numbered `NNNN-kebab-title.md`, index in `docs/adr/README.md`). Read the relevant ADRs before changing sync or auth behavior, and add a new ADR when making such a decision — never rewrite an accepted one, supersede it.

## Further reading

`architceture.md` (current architecture, English) and `architecture-review.md` (review and refactoring recommendations, French) describe layering intent in more depth.
