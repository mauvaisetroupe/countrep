# Revue d'architecture — CountRep

## 1. Contexte

L'application frontend est une application Vue 3 / TypeScript avec une approche **offline-first** :

* les données sont d'abord enregistrées localement dans IndexedDB via Dexie ;
* les données sont ensuite synchronisées avec une API HTTP ;
* le backend est basé sur Fastify ;
* les données distantes sont stockées dans PostgreSQL ;
* l'authentification utilise un token JWT ;
* Pinia est utilisé pour certains états applicatifs.

Le flux actuel autour des workouts est globalement :

```text
Vue
 ↓
Composable
 ↓
IndexedDB / Dexie
 ↓
Service de synchronisation
 ↓
API HTTP
 ↓
Fastify
 ↓
PostgreSQL
```

---

# 2. Diagnostic général

L'architecture actuelle **n'est pas un gros bazar**.

Elle est relativement simple, compréhensible et adaptée à une petite application.

Le principal problème est plutôt que **certaines responsabilités commencent à se mélanger**, notamment autour de la synchronisation offline-first.

Le point central à surveiller est donc moins la structure des fichiers que la définition des responsabilités :

```text
UI
 ↓
Logique applicative
 ↓
Données locales
 ↓
Synchronisation
 ↓
API distante
```

Aujourd'hui ces frontières existent partiellement, mais elles ne sont pas encore clairement matérialisées dans le code.

---

# 3. Architecture actuelle

Le fonctionnement actuel est approximativement :

```text
TodayView.vue
│
├── ExerciseSelector
├── exerciseStore
│
├── useWorkouts()
│     │
│     ├── IndexedDB
│     └── sync
│           ├── syncPendingWorkouts
│           │      └── API
│           │
│           └── syncWorkoutsFromServer
│                  └── API
│
└── saveWorkout()
       │
       ├── IndexedDB
       └── syncWorkout()
              └── API
```

Côté backend :

```text
Fastify
│
└── routes/workouts.ts
       │
       └── PostgreSQL
```

---

# 4. Principal problème : TodayView connaît trop de détails techniques

`TodayView.vue` connaît actuellement directement :

* IndexedDB ;
* `LocalWorkout` ;
* `syncWorkout()` ;
* `useWorkouts()` ;
* le store d'exercice.

Le code de création ressemble à :

```ts
await db.workouts.add(workout)

await loadWorkouts()

try {
  await syncWorkout(workout)
  await loadWorkouts()
} catch (error) {
  console.warn(...)
}
```

La vue connaît donc le mécanisme de persistance et de synchronisation.

Idéalement, elle devrait seulement exprimer l'intention métier :

```ts
await workoutRepository.create({
  exercise,
  date,
  reps,
  mode
})
```

ou, encore mieux au niveau UI :

```ts
await addWorkout(...)
```

Le fait que l'opération soit offline-first devrait être transparent pour la vue.

---

# 5. Séparation de responsabilités cible

Une architecture raisonnable pourrait être :

```text
┌──────────────────────────────┐
│            UI                │
│ Views / Components           │
└──────────────┬───────────────┘
               │
┌──────────────▼───────────────┐
│       Application            │
│ use cases / composables      │
└──────────────┬───────────────┘
               │
┌──────────────▼───────────────┐
│          Domain              │
│ Workout / Exercise / règles  │
└──────────────┬───────────────┘
               │
       ┌───────┴────────┐
       ▼                ▼
┌─────────────┐   ┌─────────────┐
│ Local DB    │   │ Remote API  │
│ IndexedDB   │   │ HTTP        │
└─────────────┘   └─────────────┘
```

Il ne s'agit pas de créer systématiquement quatre couches ou de faire de la Clean Architecture excessive.

L'objectif est simplement de définir clairement les responsabilités.

---

# 6. Le Repository devrait devenir une frontière importante

Aujourd'hui, le code accède directement à IndexedDB.

Une abstraction de repository permettrait de faire :

```text
                 WorkoutRepository
                       │
              ┌────────┴─────────┐
              ▼                  ▼
        Local storage       Remote API
          IndexedDB             HTTP
```

Par exemple :

