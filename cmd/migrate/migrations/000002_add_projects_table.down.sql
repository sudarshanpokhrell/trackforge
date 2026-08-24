DROP TRIGGER IF EXISTS set_project_memberships_updated_at ON project_memberships;
DROP TRIGGER IF EXISTS set_projects_updated_at ON projects;

DROP INDEX IF EXISTS idx_projects_lead_id;
DROP INDEX IF EXISTS idx_projects_created_by;
DROP INDEX IF EXISTS idx_project_memberships_user_id;

DROP TABLE IF EXISTS project_memberships;
DROP TABLE IF EXISTS projects;

DROP FUNCTION IF EXISTS set_updated_at();

DROP TYPE IF EXISTS project_role;
