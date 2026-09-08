package store

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/lib/pq"
	"github.com/sudarshanpokhrell/trackforge/internal/validator"
)

const (
	StatusBacklog    = "backlog"
	StatusTodo       = "todo"
	StatusInProgress = "in-progress"
	StatusDone       = "done"
	StatusCancelled  = "cancelled"
)

const (
	PriorityNone   = "no-priority"
	PriorityUrgent = "urgent"
	PriorityHigh   = "high"
	PriorityMedium = "medium"
	PriorityLow    = "low"
)

var (
	IssueStatuses   = []string{StatusBacklog, StatusTodo, StatusInProgress, StatusDone, StatusCancelled}
	IssuePriorities = []string{PriorityNone, PriorityUrgent, PriorityHigh, PriorityMedium, PriorityLow}
)

var ErrDuplicateAssignee = errors.New("user is already assigned to this issue")

type Assignee struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type IssueStore struct {
	db *sql.DB
}

type Issue struct {
	ID          int64      `json:"id"`
	ProjectID   int64      `json:"project_id"`
	AuthorID    string     `json:"author_id"`
	Title       string     `json:"title"`
	Description *string    `json:"description"`
	Status      string     `json:"status"`
	Priority    string     `json:"priority"`
	Version     int32      `json:"version"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	Assignees   []Assignee `json:"assignees"`
}

func ValidateIssue(v *validator.Validator, i *Issue) {
	v.Check(strings.TrimSpace(i.Title) != "", "title", "must be provided")
	v.Check(len(i.Title) <= 500, "title", "must not be more than 500 bytes long")

	if i.Description != nil {
		v.Check(len(*i.Description) <= 5000, "description", "must not be more than 5000 bytes long")
	}

	if i.Status != "" {
		v.Check(v.In(i.Status, IssueStatuses...), "status", "must be a valid issue status")
	}

	if i.Priority != "" {
		v.Check(v.In(i.Priority, IssuePriorities...), "priority", "must be a valid issue priority")
	}
}

func (s *IssueStore) Create(ctx context.Context, issue *Issue) error {
	query := `
		INSERT INTO issues (project_id, author_id, title, description, status, priority)
		VALUES (
			$1, $2, $3, $4,
			COALESCE(NULLIF($5, ''), 'backlog')::issue_status,
			COALESCE(NULLIF($6, ''), 'no-priority')::issue_priority
		)
		RETURNING id, status, priority, version, created_at, updated_at
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	tx, err := s.db.BeginTx(ctx, nil)

	if err != nil {
		return err
	}

	defer tx.Rollback()

	err = tx.QueryRowContext(ctx, query,
		issue.ProjectID,
		issue.AuthorID,
		issue.Title,
		issue.Description,
		issue.Status,
		issue.Priority,
	).Scan(
		&issue.ID,
		&issue.Status,
		&issue.Priority,
		&issue.Version,
		&issue.CreatedAt,
		&issue.UpdatedAt,
	)

	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code.Name() == "foreign_key_violation" {
			return ErrNotFound
		}
		return err
	}

	err = recordActivity(ctx, tx, issue.ID, issue.AuthorID, change{
		Type: ActivityCreated,
		Payload: map[string]any{
			"title":    issue.Title,
			"status":   issue.Status,
			"priority": issue.Priority,
		},
	})

	if err != nil {
		return err
	}

	return tx.Commit()
}

