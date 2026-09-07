DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'issue_status') THEN
    CREATE TYPE issue_status AS ENUM ('backlog', 'todo', 'in-progress', 'done', 'cancelled');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'issue_priority') THEN
    CREATE TYPE issue_priority AS ENUM ('no-priority', 'urgent', 'high', 'medium', 'low');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'issue_activity_type') THEN
    CREATE TYPE issue_activity_type AS ENUM (
      'created', 'title_changed', 'description_changed', 'status_changed',
      'priority_changed', 'assignee_changed', 'label_added', 'label_removed'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS issues (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,

    title TEXT NOT NULL,
    description TEXT,
    status issue_status NOT NULL DEFAULT 'backlog',
    priority issue_priority NOT NULL DEFAULT 'no-priority',

    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- An issue may have any number of assignees, so assignment lives in its own
-- table rather than a column on issues.
CREATE TABLE IF NOT EXISTS issue_assignees (
    issue_id BIGINT NOT NULL REFERENCES issues (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (issue_id, user_id)
);

CREATE TABLE IF NOT EXISTS issue_comments (
    id BIGSERIAL PRIMARY KEY,
    issue_id BIGINT NOT NULL REFERENCES issues (id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    content TEXT NOT NULL,

    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS issue_activities (
    id BIGSERIAL PRIMARY KEY,
    issue_id BIGINT NOT NULL REFERENCES issues (id) ON DELETE CASCADE,
    type issue_activity_type NOT NULL,
    actor_id UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One project's issue list, newest first: composite so the index satisfies
-- both the filter and the ordering.
CREATE INDEX IF NOT EXISTS idx_issues_project_id_created_at
    ON issues (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_issues_author_id ON issues (author_id);

CREATE INDEX IF NOT EXISTS idx_issue_assignees_user_id
    ON issue_assignees (user_id);

CREATE INDEX IF NOT EXISTS idx_issue_comments_issue_id_created_at
    ON issue_comments (issue_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_issue_activities_issue_created
    ON issue_activities (issue_id, created_at);

CREATE OR REPLACE TRIGGER set_issues_updated_at
  BEFORE UPDATE ON issues
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER set_issue_comments_updated_at
  BEFORE UPDATE ON issue_comments
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