```ts
interface WorkoutRepository {
  getAll(): Promise<Workout[]>
  getById(id: string): Promise<Workout | null>
  save(workout: Workout): Promise<void>
  delete(id: string): Promise<void>
}
```

Dans une architecture offline-first, le repository peut devenir principalement **local-first**, tandis que le moteur de synchronisation s'occupe du distant.

---

# 7. Création d'un workout

Le flux actuel :

```text
TodayView
  ↓
db.workouts.add()
  ↓
syncWorkout()
```

Le flux cible :

```text
TodayView
    ↓
addWorkout()
    ↓
WorkoutRepository
    ↓
IndexedDB
    ↓
pending / outbox
    ↓
SyncEngine
    ↓
API
```

La vue n'a alors plus besoin de savoir si le réseau est disponible.

La règle devient :

> Une opération utilisateur est d'abord validée et persistée localement. La synchronisation distante est une responsabilité séparée.

---

# 8. Le vrai chantier : la synchronisation

Les fonctions actuelles :

```ts
syncWorkout()
syncPendingWorkouts()
syncWorkoutsFromServer()
```

constituent déjà une première abstraction, mais elles ne forment pas encore un véritable moteur de synchronisation.

Le comportement actuel est essentiellement :

1. charger les données locales ;
2. envoyer les workouts `pending` ;
3. télécharger tous les workouts du serveur ;
4. remplacer/mettre à jour les données locales.

Cela fonctionne pour commencer, mais devra évoluer.

---

# 9. SyncState est actuellement sous-utilisé

Le modèle IndexedDB contient :

```ts
interface SyncState {
  id: string
  lastSync: number
}
```

mais `lastSync` n'est actuellement pas utilisé.

Le client récupère :

```ts
getWorkouts()
```

et donc potentiellement tous les workouts de l'utilisateur.

À terme, il serait préférable de faire une synchronisation incrémentale :

```text
lastSync
    ↓
GET /workouts?updatedSince=...
    ↓
serveur
    ↓
uniquement les modifications
```

Cela deviendra particulièrement important lorsque le volume de données augmentera.

---

# 10. Gestion des suppressions

Le modèle contient déjà :

```ts
deletedAt
```

ce qui est une bonne base pour gérer les suppressions sous forme de tombstones.

Cependant, le mécanisme complet n'est pas encore implémenté.

Il faut à terme pouvoir représenter :

```text
création
mise à jour
suppression
```

et synchroniser chacune de ces opérations.

Les suppressions ne doivent pas simplement disparaître immédiatement de la base locale si elles doivent être propagées aux autres appareils.

---

# 11. Gestion des conflits

La stratégie de conflit n'est actuellement pas définie.

Exemple :

```text
Téléphone
  ↓
Workout A modifié offline

PC
  ↓
Workout A modifié

Serveur
  ↓
version PC

Téléphone revient online
```

Il faut décider ce qui doit se passer.

Pour une application relativement simple comme CountRep, une stratégie **Last Write Wins** peut être suffisante.

Cependant, il faut définir précisément ce que signifie "dernier".

Les horloges des clients ne sont pas toujours fiables.

Une version serveur ou une révision serveur serait plus robuste :

```text
Workout
├── id
├── ...
├── version
└── updatedAt
```

Le serveur devient alors l'arbitre.

---

# 12. Idempotence des mutations

Le système offline-first doit pouvoir retenter une opération sans provoquer de doublon.

Exemple :

```text
Client → POST
        ↓
Serveur crée le workout
        ↓
Réponse perdue
        ↓
Client pense que ça a échoué
        ↓
Retry
```

Actuellement, le deuxième POST peut provoquer une erreur PostgreSQL à cause de la clé primaire existante.

Les mutations doivent donc être idempotentes.

Le serveur devrait pouvoir recevoir plusieurs fois la même opération et aboutir au même état final.

Le `UUID` du workout est une très bonne base pour cela.

---

# 13. `syncPendingWorkouts()` distingue insuffisamment les erreurs

Actuellement :

```ts
try {
  await syncWorkout(workout)
} catch (error) {
  console.warn(...)
}
```

Toutes les erreurs sont essentiellement traitées comme des erreurs temporaires.

Il faudrait à terme distinguer :

```text
NETWORK_ERROR
AUTH_ERROR
VALIDATION_ERROR
CONFLICT
SERVER_ERROR
```

