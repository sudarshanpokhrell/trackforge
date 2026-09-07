DROP TRIGGER IF EXISTS set_issue_comments_updated_at ON issue_comments;
DROP TRIGGER IF EXISTS set_issues_updated_at ON issues;

DROP INDEX IF EXISTS idx_issue_activities_issue_created;
DROP INDEX IF EXISTS idx_issue_comments_issue_id_created_at;
DROP INDEX IF EXISTS idx_issues_author_id;
DROP INDEX IF EXISTS idx_issue_assignees_user_id;
DROP INDEX IF EXISTS idx_issues_project_id_created_at;

DROP TABLE IF EXISTS issue_assignees;
DROP TABLE IF EXISTS issue_activities;
DROP TABLE IF EXISTS issue_comments;
DROP TABLE IF EXISTS issues;

DROP TYPE IF EXISTS issue_activity_type;
DROP TYPE IF EXISTS issue_priority;
DROP TYPE IF EXISTS issue_status;
