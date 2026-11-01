-- Schéma de la base CountRep et catalogue des exercices, version 1 (ADR 0017).
-- Repris de schema.sql (dump du 2026-10-09 et migrations à la main jusqu'au
-- 2026-10-22) et du catalogue servi par la production le 2026-11-01.
-- Une base existante, créée avant Flyway, reprend à cette version par une
-- ligne de base (FLYWAY_BASELINE_VERSION=1, docs/exploitation.md) : ce
-- fichier n'y est jamais exécuté. Ne jamais le modifier : un changement de
-- schéma ou du catalogue est une nouvelle migration (V002__…).

CREATE TABLE exercises (
    id text NOT NULL,
    name_en text NOT NULL,
    name_fr text NOT NULL,
    liftmanual_url text,
    -- Unité de la valeur d'un set : répétitions ou secondes (ADR 0008)
    unit text DEFAULT 'reps' NOT NULL,
    CONSTRAINT exercises_pkey PRIMARY KEY (id),
    CONSTRAINT exercises_unit_check CHECK (unit IN ('reps', 'seconds'))
);

CREATE TABLE users (
    id uuid NOT NULL,
    name character varying(100) NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    -- Identifiant du compte Google associé (ADR 0013), sans e-mail
    google_sub text NOT NULL,
    CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX users_google_sub_unique ON users USING btree (google_sub);

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
    -- Séance réalisée dont le set fait partie (id de la preview) ; NULL pour
    -- une saisie isolée. Pas de clé étrangère : rien n'est stocké d'autre
    -- sur la séance (ADR 0007)
    session_id uuid,
    -- Nom de la séance au moment de l'enregistrement (copie, pas une
    -- référence au modèle) ; NULL pour une saisie isolée (ADR 0011)
    session_name character varying(100),
    CONSTRAINT sets_pkey PRIMARY KEY (id),
    CONSTRAINT sets_reps_check CHECK (reps > 0)
);

CREATE INDEX idx_sets_user_id ON sets USING btree (user_id);
CREATE INDEX idx_sets_user_date ON sets USING btree (user_id, date);
CREATE INDEX idx_sets_user_session ON sets USING btree (user_id, session_id);

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

ALTER TABLE ONLY user_exercises ADD CONSTRAINT user_exercises_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT;
ALTER TABLE ONLY user_exercises ADD CONSTRAINT user_exercises_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE ONLY sets ADD CONSTRAINT sets_exercise_fkey FOREIGN KEY (exercise) REFERENCES exercises(id) ON DELETE RESTRICT;
ALTER TABLE ONLY sets ADD CONSTRAINT sets_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE ONLY workouts ADD CONSTRAINT workouts_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE ONLY workout_exercises ADD CONSTRAINT workout_exercises_workout_id_fkey FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE;
ALTER TABLE ONLY workout_exercises ADD CONSTRAINT workout_exercises_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT;