Par exemple :

```text
Erreur réseau
→ retry

401
→ problème d'authentification

400
→ erreur permanente

Conflit
→ résolution

500
→ retry
```

---

# 14. `useWorkouts()` mélange état métier et synchronisation

Le composable actuel contient :

```ts
onMounted()
onUnmounted()
window.addEventListener('online')
```

tout en gérant les workouts.

Il est donc responsable à la fois de :

* l'état des workouts ;
* la lecture IndexedDB ;
* la synchronisation ;
* le cycle de vie réseau.

Je séparerais progressivement :

```text
useWorkouts()
```

de :

```text
SyncEngine
```

Par exemple :

```text
composables/
    useWorkouts.ts
    useSyncStatus.ts

services/
    sync/
        syncEngine.ts
```

---

# 15. La synchronisation devrait être globale

Aujourd'hui, la synchronisation est déclenchée par le montage de :

```text
TodayView
```

Cela signifie que le moteur de synchronisation dépend indirectement de cette page.

Ce n'est pas idéal.

La synchronisation est une préoccupation de l'application entière.

Elle devrait plutôt être initialisée au démarrage :

```text
main.ts
   ↓
application initialization
   ↓
SyncEngine.start()
```

Le moteur peut ensuite écouter :

```text
startup
online
manual sync
periodic sync
visibility change
```

selon les besoins.

---

# 16. IndexedDB est une bonne base

Le module Dexie actuel est volontairement simple :

```text
workouts
syncState
```

Il ne faut pas l'over-engineerer.

Une évolution possible serait :

```text
workouts
syncState
outbox
```

avec une queue explicite :

```ts
interface OutboxEntry {
  id: string
  entity: 'workout'
  entityId: string
  operation: 'create' | 'update' | 'delete'
  createdAt: number
  attempts: number
}
```

Cependant, l'outbox n'est pas forcément nécessaire immédiatement.

Le `syncStatus: 'pending'` actuel peut suffire tant que les mutations restent simples.

---

# 17. `syncStatus` appartient plutôt à la persistance locale

Actuellement :

```ts
interface LocalWorkout {
  ...
  syncStatus: 'pending' | 'synced'
}
```

Le concept de synchronisation est spécifique au stockage local.

Le modèle métier `Workout` n'a pas nécessairement besoin de connaître cette information.

On pourrait distinguer :

```ts
interface Workout {
  id: string
  exercise: string
  date: string
  reps: number
  mode: WorkoutMode
  createdAt: number
  updatedAt: number
  deletedAt: number | null
}
```

et :

```ts
interface LocalWorkoutRecord extends Workout {
  syncStatus: SyncStatus
}
```

Cette séparation pourra être introduite progressivement.

---

# 18. `ApiWorkout` peut également être séparé du modèle métier

Aujourd'hui, `ApiWorkout` se trouve dans :

```text
api/workouts.ts
```

Cela fonctionne.

À terme, on peut avoir :

```text
domain/
    workout.ts

api/
    workouts.ts

repositories/
    workoutRepository.ts
```

avec :

```text
Workout
   ↓
Repository
   ├── Local storage
   └── Remote API
```

L'API connaît ses DTO.

Le domaine connaît ses modèles.

IndexedDB connaît ses records locaux.

Encore une fois, cette séparation doit être introduite uniquement lorsque le besoin apparaît.

---

# 19. Backend : les routes font actuellement trop de choses

`routes/workouts.ts` contient actuellement :

* gestion HTTP ;
* récupération du userId ;
* validation implicite du body ;
* SQL INSERT ;
* SQL SELECT ;
* mapping PostgreSQL → API.

Cela fonctionne mais deviendra difficile à maintenir avec la logique de synchronisation.

Une séparation raisonnable serait :

```text
routes/
    workouts.ts

services/
    workoutService.ts

repositories/
    workoutRepository.ts
```

Le flux devient :

```text
HTTP route
   ↓
Service
   ↓
Repository
   ↓
PostgreSQL
```

Le service pourra ensuite contenir les règles de synchronisation/conflit sans polluer les routes.

---

# 20. Validation backend

Le backend fait actuellement confiance au body :

