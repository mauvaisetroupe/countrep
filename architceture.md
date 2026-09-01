# CountRep — Current Architecture

> Current state of the architecture after introducing the `WorkoutRepository`.

## 1. Overview

CountRep is a Vue 3 / TypeScript application built around an **offline-first** approach.

The core principle is:

> User data is persisted locally in IndexedDB first. Synchronization with the backend happens afterwards, when the network is available.

The current architecture is organized around several main areas:

```text
Frontend Vue 3
      │
      ├── UI / Views / Components
      │
      ├── Composables
      │
      ├── Pinia Stores
      │
      ├── Local Repository
      │
      ├── Synchronization
      │
      └── HTTP API
                │
                ▼
          Fastify Backend
                │
                ▼
            PostgreSQL
```

---

# 2. Frontend Architecture

Current structure:

```text
frontend/src/

├── api/
│   └── workouts.ts
│
├── components/
│   └── ExerciseSelector.vue
│
├── composables/
│   └── useWorkouts.ts
│
├── db.ts
│
├── exercises.ts
│
├── repositories/
│   └── workoutRepository.ts
│
├── services/
│   └── sync.ts
│
├── stores/
│   ├── auth.ts
│   └── exercise.ts
│
└── views/
    └── TodayView.vue
```

---

# 3. `TodayView.vue`

`TodayView.vue` is the main view used to add workouts and display repetitions in a calendar.

Its current responsibilities include:

* displaying the calendar;
* managing the displayed month;
* managing the selected date;
* displaying repetitions per day;
* displaying the exercise selector;
* managing the add-workout modal;
* handling repetition input;
* creating a `LocalWorkout`;
* asking `useWorkouts` to create the workout;
* currently triggering its synchronization.

The component uses:

```text
TodayView.vue
    │
    ├── ExerciseSelector
    │
    ├── useExerciseStore
    │
    └── useWorkouts
```

### Important

The view no longer knows about IndexedDB directly.

It no longer performs:

```ts
db.workouts.add(...)
```

Instead, it uses:

```ts
createWorkout(workout)
```

provided by `useWorkouts`.

---

# 4. `ExerciseSelector.vue`

The `ExerciseSelector` component is responsible for displaying and selecting an exercise.

It uses:

```text
ExerciseSelector.vue
        │
        ▼
useExerciseStore()
        │
        ▼
localStorage
```

The available exercises are currently defined in:

```text
exercises.ts
```

The component displays:

* short exercise name;
* icon;
* exercise name;
* currently selected exercise.

---

# 5. `exercise` Store

The Pinia store:

```text
stores/exercise.ts
```

manages the exercise currently selected by the user.

The selection is persisted in:

```text
localStorage
```

Main state:

```ts
selectedExercise: string | null
```

The storage flow is:

```text
Pinia
  │
  └── localStorage
```

---

# 6. `auth` Store

The store:

```text
stores/auth.ts
```

currently handles:

* JWT token;
* authentication state;
* login/logout state management;
* clearing local data during logout.

The token is stored in:

```text
localStorage
```

using the key:

```text
countrep.token
```

During logout, the `WorkoutDatabase` IndexedDB database is also deleted.

The current flow is:

```text
Auth Store
   │
   ├── token
   │
   └── localStorage
```

---

# 7. `useWorkouts`

The composable:

```text
composables/useWorkouts.ts
```

is currently the main entry point used by views to interact with workouts.

It exposes:

```ts
workouts
loading
loadWorkouts()
createWorkout()
sync()
```

Its current responsibilities are:

1. maintain the reactive workout state;
2. load workouts through the local repository;
3. create workouts locally;
4. trigger synchronization;
5. listen for the browser coming back online;
6. trigger synchronization when the composable is mounted.

Architecture:

```text
useWorkouts
    │
    ├── reactive state
    │
    ├── WorkoutRepository
    │
    └── sync.ts
```

---

# 8. `WorkoutRepository`

The repository was introduced to centralize IndexedDB access.

File:

```text
repositories/workoutRepository.ts
```

It currently exposes:

```ts
getAll()
create()
update()
getPending()
saveSynced()
```

Its responsibility is to encapsulate Dexie.

Architecture:

```text
useWorkouts
      │
      ▼
WorkoutRepository
      │
      ▼
Dexie
      │
      ▼
IndexedDB
```

This separation means that higher-level layers no longer need to know about:

* Dexie;
* `db.workouts`;
* IndexedDB storage details.

---

# 9. Local IndexedDB

Current file:

```text
db.ts
```

The local database is implemented using Dexie.

Database name:

```text
WorkoutDatabase
```

It currently contains two tables:

```text
workouts
syncState
```

---

# 10. `LocalWorkout` Model

