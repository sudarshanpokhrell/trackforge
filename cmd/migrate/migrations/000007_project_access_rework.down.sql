ALTER TABLE issue_assignees
    DROP CONSTRAINT IF EXISTS issue_assignees_member_fk,
    DROP CONSTRAINT IF EXISTS issue_assignees_issue_fk,
    DROP COLUMN IF EXISTS project_id;

ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_id_project_unique;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES users (id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_projects_lead_id ON projects (lead_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_role') THEN
    CREATE TYPE project_role AS ENUM ('viewer', 'editor', 'admin');
  END IF;
END
$$;

ALTER TABLE project_memberships
    ADD COLUMN IF NOT EXISTS role project_role NOT NULL DEFAULT 'editor';
