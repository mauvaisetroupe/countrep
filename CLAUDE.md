# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

CountRep is an offline-first PWA for logging daily exercise repetitions (bodyweight / resistance band). Two independent npm packages, no workspace tooling:

- `frontend/` — Vue 3 + TypeScript, Vite, Pinia, Vue Router, Tailwind 4, Dexie (IndexedDB), `vite-plugin-pwa`
- `backend/` — Fastify 5 + raw SQL via `pg` (no ORM), JWT auth, Google sign-in (`google-auth-library`)

Production: `https://countrep.architech.lu` (Cloudflare → Nginx + systemd `countrep-api` on a Proxmox LXC, built and deployed from a git clone in `/opt/countrep`; see `docs/deployment.md`). Frontend and backend deploy together, but installed PWAs keep running their cached frontend until the user accepts the update prompt, so keep API changes backward compatible. Comments and log messages are mostly in French; UI text is translated (French / English, ADR 0009).

## Commands

```bash
# frontend (Vite dev server on :5173, exposed on LAN via server.host)
cd frontend && npm run dev
cd frontend && npm run build     # vue-tsc -b && vite build — this is the type check
cd frontend && npm run build:android   # Capacitor app: vite build --mode android (.env.android) + cap sync

# backend (Fastify on 0.0.0.0:3000)
cd backend && npm run dev        # tsx watch src/server.ts (restarts on change)
cd backend && npm run build      # tsc → dist/
```

There are no tests and no linter configured. Use `npm run build` in each package to type-check.

## Configuration

- `backend/.env` (gitignored, loaded by `dotenv` in `src/db.ts`): `DATABASE_HOST/PORT/NAME/USER/PASSWORD`, `JWT_SECRET`, `EXPECTED_ORIGIN` (production origin added to the CORS allow-list), `GOOGLE_CLIENT_IDS` (accepted Google OAuth client ids, comma-separated, ADR 0013).
- `frontend/.env.development` (and the local, gitignored `.env.production`): `VITE_API_URL` points to the LAN backend, `VITE_GOOGLE_WEB_CLIENT_ID` is the Google OAuth web client id (public; Google Cloud project in Testing mode, test users only). Google rejects `http://` origins on an IP address: test Google sign-in on `http://localhost:5173`. Production is built on the server, where the API is same-origin under `/api` behind Nginx.
- CORS allow-list is hard-coded in `backend/src/server.ts`; update it when the dev host changes.
- `backend/schema.sql` is the full current schema (reference, from a dump). `backend/database.sql` holds GRANTs for the `countrep_app` role and ad-hoc dated migrations. Schema changes are applied manually: append the migration to `database.sql` with a date comment **and** update `schema.sql`.
- Exercises have a `unit` (`reps` | `seconds`, ADR 0008): for a `seconds` exercise, `sets.reps` and `workout_exercises.reps` hold seconds. Use `frontend/src/units.ts` to format values and `composables/useExerciseUnits.ts#unitOf` when only the exercise id is known; never add reps and seconds together.
- DB constraints the client must respect or a pending set gets stuck (server 500): `reps` integer > 0, `exercise` must exist in `exercises` (FK).

## Architecture

### Domain vocabulary (ADR 0006)

- **set**: one logged entry — one exercise, N reps, at a date and time (table `sets`, `/api/sets`, Dexie `sets`). French UI: « saisie » / « série ».
- **workout**: a template — ordered exercises with target reps, repeated `rounds` times (tables `workouts` + `workout_exercises`, `/api/workouts`). French UI: « séance ».
- **round**: one pass through all exercises of a workout. French UI: « série ».
- **preview**: the workout session in progress, a local draft until saved.

The IndexedDB database is still named `WorkoutDatabase` (renaming it would create an empty database); ADRs 0002–0004 predate the vocabulary and say « workout » for a set.

### Offline-first set data flow

IndexedDB is the source of truth for the UI; the server is a sync target.

```
View → composables/useSets → repositories/setRepository → db.ts (Dexie)
                           ↘ services/sync.ts → api/sets.ts → Fastify → PostgreSQL
```

