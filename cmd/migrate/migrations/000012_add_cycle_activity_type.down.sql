-- Postgres can't remove a value from an enum. 'cycle_changed' stays; nothing
-- writes it once the cycles code is gone, and old rows keep reading correctly.
SELECT 1;
