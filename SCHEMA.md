# TrackForge — Database Schema


## 1. Tables

```
users
  id                    uuid  pk  default gen_random_uuid()
  name                  varchar(255)
  email                 citext  unique
  password              bytea            -- bcrypt hash
  role                  user_role  not null  default 'member'
  is_active             boolean    not null  default true    -- users are deactivated, never deleted
  must_change_password  boolean    not null  default false
  created_at            timestamptz
  updated_at            timestamptz      -- maintained by trigger

projects
  id           bigserial  pk
  name         text  not null
  description  text
  start_date   date
  target_date  date
  created_by   uuid  not null  → users(id)  ON DELETE RESTRICT
  version      integer  not null  default 1
  created_at   timestamptz
  updated_at   timestamptz      -- maintained by trigger

project_memberships              -- membership is yes/no: users.role decides what you may do
  id           bigserial  pk
  project_id   bigint  not null  → projects(id)  ON DELETE CASCADE
  user_id      uuid    not null  → users(id)     ON DELETE CASCADE
  created_at   timestamptz
  updated_at   timestamptz      -- maintained by trigger
  UNIQUE (project_id, user_id)             -- one row per person per project

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
  UNIQUE (id, project_id)  -- redundant on its own; it is what issue_assignees'
                           -- composite FK points at

issue_assignees                  -- join table: an issue may have many assignees
  issue_id     bigint  not null  → issues(id)  ON DELETE CASCADE
  project_id   bigint  not null           -- denormalised from the issue
  user_id      uuid    not null  → users(id)   ON DELETE CASCADE
  created_at   timestamptz
  PRIMARY KEY (issue_id, user_id)          -- a person is assigned at most once
  FOREIGN KEY (issue_id, project_id)
      → issues(id, project_id)              ON DELETE CASCADE
  FOREIGN KEY (project_id, user_id)
      → project_memberships(project_id, user_id)  ON DELETE CASCADE

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
| `users_single_superadmin` | partial **unique** index on `role` where `role = 'superadmin'`: the database guarantees at most one superadmin, so two racing `POST /setup` requests can't both succeed. Not there for lookups |
| `idx_project_memberships_user_id` | `project_memberships_unique` is `(project_id, user_id)`; a composite index only serves lookups on a **leading prefix**, so it cannot help `WHERE user_id = $1` — which is what "list my projects" does |
| `idx_projects_created_by` | "projects I created"; also keeps the `ON DELETE RESTRICT` check on `users` from scanning the table |
| `idx_project_comments_project_id_created_at` | the feed read — one project's comments, newest first. Composite, so a single index serves both the filter and the ordering and Postgres never sorts. Only pays off once the query carries a `LIMIT` |
| `idx_issues_project_id_created_at` | the board/list read — one project's issues, newest first; same composite reasoning as the comment feed |
| `idx_issue_assignees_user_id` | "issues assigned to me". The PK `(issue_id, user_id)` already answers "who is on this issue"; it cannot answer this one, since `user_id` is not a leading prefix — the same reason `idx_project_memberships_user_id` exists |
| `idx_issues_author_id` | "issues I filed"; also keeps the `ON DELETE RESTRICT` check on `users` from scanning the table |
| `idx_issue_comments_issue_id_created_at` | one issue's comment thread, newest first |
| `idx_issue_activities_issue_created` | one issue's timeline, **oldest first** — an audit trail reads forward, unlike the comment feeds |

## 2. Enums

| Type | Values |
|---|---|
| `user_role` | `superadmin`, `admin`, `member` |
| `issue_status` | `backlog`, `todo`, `in-progress`, `done`, `cancelled` |
| `issue_priority` | `no-priority`, `urgent`, `high`, `medium`, `low` |
| `issue_activity_type` | `created`, `title_changed`, `description_changed`, `status_changed`, `priority_changed`, `assignee_changed`, `label_added`, `label_removed` |

Migrations create enums inside a `DO $$ ... IF NOT EXISTS (SELECT 1 FROM pg_type ...)` guard, because bare `CREATE TYPE` has no `IF NOT EXISTS` form and would break a re-run.

> `label_added` / `label_removed` are declared but unused — there is no labels table yet. Enum values are painful to remove once present, so they were left in place rather than added later.

## 3. Access model

One install is one organization, so there is no workspace table: the whole app is
the workspace. Authorization has exactly two inputs.

- **`users.role`** (`superadmin` > `admin` > `member`) decides *what* you may do.
  It is read from the database on every request, never carried in the JWT, so a
  promotion, demotion or deactivation takes effect immediately.
- **`project_memberships`** decides *which projects you can see*. It is yes/no;
  there is no per-project role and no project lead. Admins and the superadmin see
  every project without a membership row, but still have to be added as members to
  be **assigned** issues.

No access to a project is a `404`, not a `403`: a `403` would confirm that a
project you have no business knowing about exists.

### The assignee rule is a foreign key

An assignee must be a member of the issue's project. Rather than check that in the
handler — where it would race with a concurrent removal — `issue_assignees` carries
`project_id` and two composite foreign keys hold the invariant:

- `(issue_id, project_id) → issues(id, project_id)` keeps the denormalised
  `project_id` honest. It is why **issues never move between projects**; that would
  have to cascade-delete every assignment.
- `(project_id, user_id) → project_memberships(project_id, user_id)` is the rule
  itself. Because it cascades, removing someone from a project unassigns them from
  every issue in it, with no application code involved.

Assigning a non-member therefore surfaces as SQLSTATE `23503` on
`issue_assignees_member_fk`, which the store turns into `ErrNotProjectMember` and
the handler into a `422`.

