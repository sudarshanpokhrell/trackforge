# TrackForge — Database Schema


## 1. Tables

```
users
  id           uuid  pk  default gen_random_uuid()
  name         varchar(255)
  email        citext  unique
  password     bytea            -- bcrypt hash
  created_at   timestamptz

projects
  id           bigserial  pk
  name         text  not null
  description  text
  start_date   date  default CURRENT_DATE
  target_date  date
  created_by   uuid  not null  → users(id)  ON DELETE RESTRICT
  lead_id      uuid           → users(id)  ON DELETE SET NULL
  version      integer  not null  default 1
  created_at   timestamptz
  updated_at   timestamptz      -- maintained by trigger

project_memberships
  id           bigserial  pk
  project_id   bigint  not null  → projects(id)  ON DELETE CASCADE
  user_id      uuid    not null  → users(id)     ON DELETE CASCADE
  role         project_role  not null  default 'editor'
  created_at   timestamptz
  updated_at   timestamptz      -- maintained by trigger
  UNIQUE (project_id, user_id)             -- one role per person per project
```

### Indexes

| Index | Why |
|---|---|
| `idx_project_memberships_user_id` | `project_memberships_unique` is `(project_id, user_id)`; a composite index only serves lookups on a **leading prefix**, so it cannot help `WHERE user_id = $1` — which is what "list my projects" does |
| `idx_projects_created_by` | same, for the creator half of that query |
| `idx_projects_lead_id` | "projects I lead" |

