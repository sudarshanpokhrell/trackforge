-- Project roles come back, narrower than before: a project admin runs the
-- project's settings and people, a contributor does the work. The type gets a
-- new name because 000007's down migration re-creates the old project_role.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_member_role') THEN
    CREATE TYPE project_member_role AS ENUM ('admin', 'contributor');
  END IF;
END
$$;

ALTER TABLE project_memberships
    ADD COLUMN IF NOT EXISTS role project_member_role NOT NULL DEFAULT 'contributor';

-- Every project's creator becomes its admin. 000007 stopped adding creators as
-- members, so insert the row where it is missing and upgrade it where it exists.
INSERT INTO project_memberships (project_id, user_id, role)
SELECT id, created_by, 'admin' FROM projects
ON CONFLICT (project_id, user_id) DO UPDATE SET role = 'admin';

-- "Who are the admins of project X" backs the last-admin check.
CREATE INDEX IF NOT EXISTS idx_project_memberships_admins
    ON project_memberships (project_id) WHERE role = 'admin';
