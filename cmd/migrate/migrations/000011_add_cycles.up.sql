-- The exclusion constraint below needs btree_gist to mix "=" on a bigint with
-- "&&" on a range in one GiST index.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Cycles (sprints) are opt-in per project.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cycles_enabled BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS cycles (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES users (id) ON DELETE SET NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT cycles_dates_ordered CHECK (end_date >= start_date),
    -- What issues' composite FK points at.
    CONSTRAINT cycles_id_project_unique UNIQUE (id, project_id),
    -- Cycles in one project never overlap; the database enforces it.
    CONSTRAINT cycles_no_overlap EXCLUDE USING gist (
        project_id WITH =,
        daterange(start_date, end_date, '[]') WITH &&
    )
);

CREATE INDEX IF NOT EXISTS idx_cycles_project_start ON cycles (project_id, start_date DESC);

CREATE OR REPLACE TRIGGER set_cycles_updated_at
  BEFORE UPDATE ON cycles
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- An issue's cycle must belong to the issue's own project. Deleting a cycle
-- only clears cycle_id, not project_id (SET NULL with a column list, PG15+).
ALTER TABLE issues ADD COLUMN IF NOT EXISTS cycle_id BIGINT;

ALTER TABLE issues
    ADD CONSTRAINT issues_cycle_fk FOREIGN KEY (cycle_id, project_id)
        REFERENCES cycles (id, project_id) ON DELETE SET NULL (cycle_id);

CREATE INDEX IF NOT EXISTS idx_issues_cycle_id ON issues (cycle_id) WHERE cycle_id IS NOT NULL;