-- Catalogue des exercices (ADR 0008, 0014) : une saisie doit citer un
-- exercice existant (sets_exercise_fkey). Copie embarquée dans l'application :
-- frontend/src/data/exercises.json (scripts/update-catalog.mjs).
INSERT INTO exercises (id, name_en, name_fr, liftmanual_url, unit) VALUES
('band-hip-abduction', 'Band Hip Abduction', 'Abduction de la hanche', 'https://liftmanual.com/band-hip-abduction/', 'reps'),
('band-lateral-raise', 'Band Lateral Raise', 'Élévation latérale avec bande élastique', 'https://liftmanual.com/band-lateral-raise/', 'reps'),
('band-overhead-triceps-extension', 'Band Overhead Triceps Extension', 'Extension triceps au-dessus de la tête avec bande élastique', 'https://liftmanual.com/band-overhead-triceps-extension/', 'reps'),
('band-shoulder-press', 'Band shoulder press', 'Développé épaules avec bande élastique', 'https://liftmanual.com/band-shoulder-press/', 'reps'),
('band-shrug', 'Band Shrug', 'Élévation des épaules avec bande élastique', 'https://liftmanual.com/band-shrug/', 'reps'),
('band-squat', 'Band Squat', 'Squat avec bande élastique', 'https://liftmanual.com/band-squat/', 'reps'),
('band-standing-chest-press-anchor', 'Band Standing Chest Press (Anchor point)', 'Développé poitrine avec bande élastique (point d’ancrage)', 'https://liftmanual.com/band-standing-chest-press/', 'reps'),
('band-standing-chest-press-self-anchored', 'Band Standing Chest Press (Self-Anchored)', 'Développé poitrine avec bande élastique (élastique dans le dos)', 'https://liftmanual.com/band-standing-chest-press/', 'reps'),
('band-standing-chest-press-under-feet', 'Band Standing Chest Press (band under feet)', 'Développé poitrine avec bande élastique (élastique sous les pieds)', NULL, 'reps'),
('band-thrusters', 'Band Thrusters', 'Squat avec développé épaules', 'https://liftmanual.com/band-thruster/', 'reps'),
('band-upright-row', 'Band Upright Row', 'Tirage vertical / tirage menton', 'https://liftmanual.com/band-upright-row/', 'reps'),
('banded-deadlift', 'Banded Deadlift', 'Soulevé de terre avec bande élastique', 'https://liftmanual.com/band-deadlift/', 'reps'),
('banded-hip-hinge', 'Banded Hip Hinge', 'Bascule de hanches avec élastique', 'https://liftmanual.com/pvc-hip-hinge/', 'reps'),
('bench-dip-on-floor', 'Bench dip on floor', 'Dips sur banc', 'https://liftmanual.com/bench-dip-on-floor/', 'reps'),
('bent-over-row-band', 'Bent-over Row with band', 'Tirage buste penché avec élastique', 'https://liftmanual.com/resistance-band-bent-over-row/', 'reps'),
('bent-over-row-band-front', 'Bent-over Row with band (front)', 'Tirage buste penché avec élastique', NULL, 'reps'),
('biceps-curl-band', 'Biceps curl with band', 'Curl biceps avec bande élastique', 'https://liftmanual.com/band-biceps-curl/', 'reps'),
('bird-dog-band', 'Bird dog with band', 'Bird dog avec élastique', 'https://liftmanual.com/resistance-band-bird-dog/', 'reps'),
('bodyweight-skull-crusher', 'Bodyweight Skull Crusher', 'Skull Crusher au poids du corps', NULL, 'reps'),
('bodyweight-squat', 'Bodyweight Squat', 'Squat au poids du corps', 'https://liftmanual.com/air-squat/', 'reps'),
('burpee', 'Burpee', 'Burpee', 'https://liftmanual.com/burpee/', 'reps'),
('close-grip-push-up', 'Close-Grip Push-Up', 'Pompe serrée', 'https://liftmanual.com/close-grip-push-up/', 'reps'),
('concentration-curl', 'Concentration Curl', 'Curl concentration', 'https://liftmanual.com/dumbbell-concentration-curl/', 'reps'),
('crunch', 'Crunch', 'Crunch', 'https://liftmanual.com/crunch-hold/', 'reps'),
('curl-to-press-band', 'Curl to press with band', 'Curl + développé avec bande élastique', 'https://liftmanual.com/dumbbell-curl-to-press/', 'reps'),
('dumbbell-bench-press', 'Dumbbell Bench Press', 'Développé couché haltères', 'https://liftmanual.com/dumbbell-bench-press/', 'reps'),
('dumbbell-bent-over-row', 'Dumbbell Bent-Over Row', 'Rowing haltères buste penché', 'https://liftmanual.com/barbell-bent-over-row/', 'reps'),
('dumbbell-curl', 'Dumbbell Curl', 'Curl biceps haltères', 'https://liftmanual.com/dumbbell-standing-biceps-curl/', 'reps'),
('dumbbell-fly', 'Dumbbell Fly', 'Écarté couché haltères', 'liftmanual.com/dumbbell-fly/', 'reps'),
('dumbbell-front-raise', 'Dumbbell Front Raise', 'Élévation frontale haltères', 'https://liftmanual.com/dumbbell-front-raise/', 'reps'),
('dumbbell-lateral-raise', 'Dumbbell Lateral Raise', 'Élévation latérale haltères', 'https://liftmanual.com/dumbbell-lateral-raise/', 'reps'),
('dumbbell-overhead-triceps-extension', 'Dumbbell Overhead Triceps Extension', 'Extension triceps au-dessus de la tête haltère', 'https://liftmanual.com/dumbbell-seated-triceps-extension/', 'reps'),
('dumbbell-reverse-fly', 'Dumbbell Reverse Fly', 'Oiseau haltères', 'https://liftmanual.com/dumbbell-reverse-fly/', 'reps'),
('dumbbell-shoulder-press', 'Dumbbell Shoulder Press', 'Développé militaire haltères', 'https://liftmanual.com/dumbbell-standing-biceps-curl-to-shoulder-press/', 'reps'),
('dumbbell-shrug', 'Dumbbell Shrug', 'Shrug haltères', 'https://liftmanual.com/dumbbell-shrug/', 'reps'),
('front-to-side-plank', 'Front to side plank', 'Transition planche – planche latérale', 'https://liftmanual.com/front-to-side-plank/', 'reps'),
('good-morning-band', 'Good morning with band', 'Good Morning avec bande élastique', 'https://liftmanual.com/band-good-morning/', 'reps'),
('hammer-curl', 'Hammer Curl', 'Curl marteau', 'https://liftmanual.com/dumbbell-hammer-curl/', 'reps'),
('high-bar-inverted-row', 'High Bar Inverted Row', 'Traction inversée ou australienne', 'https://liftmanual.com/high-bar-inverted-row/', 'reps'),
('hollow-body-hold', 'Hollow body hold', 'Maintien en position creuse', 'https://liftmanual.com/hollow-hold/', 'seconds'),
('incline-band-chest-fly', 'Incline Band Chest Fly', 'Écarté incliné vers le bas avec bande élastique', 'https://liftmanual.com/cable-standing-fly/', 'reps'),
('incline-push-up', 'Incline push-up', 'Pompe inclinée', 'https://liftmanual.com/incline-push-up/', 'reps'),
('jump-squat-band', 'Jump squat with band', 'Squat sauté avec élastique', 'https://liftmanual.com/barbell-jump-squat/', 'reps'),
('leg-curl-band', 'Leg curl with band', 'Leg curl avec bande élastique', 'https://liftmanual.com/resistance-band-leg-curl/', 'reps'),
('leg-extension-band', 'Leg extension with band', 'Leg extension avec élastique', 'https://liftmanual.com/resistance-band-leg-extension/', 'reps'),
('leg-press-band', 'Leg press with band', 'Leg press avec élastique', 'https://www.rubberbanditz.com/leg-press/', 'reps'),
('lunge', 'Lunge', 'Fente', 'https://liftmanual.com/lunge/', 'reps'),
('one-arm-dumbbell-row', 'One-Arm Dumbbell Row', 'Rowing unilatéral haltère', 'https://liftmanual.com/kettlebell-one-arm-row/', 'reps'),
('plank', 'Plank', 'Gainage (planche)', 'https://liftmanual.com/plank-on-hands/', 'seconds'),
('push-up', 'Push-Up', 'Pompe', 'https://liftmanual.com/push-up/', 'reps'),
('resistance-band-pull-apart', 'Resistance Band Pull Apart', 'Écarté avec bande élastique', 'https://liftmanual.com/resistance-band-pull-apart/', 'reps'),
('reverse-crunch', 'Reverse crunch', 'Crunch inversé', 'https://liftmanual.com/reverse-crunch/', 'reps'),
('reverse-lunge-band', 'Rear/reverse lunge with band', 'Fente arrière', 'https://liftmanual.com/bodyweight-rear-lunge/', 'reps'),
('ring-chest-fly', 'Ring Chest Fly', 'Écarté aux anneaux', 'https://liftmanual.com/ring-chest-fly/', 'reps'),
('ring-high-row', 'Ring High Row', 'Tirage haut aux anneaux', 'https://liftmanual.com/ring-high-row/', 'reps'),
('ring-reverse-fly', 'Ring Reverse Fly', 'Écarté inversé aux anneaux', 'https://liftmanual.com/ring-reverse-fly/', 'reps'),
('seated-row-band', 'Seated row with band', 'Tirage assis avec bande élastique', 'https://liftmanual.com/cable-rope-seated-row', 'reps'),
('side-plank', 'Side plank', 'Planche latérale', 'https://liftmanual.com/side-plank/', 'seconds'),
('single-arm-banded-chest-fly', 'Single-arm banded chest fly', 'Écarté horizontal unilatéral avec bande', NULL, 'reps'),
('split-squat', 'Split squat', 'Fente stationnaire / split squat', 'https://liftmanual.com/split-squats/', 'reps'),
('standing-banded-row-anchor', 'Standing Banded Row (Anchor point)', 'Tirage horizontal debout avec bande élastique (point d’ancrage)', 'https://liftmanual.com/cable-standing-row/', 'reps'),
('standing-calf-raise', 'Standing Calf Raise', 'Montée de mollets', 'https://liftmanual.com/standing-calf-raise/', 'reps'),
('sumo-deadlift-high-pull-band', 'Sumo Deadlift High Pull with band', 'Soulevé de terre + tirage', 'https://liftmanual.com/kettlebell-sumo-high-pull/', 'reps'),
('supinated-high-bar-inverted-row', 'Supinated High Bar Inverted Row', 'Traction inversée ou australienne – supination', 'https://liftmanual.com/supinated-grip-inverted-row/', 'reps'),
('support-hold', 'Support Hold', 'Maintien en appui aux anneaux', NULL, 'seconds');
