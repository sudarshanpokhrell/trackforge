-- An empty string means "no emoji"; the UI falls back to a generic icon.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS emoji TEXT NOT NULL DEFAULT '';
