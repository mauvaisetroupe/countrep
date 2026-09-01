# CountRep — Current Architecture

> This document describes the current architecture of CountRep.
>
> CountRep is an offline-first workout tracking application built with Vue 3, TypeScript, Fastify and PostgreSQL.

---

## 1. Architectural Overview

CountRep follows an **offline-first architecture**.

The frontend considers IndexedDB as the primary local persistence layer. Network communication with the backend is used to synchronize local data with the server.

The general architecture is:

```mermaid
flowchart TD
    User[User]

    subgraph Frontend["Frontend — Vue 3 / TypeScript"]
        UI[Views & Components]
        Composable[Composables]
        Stores[Pinia Stores]
        Repository[WorkoutRepository]
        IndexedDB[(IndexedDB / Dexie)]
        Sync[Sync Service]
        API[API Client]
    end

    subgraph Backend["Backend — Fastify"]
        Auth[JWT Authentication]
        Routes[HTTP Routes]
    end

    PostgreSQL[(PostgreSQL)]

    User --> UI
    UI --> Composable
    UI --> Stores

    Composable --> Repository
    Repository --> IndexedDB

    Composable --> Sync
    Sync --> Repository
    Sync --> API

    API --> Auth
    Auth --> Routes
    Routes --> PostgreSQL
```

The important architectural principle is:

> **Local persistence comes before network synchronization.**

---

# 2. Frontend Structure

The current frontend structure is:

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

The main responsibilities are currently distributed as follows:

| Layer        | Responsibility                                |
| ------------ | --------------------------------------------- |
| Views        | UI orchestration and user interactions        |
| Components   | Reusable UI components                        |
| Composables  | Application state and use cases               |
| Stores       | Global client-side state                      |
| Repository   | Local persistence abstraction                 |
| Sync Service | Synchronization between local and remote data |
| API          | HTTP communication                            |
| DB           | IndexedDB / Dexie configuration               |

---

# 3. `TodayView.vue`

`TodayView.vue` is currently the main workout entry point.

It is responsible for:

* displaying the calendar;
* navigating between months;
* selecting a date;
* displaying daily repetition totals;
* displaying the exercise selector;
* opening the workout modal;
* handling repetition input;
* creating a workout through `useWorkouts`.

The component interacts with the application through:

```mermaid
flowchart LR
    Today["TodayView.vue"]
    Exercise["ExerciseSelector.vue"]
    ExerciseStore["exercise store"]
    Workouts["useWorkouts"]

    Today --> Exercise
    Exercise --> ExerciseStore
    Today --> ExerciseStore
    Today --> Workouts
```

The view does **not** directly access IndexedDB.

This is an important separation:

```mermaid
flowchart LR
    Today["TodayView.vue"] --> Workouts["useWorkouts"]
    Workouts --> Repository["WorkoutRepository"]
    Repository --> DB[(IndexedDB)]
```

---

# 4. Exercise Selection

Exercise selection is currently handled by the `exercise` Pinia store.

```text
stores/exercise.ts
```

The selected exercise is persisted in `localStorage`.

```mermaid
flowchart LR
    Selector["ExerciseSelector.vue"]
    Store["exercise Pinia store"]
    Storage["localStorage"]

    Selector --> Store
    Store --> Storage
```

The available exercises are currently defined in:

```text
exercises.ts
```

The store contains:

```ts
selectedExercise: string | null
```

---

# 5. Authentication

Authentication state is handled by:

```text
stores/auth.ts
```

The JWT token is persisted in `localStorage`.

```mermaid
flowchart LR
    AuthStore["auth Pinia store"]
    LocalStorage["localStorage"]
    API["API Client"]
    Backend["Fastify"]
    JWT["JWT verification"]

    AuthStore --> LocalStorage
    API --> AuthStore
    API --> Backend
    Backend --> JWT
```

The frontend sends the token using:

```http
Authorization: Bearer <token>
```

The backend extracts the authenticated user's ID from the JWT.

The client therefore does not choose the owner of a workout.

---

# 6. Local Persistence

IndexedDB is the local persistence layer.

Dexie is used as the IndexedDB abstraction.

```mermaid
flowchart TD
    Application["Application"]
    Repository["WorkoutRepository"]
    Dexie["Dexie"]
    IndexedDB[(IndexedDB)]

    Application --> Repository
    Repository --> Dexie
    Dexie --> IndexedDB
```

The database is currently named:

```text
WorkoutDatabase
```

It contains:

```text
workouts
syncState
```

---

# 7. Workout Repository

The repository provides an abstraction over IndexedDB.

File:

```text
repositories/workoutRepository.ts
```

Current operations include:

