-- label_added / label_removed activities stay: their payloads carry a snapshot
-- of the label, and the enum values predate this migration.
DROP TRIGGER IF EXISTS set_labels_updated_at ON labels;

DROP INDEX IF EXISTS idx_issue_labels_label_id;

DROP TABLE IF EXISTS issue_labels;
DROP TABLE IF EXISTS labels;