```ts
const body = request.body as {
  ...
}
```

Le cast TypeScript ne constitue pas une validation runtime.

Il faudrait à terme utiliser un schéma de validation Fastify/JSON Schema ou une librairie adaptée.

Par exemple, contrôler :

```text
id
exercise
date
reps
mode
createdAt
updatedAt
deletedAt
```

Cela devient particulièrement important avec un client offline-first, puisque le client peut envoyer des données qui ont été générées longtemps avant leur réception par le serveur.

---

# 21. `updatedAt` ne devrait pas être totalement contrôlé par le client

Actuellement le client envoie :

```text
createdAt
updatedAt
deletedAt
```

et le serveur les utilise directement.

C'est acceptable pour un prototype, mais le serveur devra progressivement devenir l'autorité pour la résolution des conflits.

Une évolution possible :

```text
client mutation
    ↓
server
    ↓
validation
    ↓
version / timestamp serveur
    ↓
nouvel état canonique
```

---

# 22. `mode` devrait être contraint côté PostgreSQL

Le TypeScript garantit :

```ts
mode: 'add' | 'set'
```

mais PostgreSQL utilise actuellement :

```sql
mode character varying(20)
```

Il est donc possible de stocker une valeur invalide directement dans la base.

Il serait préférable d'avoir une contrainte PostgreSQL :

```sql
CHECK (mode IN ('add', 'set'))
```

ou un type PostgreSQL approprié.

La base doit conserver ses invariants indépendamment du frontend.

---

# 23. `exercise` pourrait devenir un identifiant

Actuellement :

```ts
exercise: string
```

Cela signifie qu'un workout stocke potentiellement :

```text
"Pompes"
```

plutôt qu'un identifiant stable.

Si les exercices sont une liste connue de l'application, il serait plus robuste d'utiliser :

```ts
exerciseId: 'pushups'
```

avec un modèle :

```ts
Exercise {
  id
  name
  shortName
  icon
}
```

Le workout contient alors :

```ts
exerciseId
```

et non le nom affiché.

Cela évite les problèmes si le nom ou la langue change.

---

# 24. Le store `exercise` est globalement correct

Le store :

```text
useExerciseStore()
```

est simple et cohérent.

Il contient une préférence utilisateur :

```text
selectedExercise
```

et la persiste dans localStorage.

Il n'est pas nécessaire de le complexifier.

Une petite amélioration possible serait toutefois de déplacer l'initialisation automatique du premier exercice hors de `ExerciseSelector.vue`.

Le composant ne devrait idéalement pas être responsable d'une règle d'initialisation globale.

---

# 25. `auth.ts` est trop couplé à IndexedDB

Actuellement `logout()` connaît :

```ts
'WorkoutDatabase'
```

et supprime directement la base IndexedDB.

Cela crée un couplage :

```text
Auth
+
Persistence
```

À terme, il serait préférable d'avoir une abstraction :

```ts
clearLocalData()
```

ou :

```ts
localDatabase.clear()
```

puis :

```text
logout
 ↓
clear session
 ↓
clear local user data
 ↓
reset application state
```

Cela deviendra important dès que plusieurs types de données seront stockés localement.

---

# 26. Le calendrier devrait sortir de `TodayView.vue`

`TodayView.vue` contient actuellement beaucoup de logique de calendrier :

```text
currentYear
currentMonthIndex
selectedDate
currentMonth
daysInMonth
prevMonth
nextMonth
goToToday
formatDate
getLocalDateKey
```

Cette logique peut être extraite dans :

```text
useCalendar()
```

Le composant deviendrait beaucoup plus lisible.

---

# 27. `repsByDay` peut également être extrait

Le calcul :

```ts
workouts
  .filter(...)
  .forEach(...)
```

est une logique de présentation/métier spécifique au calendrier.

Il peut être déplacé vers :

```text
useWorkoutCalendar()
```

ou une fonction :

```ts
getWorkoutTotalsByDay(...)
```

Cela permettrait à `TodayView.vue` de se concentrer principalement sur l'interface.

---

# 28. Architecture cible proposée

À terme, une structure raisonnable pourrait être :

