-- The creator memberships the up migration backfilled stay: they are valid
-- yes/no memberships under 000007 too.
DROP INDEX IF EXISTS idx_project_memberships_admins;

ALTER TABLE project_memberships DROP COLUMN IF EXISTS role;

DROP TYPE IF EXISTS project_member_role;
