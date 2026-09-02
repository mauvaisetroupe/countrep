GRANT USAGE, SELECT ON SEQUENCE user_devices_id_seq TO countrep_app;
GRANT USAGE ON SCHEMA public TO countrep_app;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE users, workouts, user_devices
TO countrep_app;

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
