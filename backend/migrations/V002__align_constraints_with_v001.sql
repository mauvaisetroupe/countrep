-- Aligne une base reprise par la ligne de base (la production, migrée à la
-- main) sur V001. Sans effet sur une base créée par V001.

-- Le nom affiché n'est plus unique depuis la connexion Google (ADR 0013) :
-- c'est le prénom du compte Google. Le « DROP INDEX users_name_unique » du
-- 2026-10-22 avait échoué (l'index appartient à une contrainte) : un second
-- compte du même prénom ne pouvait pas se créer.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_name_unique;

-- Une position par exercice choisi : un index unique, comme dans V001, et non
-- une contrainte (même effet, même nom)
ALTER TABLE user_exercises DROP CONSTRAINT IF EXISTS user_exercises_user_id_position_key;
CREATE UNIQUE INDEX IF NOT EXISTS user_exercises_user_id_position_key ON user_exercises USING btree (user_id, position);
