GRANT USAGE ON SCHEMA public TO countrep_app;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE users, workouts
TO countrep_app;

GRANT SELECT ON TABLE exercises TO countrep_app;
GRANT SELECT, INSERT, DELETE ON TABLE user_exercises TO countrep_app;

// 2026-09-02
ALTER TABLE public.workouts
ADD COLUMN workout_time time;

SELECT
    id,
    exercise,
    date,
    created_at,
    created_at::time AS workout_time
FROM public.workouts
ORDER BY created_at DESC
LIMIT 20

UPDATE public.workouts
SET workout_time = created_at::time
WHERE workout_time IS NULL;

-- 2026-10-10 : séances (modèles de workout)
CREATE TABLE routines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    rounds smallint NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT routines_pkey PRIMARY KEY (id),
    CONSTRAINT routines_rounds_check CHECK (rounds > 0),
    CONSTRAINT routines_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_routines_user_id ON routines USING btree (user_id);

CREATE TABLE routine_exercises (
    routine_id uuid NOT NULL,
    position smallint NOT NULL,
    exercise_id text NOT NULL,
    reps integer NOT NULL,
    CONSTRAINT routine_exercises_pkey PRIMARY KEY (routine_id, position),
    CONSTRAINT routine_exercises_reps_check CHECK (reps > 0),
    CONSTRAINT routine_exercises_routine_id_fkey FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE CASCADE,
    CONSTRAINT routine_exercises_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE routines, routine_exercises TO countrep_app;

-- 2026-10-10 : vocabulaire du domaine (ADR 0006)
--   workouts (saisies)          -> sets
--   routines (modèles)          -> workouts
--   routine_exercises           -> workout_exercises
--   sets.workout_time           -> sets.time ; suppression de sets.mode
-- Ordre important : libérer le nom « workouts » avant de le réutiliser.
BEGIN;

ALTER TABLE workouts RENAME TO sets;
ALTER TABLE sets RENAME COLUMN workout_time TO time;
ALTER TABLE sets DROP COLUMN mode;
ALTER TABLE sets RENAME CONSTRAINT workouts_pkey TO sets_pkey;
ALTER TABLE sets RENAME CONSTRAINT workouts_reps_check TO sets_reps_check;
ALTER TABLE sets RENAME CONSTRAINT workouts_user_id_fkey TO sets_user_id_fkey;
ALTER TABLE sets RENAME CONSTRAINT fk_workouts_exercise TO sets_exercise_fkey;
ALTER INDEX idx_workouts_user_id RENAME TO idx_sets_user_id;
ALTER INDEX idx_workouts_user_date RENAME TO idx_sets_user_date;
-- PostgreSQL 18 : les NOT NULL sont des contraintes nommées
ALTER TABLE sets RENAME CONSTRAINT workouts_id_not_null TO sets_id_not_null;
ALTER TABLE sets RENAME CONSTRAINT workouts_user_id_not_null TO sets_user_id_not_null;
ALTER TABLE sets RENAME CONSTRAINT workouts_exercise_not_null TO sets_exercise_not_null;
ALTER TABLE sets RENAME CONSTRAINT workouts_date_not_null TO sets_date_not_null;
ALTER TABLE sets RENAME CONSTRAINT workouts_reps_not_null TO sets_reps_not_null;
ALTER TABLE sets RENAME CONSTRAINT workouts_created_at_not_null TO sets_created_at_not_null;
ALTER TABLE sets RENAME CONSTRAINT workouts_updated_at_not_null TO sets_updated_at_not_null;

ALTER TABLE routines RENAME TO workouts;
ALTER TABLE workouts RENAME CONSTRAINT routines_pkey TO workouts_pkey;
ALTER TABLE workouts RENAME CONSTRAINT routines_rounds_check TO workouts_rounds_check;
ALTER TABLE workouts RENAME CONSTRAINT routines_user_id_fkey TO workouts_user_id_fkey;
ALTER INDEX idx_routines_user_id RENAME TO idx_workouts_user_id;
ALTER TABLE workouts RENAME CONSTRAINT routines_id_not_null TO workouts_id_not_null;
ALTER TABLE workouts RENAME CONSTRAINT routines_user_id_not_null TO workouts_user_id_not_null;
ALTER TABLE workouts RENAME CONSTRAINT routines_name_not_null TO workouts_name_not_null;
ALTER TABLE workouts RENAME CONSTRAINT routines_rounds_not_null TO workouts_rounds_not_null;
ALTER TABLE workouts RENAME CONSTRAINT routines_created_at_not_null TO workouts_created_at_not_null;
ALTER TABLE workouts RENAME CONSTRAINT routines_updated_at_not_null TO workouts_updated_at_not_null;

ALTER TABLE routine_exercises RENAME TO workout_exercises;
ALTER TABLE workout_exercises RENAME COLUMN routine_id TO workout_id;
ALTER TABLE workout_exercises RENAME CONSTRAINT routine_exercises_pkey TO workout_exercises_pkey;
ALTER TABLE workout_exercises RENAME CONSTRAINT routine_exercises_reps_check TO workout_exercises_reps_check;
ALTER TABLE workout_exercises RENAME CONSTRAINT routine_exercises_routine_id_fkey TO workout_exercises_workout_id_fkey;
ALTER TABLE workout_exercises RENAME CONSTRAINT routine_exercises_exercise_id_fkey TO workout_exercises_exercise_id_fkey;
ALTER TABLE workout_exercises RENAME CONSTRAINT routine_exercises_routine_id_not_null TO workout_exercises_workout_id_not_null;
ALTER TABLE workout_exercises RENAME CONSTRAINT routine_exercises_position_not_null TO workout_exercises_position_not_null;
ALTER TABLE workout_exercises RENAME CONSTRAINT routine_exercises_exercise_id_not_null TO workout_exercises_exercise_id_not_null;
ALTER TABLE workout_exercises RENAME CONSTRAINT routine_exercises_reps_not_null TO workout_exercises_reps_not_null;

COMMIT;

-- 2026-10-11 : séance réalisée, regroupement des sets (ADR 0007)
ALTER TABLE sets ADD COLUMN session_id uuid;
CREATE INDEX idx_sets_user_session ON sets USING btree (user_id, session_id);

-- 2026-10-11 : unité des exercices, répétitions ou secondes (ADR 0008).
-- La valeur d'un set (sets.reps) et l'objectif d'une séance
-- (workout_exercises.reps) sont des secondes pour un exercice 'seconds'.
ALTER TABLE exercises ADD COLUMN unit text NOT NULL DEFAULT 'reps';
ALTER TABLE exercises ADD CONSTRAINT exercises_unit_check CHECK (unit IN ('reps', 'seconds'));
UPDATE exercises SET unit = 'seconds'
WHERE id IN ('support-hold', 'hollow-body-hold', 'side-plank');

-- 2026-10-11 : exercices aux haltères (programme push / pull / upper)
INSERT INTO exercises (id, name_en, name_fr, liftmanual_url, unit) VALUES
('dumbbell-bench-press', 'Dumbbell Bench Press', 'Développé couché haltères', 'https://liftmanual.com/dumbbell-bench-press/', 'reps'),
('dumbbell-shoulder-press', 'Dumbbell Shoulder Press', 'Développé militaire haltères', 'https://liftmanual.com/dumbbell-standing-biceps-curl-to-shoulder-press/', 'reps'),
('dumbbell-fly', 'Dumbbell Fly', 'Écarté couché haltères', 'liftmanual.com/dumbbell-fly/', 'reps'),
('dumbbell-lateral-raise', 'Dumbbell Lateral Raise', 'Élévation latérale haltères', 'https://liftmanual.com/dumbbell-lateral-raise/', 'reps'),
('dumbbell-front-raise', 'Dumbbell Front Raise', 'Élévation frontale haltères', 'https://liftmanual.com/dumbbell-front-raise/', 'reps'),
('dumbbell-overhead-triceps-extension', 'Dumbbell Overhead Triceps Extension', 'Extension triceps au-dessus de la tête haltère', 'https://liftmanual.com/dumbbell-seated-triceps-extension/', 'reps'),
('one-arm-dumbbell-row', 'One-Arm Dumbbell Row', 'Rowing unilatéral haltère', 'https://liftmanual.com/kettlebell-one-arm-row/', 'reps'),
('dumbbell-bent-over-row', 'Dumbbell Bent-Over Row', 'Rowing haltères buste penché', 'https://liftmanual.com/barbell-bent-over-row/', 'reps'),
('dumbbell-reverse-fly', 'Dumbbell Reverse Fly', 'Oiseau haltères', 'https://liftmanual.com/dumbbell-reverse-fly/', 'reps'),
('dumbbell-curl', 'Dumbbell Curl', 'Curl biceps haltères', 'https://liftmanual.com/dumbbell-standing-biceps-curl/', 'reps'),
('hammer-curl', 'Hammer Curl', 'Curl marteau', 'https://liftmanual.com/dumbbell-hammer-curl/', 'reps'),
('concentration-curl', 'Concentration Curl', 'Curl concentration', 'https://liftmanual.com/dumbbell-concentration-curl/', 'reps'),
('dumbbell-shrug', 'Dumbbell Shrug', 'Shrug haltères', 'https://liftmanual.com/dumbbell-shrug/', 'reps'),
('push-up', 'Push-Up', 'Pompe', 'https://liftmanual.com/push-up/', 'reps'),
('close-grip-push-up', 'Close-Grip Push-Up', 'Pompe serrée', 'https://liftmanual.com/close-grip-push-up/', 'reps'),
('plank', 'Plank', 'Gainage (planche)', 'https://liftmanual.com/plank-on-hands/', 'seconds');

-- 2026-10-11 : nom de la séance réalisée, copié sur ses sets (ADR 0011)
ALTER TABLE sets ADD COLUMN session_name character varying(100);

-- 2026-10-11 : connexion par compte Google (ADR 0013)
ALTER TABLE users ADD COLUMN google_sub text;
CREATE UNIQUE INDEX users_google_sub_unique ON users USING btree (google_sub);

-- 2026-10-22 : retrait des passkeys, tous les comptes sont associés à Google (ADR 0013)
DROP TABLE user_devices;
DROP SEQUENCE IF EXISTS user_devices_id_seq;
DROP INDEX users_name_unique;
ALTER TABLE users ALTER COLUMN google_sub SET NOT NULL;