- Each `LocalSet` (`frontend/src/db.ts`) carries `syncStatus` (`pending`|`synced`) and `syncOperation` (`none`|`create`|`update`|`delete`). Local writes mark the record pending; `services/sync.ts#syncOne` dispatches on the operation, and `setRepository.markSynced` resets it only if `updatedAt` did not change during the request.
- A record never pushed keeps `syncOperation: 'create'` when edited, and is removed locally (no API call) when deleted. A PATCH that gets 404 is replayed as a create.
- Deletes are soft locally (`deletedAt` set, pending `delete`) until the server confirms; a 404 on DELETE counts as success. UI code must filter out `deletedAt` records.
- `useSets().sync()` runs on mount and on the `online` event: push pending → pull all from server → reload. Pull never overwrites a pending local record, and removes local `synced` records missing on the server.
- IDs are client-generated UUIDs; the server `POST` is an idempotent upsert on `id` (scoped to `user_id`), so creates can be replayed safely.
- Timestamps cross the API as epoch milliseconds; the backend converts with `to_timestamp($n / 1000.0)`. `date` is `YYYY-MM-DD`, `time` is `HH:MM[:SS]` (Postgres `time`).
- Bump the Dexie `version(n)` in `db.ts` when changing indexed fields.
- Workout sessions on the home screen ("Séance" mode) are drafted in the Dexie `previews` table (`composables/usePreview.ts`): nothing reaches `sets` until the user saves from `/preview`, which converts the entries to pending sets and deletes the draft in one transaction. The saved sets carry the preview id as `sessionId` (`sets.session_id`, NULL for single sets; ADR 0007) and the workout name as `sessionName` (ADR 0011). The journal groups sets by session; "Modifier" reopens a saved session as a preview (`usePreview().openForEdit`, `preview.editing`), and saving it updates/creates/deletes its sets (`previewRepository.commitEdit`). Round n of an exercise is its n-th entry (rounds are not stored).

Everything works without an account and without network (ADR 0014): no API call unless a valid session exists (`services/dataSync.ts#canSync`, also guarding every function of `services/sync.ts`). The exercise catalog is embedded (`frontend/src/data/exercises.json`, regenerate with `node scripts/update-catalog.mjs` from `frontend/` after any change to the `exercises` table — `catalog.ts`, `composables/useExerciseUnits.ts`). Workout templates (Dexie `workouts`, client UUIDs, pushed with `PUT /api/workouts/:id` upsert) and the exercise selection (Dexie `userExercises`, `PUT /api/user/exercises`, max `MAX_EXERCISES = 10`, duplicated in frontend and backend — keep them in sync) are local first, synced by `services/dataSync.ts` and exposed by the shared composables `useWorkouts` / `useUserExercises`.

### Auth

- Google sign-in only (ADR 0013, passkeys removed): `services/auth.ts#signInWithGoogle` gets a Google ID token through `@capgo/capacitor-social-login` (web popup, native on Android) and posts it to `POST /api/auth/google` (`backend/src/routes/auth.ts`), which verifies it against `GOOGLE_CLIENT_IDS`, finds or creates the user by `users.google_sub` (no email stored) and issues a 7-day JWT `{ userId }`. On the web the plugin's OAuth popup returns to `redirectUrl` = origin + `/`, which must be listed in the Google client's authorized redirect URIs.
- Sliding session: `POST /api/auth/refresh` swaps a valid token for a fresh one; `services/session.ts#ensureFreshToken` calls it once the token is over a day old (app start, `visibilitychange`, before each sync).
- Frontend stores the token in `localStorage` (`stores/auth.ts`); `isAuthenticated` checks the JWT `exp` client-side.
- Local data belongs to one account at a time (`localStorage` `countrep.owner`, set by `setToken`, absent until the first sign-in). Logins must call `services/session.ts#prepareLocalDataFor(token)` before `setToken`: data without owner is adopted by the account and pushed; another account's data is wiped (with confirmation if pending). Logout must go through `logoutSafely({ wipe })`: without `wipe` the data stays on the device (the app keeps working locally); with `wipe`, sync attempt, confirmation, then `authStore.logout({ wipe: true })` deletes the whole IndexedDB (ADR 0014).
- All authenticated calls go through `api/client.ts#apiFetch`, which adds the bearer token and, on 401, calls `authStore.markSessionExpired()` (drops the token, keeps IndexedDB); the app keeps working locally and Settings › Account invites to sign in again.
- Backend protection: `verifyJWT` (`middleware/auth.ts`) as an `onRequest` hook per route plugin (whole plugin in `sets.ts` and `workouts.ts`, a nested `register` scope in `exercises.ts`, `preHandler` on individual auth routes). It sets `request.userId`; every query must filter by `user_id`.
- No screen requires an account; `router.beforeEach` in `frontend/src/router/router.ts` only sends a signed-in user away from `/login`.