```ts
getAll()
create()
update()
getPending()
saveSynced()
```

The repository is deliberately unaware of Vue components.

Its responsibility is limited to local persistence.

```mermaid
flowchart LR
    Composable["useWorkouts"]
    Sync["Sync Service"]
    Repository["WorkoutRepository"]
    DB[(IndexedDB)]

    Composable --> Repository
    Sync --> Repository
    Repository --> DB
```

This creates the following boundary:

> Application code should interact with local workout data through the repository rather than directly through Dexie.

---

# 8. Local Workout Model

The current local representation is:

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

The `syncStatus` property is local synchronization metadata.

Possible values are:

```text
pending
synced
```

The model therefore combines:

1. workout data;
2. local synchronization state.

---

# 9. Workout Creation Flow

Creating a workout follows the offline-first principle.

```mermaid
sequenceDiagram
    participant User
    participant View as TodayView.vue
    participant Composable as useWorkouts
    participant Repository as WorkoutRepository
    participant DB as IndexedDB
    participant Sync as Sync Service
    participant API as Backend API
    participant Server as Fastify
    participant PostgreSQL

    User->>View: Enter workout
    View->>Composable: createWorkout(workout)

    Composable->>Repository: create(workout)
    Repository->>DB: Save locally
    DB-->>Repository: OK
    Repository-->>Composable: Workout saved

    Composable-->>View: Local save completed

    Sync->>API: POST /api/workouts
    API->>Server: HTTP request
    Server->>PostgreSQL: INSERT workout
    PostgreSQL-->>Server: OK
    Server-->>API: 201 Created
    API-->>Sync: Workout created

    Sync->>Repository: update(id, synced)
    Repository->>DB: Set syncStatus = synced
```

The local save does not depend on network availability.

---

# 10. Offline Behavior

When the application is offline, the workout is still stored locally.

```mermaid
flowchart TD
    User[User]
    View[TodayView.vue]
    Composable[useWorkouts]
    Repository[WorkoutRepository]
    DB[(IndexedDB)]

    User --> View
    View --> Composable
    Composable --> Repository
    Repository --> DB

    DB --> Pending["syncStatus = pending"]
```

The network request may fail, but the local data remains available.

When connectivity returns, pending workouts are synchronized.

```mermaid
sequenceDiagram
    participant Browser
    participant Composable as useWorkouts
    participant Sync as Sync Service
    participant Repository as WorkoutRepository
    participant DB as IndexedDB
    participant API as Backend API

    Browser->>Composable: online event
    Composable->>Sync: sync()

    Sync->>Repository: getPending()
    Repository->>DB: Query pending workouts
    DB-->>Repository: Pending workouts
    Repository-->>Sync: Pending workouts

    loop For each pending workout
        Sync->>API: POST workout
        API-->>Sync: Success
        Sync->>Repository: update(id, synced)
        Repository->>DB: Mark as synced
    end
```

---

# 11. Synchronization Architecture

Synchronization is currently implemented in:

```text
services/sync.ts
```

Main functions:

```ts
syncWorkout()
syncPendingWorkouts()
syncWorkoutsFromServer()
```

The synchronization layer sits between local persistence and the remote API.

```mermaid
flowchart LR
    Repository["WorkoutRepository"]
    Sync["Sync Service"]
    API["API Client"]
    Backend["Fastify Backend"]
    DB[(IndexedDB)]

    DB --> Repository
    Repository --> Sync
    Sync --> API
    API --> Backend

    Backend --> API
    API --> Sync
    Sync --> Repository
    Repository --> DB
```

---

# 12. Pending Workout Synchronization

Pending workouts are retrieved from IndexedDB using their local synchronization status.

```mermaid
flowchart TD
    Start["syncPendingWorkouts()"]
    Query["Get workouts where syncStatus = pending"]
    Workout["Pending workout"]
    Send["POST /api/workouts"]
    Success["Request succeeds"]
    Failed["Request fails"]
    Synced["Set syncStatus = synced"]
    Retry["Keep syncStatus = pending"]

    Start --> Query
    Query --> Workout
    Workout --> Send

    Send --> Success
    Send --> Failed

    Success --> Synced
    Failed --> Retry
```

Failed workouts remain pending and can be retried during a future synchronization.

---

# 13. Synchronization From the Server

The frontend can retrieve workouts from the backend using:

```http
GET /api/workouts
```

The returned workouts are stored locally.

