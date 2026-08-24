CREATE TABLE IF NOT EXISTS project_comments (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    project_id BIGINT NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,

    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Serves the only read this table has: one project's comments, newest first.
-- Composite so the index satisfies both the filter and the ordering.
CREATE INDEX IF NOT EXISTS idx_project_comments_project_id_created_at
    ON project_comments (project_id, created_at DESC);

CREATE OR REPLACE TRIGGER set_project_comments_updated_at
  BEFORE UPDATE ON project_comments
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