func (s *IssueStore) GetByID(ctx context.Context, issueID int64) (*Issue, error) {
	query := `
		SELECT i.id, i.project_id, i.author_id, i.title, i.description, i.status, i.priority,
			i.version, i.created_at, i.updated_at,
			u.id, u.name
		FROM issues i
		LEFT JOIN issue_assignees ia ON ia.issue_id = i.id
		LEFT JOIN users u ON u.id = ia.user_id
		WHERE i.id = $1
		ORDER BY ia.created_at, u.id
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	rows, err := s.db.QueryContext(ctx, query, issueID)

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	// One row per assignee, each repeating the issue's own columns.
	issue := Issue{Assignees: []Assignee{}}

	found := false

	for rows.Next() {
		var assigneeID, assigneeName sql.NullString

		err := rows.Scan(
			&issue.ID,
			&issue.ProjectID,
			&issue.AuthorID,
			&issue.Title,
			&issue.Description,
			&issue.Status,
			&issue.Priority,
			&issue.Version,
			&issue.CreatedAt,
			&issue.UpdatedAt,
			&assigneeID,
			&assigneeName,
		)

		if err != nil {
			return nil, err
		}

		found = true

		// A LEFT JOIN with no assignee still produces one row, with nulls.
		if assigneeID.Valid {
			issue.Assignees = append(issue.Assignees, Assignee{
				ID:   assigneeID.String,
				Name: assigneeName.String,
			})
		}
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	if !found {
		return nil, ErrNotFound
	}

	return &issue, nil
}

func (s *IssueStore) ListByProject(ctx context.Context, projectID int64) ([]*Issue, error) {
	query := `
		SELECT i.id, i.project_id, i.author_id, i.title, i.description, i.status, i.priority,
			i.version, i.created_at, i.updated_at,
			u.id, u.name
		FROM issues i
		LEFT JOIN issue_assignees ia ON ia.issue_id = i.id
		LEFT JOIN users u ON u.id = ia.user_id
		WHERE i.project_id = $1
		ORDER BY i.created_at DESC, i.id DESC, ia.created_at, u.id
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	rows, err := s.db.QueryContext(ctx, query, projectID)

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	issues := []*Issue{}

	var current *Issue

	for rows.Next() {
		var (
			issue                    Issue
			assigneeID, assigneeName sql.NullString
		)

		err := rows.Scan(
			&issue.ID,
			&issue.ProjectID,
			&issue.AuthorID,
			&issue.Title,
			&issue.Description,
			&issue.Status,
			&issue.Priority,
			&issue.Version,
			&issue.CreatedAt,
			&issue.UpdatedAt,
			&assigneeID,
			&assigneeName,
		)

		if err != nil {
			return nil, err
		}

		if current == nil || current.ID != issue.ID {
			issue.Assignees = []Assignee{}
			current = &issue
			issues = append(issues, current)
		}

		if assigneeID.Valid {
			current.Assignees = append(current.Assignees, Assignee{
				ID:   assigneeID.String,
				Name: assigneeName.String,
			})
		}
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return issues, nil
}

func (s *IssueStore) Update(ctx context.Context, issue *Issue, before Issue, actorID string) error {
	query := `
		UPDATE issues
		SET title = $1,
			description = $2,
			status = $3::issue_status,
			priority = $4::issue_priority,
			version = version + 1
		WHERE id = $5 AND version = $6
		RETURNING updated_at, version
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	tx, err := s.db.BeginTx(ctx, nil)

	if err != nil {
		return err
	}

	defer tx.Rollback()

	err = tx.QueryRowContext(ctx, query,
		issue.Title,
		issue.Description,
		issue.Status,
		issue.Priority,
		issue.ID,
		issue.Version,
	).Scan(
		&issue.UpdatedAt,
		&issue.Version,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrEditConflict
		}
		return err
	}

	for _, c := range issueChanges(&before, issue) {
		if err := recordActivity(ctx, tx, issue.ID, actorID, c); err != nil {
			return err
		}
	}

	return tx.Commit()
}

// issueChanges derives the trail entries for an edit. A field the caller left
// alone is identical in both copies and produces nothing.
func issueChanges(before, after *Issue) []change {
	changes := []change{}

	if before.Title != after.Title {
		changes = append(changes, change{
			Type:    ActivityTitleChanged,
			Payload: map[string]any{"from": before.Title, "to": after.Title},
		})
	}

	if !equalStringPtr(before.Description, after.Description) {
		changes = append(changes, change{
			Type:    ActivityDescriptionChanged,
			Payload: map[string]any{"from": before.Description, "to": after.Description},
		})
	}

	if before.Status != after.Status {
		changes = append(changes, change{
			Type:    ActivityStatusChanged,
			Payload: map[string]any{"from": before.Status, "to": after.Status},
		})
	}

	if before.Priority != after.Priority {
		changes = append(changes, change{
			Type:    ActivityPriorityChanged,
			Payload: map[string]any{"from": before.Priority, "to": after.Priority},
		})
	}

	return changes
}

func equalStringPtr(a, b *string) bool {
	if a == nil || b == nil {
		return a == b
	}
	return *a == *b
}

// AddAssignee puts a user on an issue and records it. Assignment lives in its
// own table, so it leaves the issue row — and its version — untouched.
func (s *IssueStore) AddAssignee(ctx context.Context, issueID int64, userID, actorID string) error {
	query := `
		INSERT INTO issue_assignees (issue_id, user_id)
		VALUES ($1, $2)
		ON CONFLICT (issue_id, user_id) DO NOTHING
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	tx, err := s.db.BeginTx(ctx, nil)

	if err != nil {
		return err
	}

	defer tx.Rollback()

	result, err := tx.ExecContext(ctx, query, issueID, userID)

	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code.Name() == "foreign_key_violation" {
			return ErrNotFound
		}
		return err
	}

	rowsAffected, err := result.RowsAffected()

	if err != nil {
		return err
	}

	// DO NOTHING swallowed the insert, so the pair was already there.
	if rowsAffected == 0 {
		return ErrDuplicateAssignee
	}

	err = recordActivity(ctx, tx, issueID, actorID, change{
		Type: ActivityAssigneeChanged,
		Payload: map[string]any{
			"action":  AssigneeActionAssigned,
			"user_id": userID,
		},
	})

	if err != nil {
		return err
	}

	return tx.Commit()
}

func (s *IssueStore) RemoveAssignee(ctx context.Context, issueID int64, userID, actorID string) error {
	query := `
		DELETE FROM issue_assignees
		WHERE issue_id = $1 AND user_id = $2
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	tx, err := s.db.BeginTx(ctx, nil)

	if err != nil {
		return err
	}

	defer tx.Rollback()

	result, err := tx.ExecContext(ctx, query, issueID, userID)

	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()

	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return ErrNotFound
	}

	err = recordActivity(ctx, tx, issueID, actorID, change{
		Type: ActivityAssigneeChanged,
		Payload: map[string]any{
			"action":  AssigneeActionUnassigned,
			"user_id": userID,
		},
	})

	if err != nil {
		return err
	}

	return tx.Commit()
}

// Delete needs no trail entry: the issue's activities cascade away with it.
func (s *IssueStore) Delete(ctx context.Context, issueID int64) error {
	query := `DELETE FROM issues WHERE id = $1`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	result, err := s.db.ExecContext(ctx, query, issueID)

	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()

	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return ErrNotFound
	}

	return nil
}
