-- Its own migration: Postgres won't use an enum value inside the transaction
-- that added it.
ALTER TYPE issue_activity_type ADD VALUE IF NOT EXISTS 'cycle_changed';