```text
frontend/src/

├── api/
│   ├── client.ts
│   └── workouts.ts
│
├── components/
│   └── ExerciseSelector.vue
│
├── composables/
│   ├── useCalendar.ts
│   ├── useWorkoutCalendar.ts
│   └── useWorkouts.ts
│
├── db/
│   ├── index.ts
│   ├── schema.ts
│   └── workouts.ts
│
├── domain/
│   ├── workout.ts
│   └── exercise.ts
│
├── repositories/
│   └── workoutRepository.ts
│
├── services/
│   └── sync/
│       ├── syncEngine.ts
│       ├── syncWorkouts.ts
│       └── syncTypes.ts
│
├── stores/
│   ├── auth.ts
│   └── exercise.ts
│
├── views/
│   └── TodayView.vue
│
└── exercises.ts
```

Cette structure représente une **cible possible**, pas une obligation immédiate.

---

# 29. Plan de refactoring recommandé

Le refactoring devrait être progressif.

## Étape 1 — sortir IndexedDB de `TodayView`

Objectif :

```text
TodayView
    ↓
useWorkouts
    ↓
IndexedDB
```

`TodayView.vue` ne doit plus accéder directement à :

```ts
db.workouts
```

---

## Étape 2 — introduire `WorkoutRepository`

Objectif :

```text
useWorkouts
    ↓
WorkoutRepository
    ↓
IndexedDB
```

Le composable ne connaît plus Dexie directement.

---

## Étape 3 — introduire `SyncEngine`

Objectif :

```text
WorkoutRepository
        ↑
        │
   SyncEngine
        │
        ↓
      API
```

Le repository devient la porte d'accès aux données locales et le moteur de synchronisation orchestre les échanges distants.

---

## Étape 4 — rendre la synchronisation globale

Déplacer la logique :

```ts
window.addEventListener('online')
```

hors de `useWorkouts()`.

La synchronisation doit être liée à l'application et non à `TodayView`.

---

## Étape 5 — améliorer le protocole backend

Introduire progressivement :

* mutations idempotentes ;
* synchronisation incrémentale ;
* version serveur ;
* gestion des conflits ;
* tombstones ;
* validation stricte ;
* distinction des erreurs temporaires/permanentes.

---

# 30. Ce qu'il ne faut pas faire

Il ne faut pas transformer immédiatement le projet en architecture extrêmement complexe :

```text
domain/
application/
infrastructure/
presentation/
ports/
adapters/
factories/
usecases/
repositories/
DTO/
mappers/
...
```

Pour une petite application, cela créerait surtout de la complexité artificielle.

L'objectif est :

> **Créer les bonnes frontières au moment où elles deviennent nécessaires.**

---

# 31. Évaluation actuelle

| Partie                         | État                             |
| ------------------------------ | -------------------------------- |
| Vue / Components               | 🟢 Correct                       |
| Pinia                          | 🟢 Simple et raisonnable         |
| IndexedDB / Dexie              | 🟢 Bonne base                    |
| API client                     | 🟢 Simple                        |
| Backend Fastify                | 🟢 Correct pour démarrer         |
| Séparation des responsabilités | 🟡 À améliorer                   |
| Offline-first                  | 🟡 Fonctionnel mais rudimentaire |
| Synchronisation                | 🟠 Principal chantier            |
| Gestion des conflits           | 🔴 Pas encore définie            |
| Idempotence                    | 🔴 À mettre en place             |
| Synchronisation incrémentale   | 🔴 Pas encore implémentée        |
| Modèle domaine/API/DB          | 🟡 Commence à se mélanger        |

---

# 32. Conclusion

L'application n'est pas mal architecturée.

Elle est plutôt arrivée à un point où son architecture initiale commence à montrer ses limites.

Le point critique n'est pas Vue 3, Pinia ou Dexie.

Le point critique est la **synchronisation offline-first**.

La direction recommandée est donc :

```text
TodayView
     ↓
useWorkouts
     ↓
WorkoutRepository
     ↓
IndexedDB
     ↑
SyncEngine
     ↓
API
     ↓
Backend
     ↓
PostgreSQL
```

avec une règle fondamentale :

> **L'application travaille d'abord avec son état local. La synchronisation avec le serveur est une préoccupation séparée.**

Le refactoring peut être effectué progressivement sans réécrire l'application.
