DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('superadmin', 'admin', 'member');
  END IF;
END
$$;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role                 user_role   NOT NULL DEFAULT 'member',
    ADD COLUMN IF NOT EXISTS is_active            boolean     NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS must_change_password boolean     NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS updated_at           timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS users_single_superadmin ON users (role) WHERE role = 'superadmin';


CREATE OR REPLACE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
