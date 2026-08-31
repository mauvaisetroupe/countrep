GRANT USAGE, SELECT ON SEQUENCE user_devices_id_seq TO countrep_app;
GRANT USAGE ON SCHEMA public TO countrep_app;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE users, workouts, user_devices
TO countrep_app;