### Frontend UI

- Views: `today` (calendar + exercise selector + rep entry modal), `journal`, `stats`, `profile`, `login`; bottom nav in `App.vue`.
- Theme (ADR 0010): same look as the user's Step Challenge app. Colors are CSS variable tokens in `frontend/src/style.css` exposed to Tailwind (`bg-background`, `bg-surface`, `bg-card`, `bg-surface-alt`, `border-line`, `text-fg`, `text-fg-secondary`, `text-fg-muted`, `bg-primary`, `text-on-primary`, `bg-primary-soft`, `text-danger`…): never hard-code a color (`gray-*`, `amber-*`, hex), it breaks dark mode. Light/dark/system preference per device (`src/appearance.ts`, `localStorage` `countrep.appearance`, `.dark` on `<html>`, pre-applied in `index.html`). Flat style: cards `bg-surface rounded-xl` without border, Material icons in the bottom nav (`components/NavIcon.vue`).
- Icons: master SVG `icons/app-icon-foreground.svg` (editable in Inkscape); run `python3 icons/export-app-icons.py` to regenerate `frontend/public/icons/*` and `icons/playstore-icon.png`.
- i18n (ADR 0009): `vue-i18n`, messages in `frontend/src/i18n/fr.ts` and `en.ts` (typed on `fr.ts`, keep keys in sync). Never hard-code UI text; use `t()` (`useI18n`) in components and `i18n.global.t` elsewhere. Exercise names via `i18n/index.ts#exerciseName`, dates via `dateLocale()`. Language preference is per device (`localStorage` `countrep.locale`, Réglages › Langue, default system).
- `stores/exercise.ts` persists the selected exercise in `localStorage`; `ExerciseSelector` is a controlled component (`v-model`) and is not coupled to the store.
- Exercise illustrations are static files at `frontend/public/exercises/<exercise-id>.jpg`, the filename must match the exercise `id`.
- `__GIT_HASH__` is injected at build time by `vite.config.ts`; PWA updates use `registerType: 'prompt'` (`composables/usePwaUpdate.ts`). The Android app (Capacitor, ADR 0012, `frontend/android/` versioned and edited directly, app id `lu.architech.countrep`) is built with `--mode android`, which disables the PWA plugin: no service worker in the app, updates through the Store only (ADR 0015).

### Backend conventions

- One Fastify plugin per file in `backend/src/routes/`, registered in `server.ts`. ESM: local imports use the `.js` extension.
- SQL rows (snake_case) are mapped by hand to camelCase API objects in each route; request bodies are cast with `as`, no Fastify schemas.

## Architecture Decision Records

Significant decisions (API/schema/local-data contracts, security, anything costly to undo) are recorded as ADRs in `docs/adr/` (Nygard format, in French, numbered `NNNN-kebab-title.md`, index in `docs/adr/README.md`). Read the relevant ADRs before changing sync or auth behavior, and add a new ADR when making such a decision — never rewrite an accepted one, supersede it.

## Further reading

`architceture.md` (current architecture, English) and `architecture-review.md` (review and refactoring recommendations, French) describe layering intent in more depth.
