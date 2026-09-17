DROP INDEX IF EXISTS idx_issues_cycle_id;

ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_cycle_fk;
ALTER TABLE issues DROP COLUMN IF EXISTS cycle_id;

DROP TRIGGER IF EXISTS set_cycles_updated_at ON cycles;
DROP INDEX IF EXISTS idx_cycles_project_start;
DROP TABLE IF EXISTS cycles;

ALTER TABLE projects DROP COLUMN IF EXISTS cycles_enabled;

-- btree_gist stays: dropping an extension other objects may use is not this
-- migration's call, and leaving it installed is harmless.
