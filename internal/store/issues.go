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

	err := s.db.QueryRowContext(ctx, query,
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

	var pqErr *pq.Error
	if errors.As(err, &pqErr) && pqErr.Code.Name() == "foreign_key_violation" {
		return ErrNotFound
	}

	return err
}

func (s *IssueStore) Update(ctx context.Context, issue *Issue) error {
	return nil
}

func (s *IssueStore) ListByProject(ctx context.Context) ([]*Issue, error) {
	return nil, nil
}

func (s *IssueStore) Delete(ctx context.Context, id int64) error {
	return nil
}