The current local workout model is:

```ts
interface LocalWorkout {
  id: string
  exercise: string
  date: string
  reps: number
  mode: 'add' | 'set'
  createdAt: number
  updatedAt: number
  deletedAt?: number | null
  syncStatus: 'pending' | 'synced'
}
```

The field:

```ts
syncStatus
```

is specific to local persistence and is currently used to determine whether a workout still needs to be synchronized.

Possible states:

```text
pending
synced
```

---

# 11. IndexedDB Indexes

The `workouts` table is currently indexed by:

```text
id
exercise
date
createdAt
updatedAt
syncStatus
```

This allows workouts to be queried by:

* ID;
* exercise;
* date;
* synchronization status.

---

# 12. Synchronization

Synchronization is currently implemented in:

```text
services/sync.ts
```

It exposes three main functions:

```ts
syncWorkout()
syncPendingWorkouts()
syncWorkoutsFromServer()
```

---

# 13. Synchronizing a Workout

The current flow is:

```text
LocalWorkout
      │
      ▼
syncWorkout()
      │
      ▼
createWorkout()
      │
      ▼
Backend
```

When the server request succeeds:

```text
syncStatus:
pending → synced
```

The local status is updated through:

```ts
workoutRepository.update(...)
```

---

# 14. Synchronizing Pending Workouts

`syncPendingWorkouts()`:

1. retrieves workouts where:

```ts
syncStatus === 'pending'
```

2. sends them to the backend one by one;
3. marks successful workouts as `synced`;
4. leaves failed workouts as `pending`.

The current behavior is:

```text
IndexedDB
   │
   └── pending workouts
           │
           ▼
     syncPendingWorkouts
           │
           ├── success → synced
           │
           └── error → remains pending
```

---

# 15. Synchronizing From the Server

`syncWorkoutsFromServer()` calls:

```text
GET /api/workouts
```

Each workout returned by the server is converted into a `LocalWorkout` and stored locally with:

```ts
syncStatus: 'synced'
```

The flow is:

```text
Backend
   │
   ▼
GET /api/workouts
   │
   ▼
ApiWorkout[]
   │
   ▼
LocalWorkout[]
   │
   ▼
WorkoutRepository
   │
   ▼
IndexedDB
```

---

# 16. Frontend API Layer

File:

```text
api/workouts.ts
```

This module currently contains the HTTP operations related to workouts:

```ts
createWorkout()
getWorkouts()
```

It directly uses:

```ts
fetch()
```

and builds HTTP headers, including:

```http
Authorization: Bearer <token>
```

The API base URL comes from:

```text
VITE_API_URL
```

---

# 17. Complete Workout Creation Flow

The current flow is:

```text
User
 │
 ▼
TodayView.vue
 │
 ▼
useWorkouts.createWorkout()
 │
 ▼
WorkoutRepository.create()
 │
 ▼
IndexedDB
 │
 ▼
TodayView
 │
 ▼
syncWorkout()
 │
 ▼
api/workouts.ts
 │
 ▼
HTTP POST
 │
 ▼
Fastify
 │
 ▼
PostgreSQL
```

The important property is that **local persistence happens before the network request**.

---

# 18. Offline Behavior

When the user is offline:

```text
User
 │
 ▼
TodayView
 │
 ▼
useWorkouts
 │
 ▼
WorkoutRepository
 │
 ▼
IndexedDB
```

The workout is stored locally with:

```ts
syncStatus: 'pending'
```

The API request fails, but this does not prevent the workout from existing locally.

When the network comes back:

```text
online event
     │
     ▼
useWorkouts.sync()
     │
     ▼
syncPendingWorkouts()
     │
     ▼
API
```

---

# 19. Backend

The backend uses:

```text
Fastify
```

with PostgreSQL as the persistent data store.

Current visible structure:

```text
backend/src/

├── server.ts
├── db.ts
├── middleware/
│   └── auth.ts
└── routes/
    ├── auth.ts
    ├── users.ts
    └── workouts.ts
```

---

# 20. `server.ts`

The server:

* initializes Fastify;
* configures CORS;
* enables logging;
* exposes health-check endpoints;
* registers routes;
* starts the HTTP server.

Workout routes are registered with:

```ts
app.register(workoutRoutes)
```

---

# 21. Backend Authentication

Workout routes use:

```ts
verifyJWT
```

through:

```ts
app.addHook('onRequest', verifyJWT)
```

The `userId` is therefore extracted server-side from the JWT.

The client does not determine the owner of a workout.

The flow is:

```text
JWT
 │
 ▼
verifyJWT
 │
 ▼
request.userId
 │
 ▼
PostgreSQL
```

---

# 22. Workout Routes

