-- 0005_drop_hometown.sql
-- Drops the hometown column from users. The form stopped writing it a few
-- commits back and NomadCard stopped rendering it; this removes the dead
-- column entirely so future schema reads aren't carrying a dropped field.
--
-- DROP COLUMN is destructive — any data still in this column is lost. Run
-- only when you've confirmed no user-visible flow still depends on it.

ALTER TABLE users DROP COLUMN IF EXISTS hometown;
