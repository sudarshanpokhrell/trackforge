DROP TRIGGER IF EXISTS set_project_comments_updated_at ON project_comments;

DROP INDEX IF EXISTS idx_project_comments_project_id_created_at;

DROP TABLE IF EXISTS project_comments;
