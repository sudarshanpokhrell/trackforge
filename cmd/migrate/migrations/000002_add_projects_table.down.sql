-- Drop triggers
DROP TRIGGER IF EXISTS set_project_members_updated_at ON project_members;
DROP TRIGGER IF EXISTS set_projects_updated_at ON projects;

-- Drop indexes
DROP INDEX IF EXISTS idx_project_members_one_lead;

-- Drop tables
DROP TABLE IF EXISTS project_members;
DROP TABLE IF EXISTS projects;

-- Drop trigger function
DROP FUNCTION IF EXISTS set_updated_at();

-- Drop custom type
DROP TYPE IF EXISTS project_role;

