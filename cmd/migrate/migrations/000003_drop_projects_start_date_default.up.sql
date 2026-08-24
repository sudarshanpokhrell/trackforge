-- start_date is only set when the caller explicitly provides one; an omitted
-- date stays NULL instead of silently becoming "today".
ALTER TABLE projects ALTER COLUMN start_date DROP DEFAULT;