```mermaid
sequenceDiagram
    participant Sync as Sync Service
    participant API as API Client
    participant Backend as Fastify
    participant DB as PostgreSQL
    participant Repository as WorkoutRepository
    participant IndexedDB

    Sync->>API: getWorkouts()
    API->>Backend: GET /api/workouts
    Backend->>DB: SELECT user workouts
    DB-->>Backend: Workouts
    Backend-->>API: ApiWorkout[]
    API-->>Sync: ApiWorkout[]

    loop For each workout
        Sync->>Repository: saveSynced(workout)
        Repository->>IndexedDB: put(workout)
    end
```

---

# 14. Frontend API Layer

The current API layer is located in:

```text
api/workouts.ts
```

It currently exposes:

```ts
createWorkout()
getWorkouts()
```

The API layer is responsible for:

* constructing HTTP requests;
* adding authentication headers;
* handling HTTP errors;
* converting HTTP responses to application objects.

Current dependency direction:

```mermaid
flowchart LR
    Sync["Sync Service"] --> API["api/workouts.ts"]
    API --> Fetch["fetch()"]
    Fetch --> Backend["Fastify API"]
```

---

# 15. Backend Architecture

The backend currently uses Fastify.

Current structure:

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

The current request flow is:

```mermaid
flowchart LR
    Client["Frontend"]
    Fastify["Fastify"]
    Auth["verifyJWT"]
    Routes["Workout Routes"]
    PostgreSQL[(PostgreSQL)]

    Client --> Fastify
    Fastify --> Auth
    Auth --> Routes
    Routes --> PostgreSQL
```

---

# 16. Workout API

The workout API currently exposes:

```http
POST /api/workouts
GET  /api/workouts
```

Both endpoints are protected by JWT authentication.

```mermaid
flowchart TD
    Request["HTTP Request"]
    JWT["JWT"]
    Verify["verifyJWT"]
    UserId["request.userId"]
    Route["Workout Route"]
    DB[(PostgreSQL)]

    Request --> JWT
    JWT --> Verify
    Verify --> UserId
    UserId --> Route
    Route --> DB
```

The server obtains the user ID from the authenticated token rather than trusting a `userId` supplied by the client.

---

# 17. Backend Workout Creation

The current backend flow is:

```mermaid
sequenceDiagram
    participant Client as Frontend API
    participant Fastify
    participant Auth as verifyJWT
    participant Route as /api/workouts
    participant DB as PostgreSQL

    Client->>Fastify: POST /api/workouts
    Fastify->>Auth: Verify JWT
    Auth-->>Fastify: request.userId

    Fastify->>Route: Handle request
    Route->>DB: INSERT workout
    DB-->>Route: Inserted

    Route->>DB: SELECT workout
    DB-->>Route: Workout

    Route-->>Client: 201 + ApiWorkout
```

---

# 18. PostgreSQL Data Model

The current PostgreSQL database contains:

```text
users
user_devices
workouts
```

The main relationships are:

```mermaid
erDiagram
    USERS ||--o{ WORKOUTS : owns
    USERS ||--o{ USER_DEVICES : has

    USERS {
        uuid id PK
        varchar name
        timestamptz created_at
    }

    WORKOUTS {
        uuid id PK
        uuid user_id FK
        varchar exercise
        date date
        integer reps
        varchar mode
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    USER_DEVICES {
        serial id PK
        uuid user_id FK
        text credential_id
        bytea credential_public_key
        bigint counter
        text[] transports
    }
```

A workout belongs to exactly one user through:

```text
workouts.user_id → users.id
```

---

# 19. Workout Data Representations

A workout currently exists in several representations.

```mermaid
flowchart LR
    Local["LocalWorkout"]
    API["ApiWorkout"]
    PostgreSQL["PostgreSQL workout"]

    Local -->|"Synchronization"| API
    API -->|"HTTP / persistence"| PostgreSQL
```

### Local representation

Used by IndexedDB:

```ts
LocalWorkout
```

It contains local metadata such as:

```ts
syncStatus
```

### API representation

Used by the HTTP API:

```ts
ApiWorkout
```

It additionally contains:

```ts
userId
```

### PostgreSQL representation

Stored in the `workouts` table.

---

# 20. Logout and Local Data

When the user logs out, the authentication store clears the authentication token and deletes the local workout database.

```mermaid
flowchart TD
    Logout["User logs out"]
    Auth["auth store"]
    Token["Remove JWT from localStorage"]
    DB["Delete WorkoutDatabase"]
    IndexedDB[(IndexedDB)]

    Logout --> Auth
    Auth --> Token
    Auth --> DB
    DB --> IndexedDB
```

This prevents locally cached workout data from remaining on the device after logout.

---

# 21. Current Architectural Boundaries

The current frontend architecture can be summarized as:

