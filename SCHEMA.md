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
  start_date   date
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

project_comments
  id           bigserial  pk
  content      text  not null
  project_id   bigint  not null  → projects(id)  ON DELETE CASCADE
  created_by   uuid    not null  → users(id)     ON DELETE CASCADE
  version      integer  not null  default 1
  created_at   timestamptz
  updated_at   timestamptz      -- maintained by trigger

issues
  id           bigserial  pk
  project_id   bigint  not null  → projects(id)  ON DELETE CASCADE
  author_id    uuid    not null  → users(id)     ON DELETE RESTRICT
  title        text  not null
  description  text
  status       issue_status    not null  default 'backlog'
  priority     issue_priority  not null  default 'no-priority'
  version      integer  not null  default 1
  created_at   timestamptz
  updated_at   timestamptz      -- maintained by trigger

issue_assignees                  -- join table: an issue may have many assignees
  issue_id     bigint  not null  → issues(id)  ON DELETE CASCADE
  user_id      uuid    not null  → users(id)   ON DELETE CASCADE
  created_at   timestamptz
  PRIMARY KEY (issue_id, user_id)          -- a person is assigned at most once

issue_comments
  id           bigserial  pk
  issue_id     bigint  not null  → issues(id)  ON DELETE CASCADE
  author_id    uuid    not null  → users(id)   ON DELETE CASCADE
  content      text  not null
  version      integer  not null  default 1
  created_at   timestamptz
  updated_at   timestamptz      -- maintained by trigger

issue_activities                 -- append-only audit trail; no updated_at, no trigger
  id           bigserial  pk
  issue_id     bigint  not null  → issues(id)  ON DELETE CASCADE
  type         issue_activity_type  not null
  actor_id     uuid    not null  → users(id)   ON DELETE RESTRICT
  payload      jsonb   not null  default '{}'  -- shape varies by type, e.g. {"from":"todo","to":"done"}
  created_at   timestamptz
```

### Indexes

| Index | Why |
|---|---|
| `idx_project_memberships_user_id` | `project_memberships_unique` is `(project_id, user_id)`; a composite index only serves lookups on a **leading prefix**, so it cannot help `WHERE user_id = $1` — which is what "list my projects" does |
| `idx_projects_created_by` | same, for the creator half of that query |
| `idx_projects_lead_id` | "projects I lead" |
| `idx_project_comments_project_id_created_at` | the feed read — one project's comments, newest first. Composite, so a single index serves both the filter and the ordering and Postgres never sorts. Only pays off once the query carries a `LIMIT` |
| `idx_issues_project_id_created_at` | the board/list read — one project's issues, newest first; same composite reasoning as the comment feed |
| `idx_issue_assignees_user_id` | "issues assigned to me". The PK `(issue_id, user_id)` already answers "who is on this issue"; it cannot answer this one, since `user_id` is not a leading prefix — the same reason `idx_project_memberships_user_id` exists |
| `idx_issues_author_id` | "issues I filed"; also keeps the `ON DELETE RESTRICT` check on `users` from scanning the table |
| `idx_issue_comments_issue_id_created_at` | one issue's comment thread, newest first |
| `idx_issue_activities_issue_created` | one issue's timeline, **oldest first** — an audit trail reads forward, unlike the comment feeds |

## 2. Enums

| Type | Values |
|---|---|
| `project_role` | `viewer`, `editor`, `admin` |
| `issue_status` | `backlog`, `todo`, `in-progress`, `done`, `cancelled` |
| `issue_priority` | `no-priority`, `urgent`, `high`, `medium`, `low` |
| `issue_activity_type` | `created`, `title_changed`, `description_changed`, `status_changed`, `priority_changed`, `assignee_changed`, `label_added`, `label_removed` |

Migrations create enums inside a `DO $$ ... IF NOT EXISTS (SELECT 1 FROM pg_type ...)` guard, because bare `CREATE TYPE` has no `IF NOT EXISTS` form and would break a re-run.

> `label_added` / `label_removed` are declared but unused — there is no labels table yet. Enum values are painful to remove once present, so they were left in place rather than added later.

