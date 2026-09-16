
CREATE TABLE IF NOT EXISTS labels (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    name CITEXT NOT NULL,
    color TEXT NOT NULL CONSTRAINT labels_color_hex CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
    created_by UUID REFERENCES users (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT labels_project_name_unique UNIQUE (project_id, name),
    CONSTRAINT labels_id_project_unique UNIQUE (id, project_id)
);

CREATE TABLE IF NOT EXISTS issue_labels (
    issue_id BIGINT NOT NULL,
    label_id BIGINT NOT NULL,
    project_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (issue_id, label_id),
    CONSTRAINT issue_labels_issue_fk
        FOREIGN KEY (issue_id, project_id) REFERENCES issues (id, project_id) ON DELETE CASCADE,
    CONSTRAINT issue_labels_label_fk
        FOREIGN KEY (label_id, project_id) REFERENCES labels (id, project_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_issue_labels_label_id ON issue_labels (label_id);

CREATE OR REPLACE TRIGGER set_labels_updated_at
  BEFORE UPDATE ON labels
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
