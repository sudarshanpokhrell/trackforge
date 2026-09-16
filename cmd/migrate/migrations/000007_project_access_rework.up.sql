-- Membership becomes yes/no: your user role decides what you may do, being in a
-- project only decides what you can see.
ALTER TABLE project_memberships DROP COLUMN IF EXISTS role;
DROP TYPE IF EXISTS project_role;

-- No project lead. Anything needing more power than a member is done by an admin.
DROP INDEX IF EXISTS idx_projects_lead_id;
ALTER TABLE projects DROP COLUMN IF EXISTS lead_id;

-- Assignees must be project members. The database enforces it with a composite
-- foreign key, so removing someone from a project unassigns them automatically.
ALTER TABLE issues ADD CONSTRAINT issues_id_project_unique UNIQUE (id, project_id);

ALTER TABLE issue_assignees ADD COLUMN IF NOT EXISTS project_id BIGINT;

UPDATE issue_assignees ia SET project_id = i.project_id
FROM issues i WHERE i.id = ia.issue_id;

-- Drop assignments that predate the rule.
DELETE FROM issue_assignees ia
WHERE NOT EXISTS (
    SELECT 1 FROM project_memberships pm
    WHERE pm.project_id = ia.project_id AND pm.user_id = ia.user_id
);

ALTER TABLE issue_assignees
    ALTER COLUMN project_id SET NOT NULL,
    ADD CONSTRAINT issue_assignees_issue_fk
        FOREIGN KEY (issue_id, project_id) REFERENCES issues (id, project_id) ON DELETE CASCADE,
    ADD CONSTRAINT issue_assignees_member_fk
        FOREIGN KEY (project_id, user_id) REFERENCES project_memberships (project_id, user_id) ON DELETE CASCADE;
