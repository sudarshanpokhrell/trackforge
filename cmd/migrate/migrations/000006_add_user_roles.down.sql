DROP TRIGGER IF EXISTS set_users_updated_at ON users;

DROP INDEX IF EXISTS users_single_superadmin;

ALTER TABLE users
    DROP COLUMN IF EXISTS updated_at,
    DROP COLUMN IF EXISTS must_change_password,
    DROP COLUMN IF EXISTS is_active,
    DROP COLUMN IF EXISTS role;

DROP TYPE IF EXISTS user_role;