```mermaid
flowchart TD
    UI["Views / Components"]
    Application["Composables"]
    Local["WorkoutRepository"]
    Storage["IndexedDB"]
    Sync["Sync Service"]
    API["API Client"]
    Backend["Fastify Backend"]
    Database["PostgreSQL"]

    UI --> Application
    Application --> Local
    Local --> Storage

    Application --> Sync
    Sync --> Local
    Sync --> API

    API --> Backend
    Backend --> Database
```

The main boundaries are:

### UI boundary

Views and components should not directly access persistence or HTTP.

### Local persistence boundary

`WorkoutRepository` encapsulates IndexedDB/Dexie.

### Synchronization boundary

`Sync Service` coordinates local and remote data.

### API boundary

The API layer encapsulates HTTP communication.

### Backend boundary

Fastify routes authenticate requests and persist data in PostgreSQL.

---

# 22. Current Strengths

The current architecture already provides several useful properties.

## Offline-first persistence

A workout can be created without a network connection.

## Local-first user experience

The UI does not need to wait for the server before displaying the newly created workout.

## Local persistence abstraction

IndexedDB access is progressively isolated behind a repository.

## Server-side ownership

The backend determines the authenticated user from the JWT.

## Retry behavior

Failed synchronization does not delete the local workout.

## Clear frontend responsibilities

The application is beginning to separate:

```text
UI
Application logic
Persistence
Synchronization
HTTP
```

---

# 23. Current Limitations

The architecture is functional, but several areas are still intentionally simple.

## Synchronization

The current synchronization mechanism:

* retrieves all workouts from the server;
* does not currently use `syncState.lastSync`;
* has no explicit conflict resolution strategy;
* has no versioning mechanism;
* has no dedicated outbox abstraction;
* does not distinguish all retryable and permanent errors.

## API layer

The API layer currently uses `fetch()` directly.

There is not yet a shared HTTP client responsible for common concerns such as:

* authentication;
* error normalization;
* request handling;
* retries;
* network detection.

## Backend

Workout routes currently combine:

* HTTP request handling;
* request extraction;
* SQL queries;
* response mapping.

There is not yet a dedicated backend service/repository layer.

## Domain model

`LocalWorkout`, `ApiWorkout`, and the PostgreSQL representation remain relatively close to each other.

There is not yet a strongly separated domain model.

---

# 24. Current Architecture at a Glance

The complete current architecture can be represented as:

```mermaid
flowchart TB
    subgraph Client["Client — Vue 3"]
        Views["Views"]
        Components["Components"]
        Composables["Composables"]
        Stores["Pinia Stores"]
        Repository["WorkoutRepository"]
        IndexedDB[(IndexedDB)]
        Sync["Sync Service"]
        API["API Client"]
        LocalStorage[(localStorage)]
    end

    subgraph Server["Server — Fastify"]
        JWT["JWT Middleware"]
        Routes["HTTP Routes"]
        ServerDB["Database Access"]
    end

    PostgreSQL[(PostgreSQL)]

    Views --> Components
    Views --> Composables
    Components --> Stores
    Composables --> Repository
    Repository --> IndexedDB

    Composables --> Sync
    Sync --> Repository
    Sync --> API

    Stores --> LocalStorage
    API --> JWT
    JWT --> Routes
    Routes --> ServerDB
    ServerDB --> PostgreSQL
```

---

# 25. Architectural Direction

The current architecture should be considered a **working intermediate architecture**, rather than a final target architecture.

The introduction of the `WorkoutRepository` is an important first step because it establishes a clear boundary around local persistence.

Possible future improvements include:

```mermaid
flowchart LR
    Current["Current Architecture"]

    HTTP["Shared HTTP Client"]
    SyncEngine["Dedicated Sync Engine"]
    Incremental["Incremental Synchronization"]
    Outbox["Explicit Outbox"]
    Conflict["Conflict / Version Handling"]
    BackendServices["Backend Service / Repository Layers"]

    Current --> HTTP
    HTTP --> SyncEngine
    SyncEngine --> Incremental
    Incremental --> Outbox
    Outbox --> Conflict
    Conflict --> BackendServices
```

These elements are **not yet implemented** and should be introduced incrementally as the application grows.

---

# 26. Architectural Principle

The most important architectural principle of CountRep is:

```text
                    ┌───────────────┐
                    │      UI       │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   Application │
                    │     Logic     │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │     Local     │
                    │   Repository  │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   IndexedDB   │
                    └───────────────┘

                       ↑
                       │
                 Synchronization
                       │
                       ▼

                    ┌───────────────┐
                    │     API       │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │    Fastify    │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  PostgreSQL   │
                    └───────────────┘
```

The local database is therefore not merely a cache.

It is an important part of the application's operational data flow.

The server acts as the persistent shared backend, while the client maintains a locally usable representation that can continue to operate without connectivity.
