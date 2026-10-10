-- Schéma complet de la base CountRep (PostgreSQL).
-- Référence de l'état actuel, issue d'un dump Adminer du 2026-10-09.
-- Les droits du rôle applicatif et les migrations sont dans database.sql :
-- toute migration doit aussi être reportée ici.

CREATE TABLE exercises (
    id text NOT NULL,
    name_en text NOT NULL,
    name_fr text NOT NULL,
    liftmanual_url text,
    CONSTRAINT exercises_pkey PRIMARY KEY (id)
);

CREATE TABLE users (
    id uuid NOT NULL,
    name character varying(100) NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX users_name_unique ON users USING btree (name);

CREATE SEQUENCE user_devices_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1;

CREATE TABLE user_devices (
    id integer DEFAULT nextval('user_devices_id_seq') NOT NULL,
    user_id uuid,
    credential_id text NOT NULL,
    credential_public_key bytea NOT NULL,
    counter bigint NOT NULL,
    transports text[],
    CONSTRAINT user_devices_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX user_devices_credential_id_key ON user_devices USING btree (credential_id);

CREATE TABLE user_exercises (
    user_id uuid NOT NULL,
    exercise_id text NOT NULL,
    position smallint NOT NULL,
    CONSTRAINT user_exercises_pkey PRIMARY KEY (user_id, exercise_id)
);

CREATE UNIQUE INDEX user_exercises_user_id_position_key ON user_exercises USING btree (user_id, position);

-- Set : une saisie (un exercice, N répétitions, date et heure) — ADR 0006.
-- id généré par le client (UUID) : clé de l'upsert POST /api/sets (ADR 0002)
CREATE TABLE sets (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    exercise character varying(100) NOT NULL,
    date date NOT NULL,
    reps integer NOT NULL,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    deleted_at timestamptz,
    time time without time zone,
    CONSTRAINT sets_pkey PRIMARY KEY (id),
    CONSTRAINT sets_reps_check CHECK (reps > 0)
);

CREATE INDEX idx_sets_user_id ON sets USING btree (user_id);
CREATE INDEX idx_sets_user_date ON sets USING btree (user_id, date);

-- Workout : modèle de séance (exercices + reps, nombre de séries global)
CREATE TABLE workouts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    rounds smallint NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT workouts_pkey PRIMARY KEY (id),
    CONSTRAINT workouts_rounds_check CHECK (rounds > 0)
);

CREATE INDEX idx_workouts_user_id ON workouts USING btree (user_id);

-- Un même exercice peut apparaître plusieurs fois : la clé est la position
CREATE TABLE workout_exercises (
    workout_id uuid NOT NULL,
    position smallint NOT NULL,
    exercise_id text NOT NULL,
    reps integer NOT NULL,
    CONSTRAINT workout_exercises_pkey PRIMARY KEY (workout_id, position),
    CONSTRAINT workout_exercises_reps_check CHECK (reps > 0)
);

ALTER TABLE ONLY user_devices ADD CONSTRAINT user_devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE ONLY user_exercises ADD CONSTRAINT user_exercises_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT;
ALTER TABLE ONLY user_exercises ADD CONSTRAINT user_exercises_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE ONLY sets ADD CONSTRAINT sets_exercise_fkey FOREIGN KEY (exercise) REFERENCES exercises(id) ON DELETE RESTRICT;
ALTER TABLE ONLY sets ADD CONSTRAINT sets_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE ONLY workouts ADD CONSTRAINT workouts_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE ONLY workout_exercises ADD CONSTRAINT workout_exercises_workout_id_fkey FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE;
ALTER TABLE ONLY workout_exercises ADD CONSTRAINT workout_exercises_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT;