The backend currently exposes:

```http
POST /api/workouts
GET  /api/workouts
```

### POST

The server:

1. retrieves `userId` from the JWT;
2. reads the request body;
3. inserts the workout into PostgreSQL;
4. returns the created workout.

### GET

The server:

1. retrieves `userId` from the JWT;
2. retrieves the user's workouts;
3. returns them to the frontend.

---

# 23. PostgreSQL

The database currently contains:

```text
users
user_devices
workouts
```

Main relationship:

```text
users
  │
  └──< workouts
```

A workout belongs to a user through:

```text
workouts.user_id
        ↓
users.id
```

---

# 24. PostgreSQL `workouts` Model

The table currently contains:

```text
id
user_id
exercise
date
reps
mode
created_at
updated_at
deleted_at
```

It includes:

```sql
PRIMARY KEY (id)
```

and:

```sql
FOREIGN KEY (user_id)
REFERENCES users(id)
```

Therefore workouts are isolated per user at the database level.

---

# 25. Overall Data Model

There are currently three main representations of a workout:

```text
LocalWorkout
     │
     │ synchronization
     ▼
ApiWorkout
     │
     │ HTTP
     ▼
PostgreSQL workout
```

### `LocalWorkout`

Representation used by IndexedDB.

It contains local synchronization metadata such as:

```text
syncStatus
```

### `ApiWorkout`

Representation used by the HTTP API.

It additionally contains:

```text
userId
```

### PostgreSQL

Persistent server-side representation.

Dates are stored using PostgreSQL date/timestamp types and converted to the API representation when returned.

---

# 26. Current Architectural Boundaries

The current architecture now has several clear boundaries:

```text
UI
 │
 ▼
Composables
 │
 ▼
Repository
 │
 ▼
IndexedDB
```

and:

```text
Synchronization
 │
 ├── Repository
 │
 └── API
```

and:

```text
API
 │
 ▼
Fastify Routes
 │
 ▼
PostgreSQL
```

The most important boundary introduced so far is:

```text
Application code
      │
      ▼
WorkoutRepository
      │
      ▼
IndexedDB / Dexie
```

This means IndexedDB is now an implementation detail of the repository rather than something the UI and composables access directly.

---

# 27. Current Limitations

The architecture is functional, but several areas are intentionally still simple.

### Synchronization

The current synchronization strategy:

* downloads all workouts;
* does not use `SyncState.lastSync`;
* has no explicit conflict resolution;
* has no explicit versioning;
* does not yet implement a dedicated outbox;
* does not distinguish all types of retryable/permanent errors.

### API layer

The API layer currently performs its own:

```text
fetch
headers
authentication
response handling
```

There is no shared HTTP client yet.

### Backend

Workout routes currently contain:

* HTTP handling;
* request extraction;
* SQL;
* response mapping.

There is not yet a separate service/repository layer on the backend.

### Domain model

`LocalWorkout`, `ApiWorkout`, and the PostgreSQL representation are still closely related.

There is not yet a formal domain model separating these representations.

---

# 28. Current Architecture Diagram

The current system can therefore be summarized as:

```text
                         FRONTEND
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  TodayView.vue                                          │
│       │                                                 │
│       ▼                                                 │
│  useWorkouts                                            │
│       │                                                 │
│       ▼                                                 │
│  WorkoutRepository ────────────────┐                   │
│       │                             │                   │
│       ▼                             │                   │
│   IndexedDB                         │                   │
│                                     │                   │
│                                     ▼                   │
│                                services/sync            │
│                                     │                   │
│                              ┌──────┴──────┐            │
│                              ▼             ▼            │
│                         Repository     API client       │
│                                            │            │
└────────────────────────────────────────────┼────────────┘
                                             │
                                             │ HTTP
                                             ▼
                         BACKEND
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Fastify                                                │
│     │                                                   │
│     ▼                                                   │
│  JWT Authentication                                     │
│     │                                                   │
│     ▼                                                   │
│  /api/workouts                                          │
│     │                                                   │
│     ▼                                                   │
│  PostgreSQL                                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

# 29. Architectural Direction

The current architecture should be considered a **working intermediate state**.

The most important structural improvement already made is the introduction of:

```text
WorkoutRepository
```

which establishes a clear boundary around local persistence.

The next architectural improvements can be introduced incrementally without rewriting the application.

The likely next steps are:

```text
1. Shared HTTP client
        ↓
2. Better separation of synchronization
        ↓
3. Dedicated SyncEngine
        ↓
4. Incremental synchronization
        ↓
5. Idempotent mutations
        ↓
6. Conflict/version handling
        ↓
7. Backend service/repository separation
```

These are future architectural improvements and are **not yet part of the current implementation**.
