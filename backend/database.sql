GRANT USAGE, SELECT ON SEQUENCE user_devices_id_seq TO countrep_app;
GRANT USAGE ON SCHEMA public TO countrep_app;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE users, workouts, user_devices
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
