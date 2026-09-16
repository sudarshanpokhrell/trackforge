package store

import (
	"context"
	"database/sql"
	"encoding/json"
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

var (
	ErrDuplicateAssignee = errors.New("user is already assigned to this issue")
	ErrNotProjectMember  = errors.New("user is not a member of this project")
)

type Assignee struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type IssueStore struct {
	db *sql.DB
}

type Issue struct {
	ID          int64          `json:"id"`
	ProjectID   int64          `json:"project_id"`
	AuthorID    string         `json:"author_id"`
	Title       string         `json:"title"`
	Description *string        `json:"description"`
	Status      string         `json:"status"`
	Priority    string         `json:"priority"`
	Version     int32          `json:"version"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	Assignees   []Assignee     `json:"assignees"`
	Labels      []LabelSummary `json:"labels"`
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

// Create inserts the issue and applies labelIDs to it in the same transaction,
// so a label from another project fails the whole create.
func (s *IssueStore) Create(ctx context.Context, issue *Issue, labelIDs []int64) error {
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

	issue.Assignees = []Assignee{}
	issue.Labels = []LabelSummary{}

	for _, labelID := range labelIDs {
		label, added, err := addIssueLabel(ctx, tx, issue.ID, issue.ProjectID, labelID, issue.AuthorID)

		if err != nil {
			return err
		}

		if added {
			issue.Labels = append(issue.Labels, label)
		}
	}

	return tx.Commit()
}

// issueColumns selects an issue with its assignees and labels folded into JSON
// arrays, so an issue is one row however many of either it has.
const issueColumns = `
	i.id, i.project_id, i.author_id, i.title, i.description, i.status, i.priority,
	i.version, i.created_at, i.updated_at,
	COALESCE((
		SELECT json_agg(json_build_object('id', u.id, 'name', u.name) ORDER BY ia.created_at, u.id)
		FROM issue_assignees ia
		JOIN users u ON u.id = ia.user_id
		WHERE ia.issue_id = i.id
	), '[]'),
	COALESCE((
		SELECT json_agg(json_build_object('id', l.id, 'name', l.name::text, 'color', l.color) ORDER BY l.name, l.id)
		FROM issue_labels il
		JOIN labels l ON l.id = il.label_id
		WHERE il.issue_id = i.id
	), '[]')
`

func scanIssue(row interface{ Scan(...any) error }) (*Issue, error) {
	var (
		issue             Issue
		assignees, labels []byte
	)

	err := row.Scan(
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
		&assignees,
		&labels,
	)

	if err != nil {
		return nil, err
	}

	if err := json.Unmarshal(assignees, &issue.Assignees); err != nil {
		return nil, err
	}

	if err := json.Unmarshal(labels, &issue.Labels); err != nil {
		return nil, err
	}

	return &issue, nil
}

func (s *IssueStore) GetByID(ctx context.Context, issueID int64) (*Issue, error) {
	query := `SELECT ` + issueColumns + ` FROM issues i WHERE i.id = $1`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	issue, err := scanIssue(s.db.QueryRowContext(ctx, query, issueID))

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return issue, nil
}

func (s *IssueStore) ListByProject(ctx context.Context, projectID int64) ([]*Issue, error) {
	query := `
		SELECT ` + issueColumns + `
		FROM issues i
		WHERE i.project_id = $1
		ORDER BY i.created_at DESC, i.id DESC
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	rows, err := s.db.QueryContext(ctx, query, projectID)

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	issues := []*Issue{}

	for rows.Next() {
		issue, err := scanIssue(rows)

		if err != nil {
			return nil, err
		}

		issues = append(issues, issue)
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
//
// project_id is carried on the row so a composite foreign key can hold the rule
// that an assignee is a project member; that is why the check below needs no
// membership query of its own.
func (s *IssueStore) AddAssignee(ctx context.Context, issueID, projectID int64, userID, actorID string) error {
	query := `
		INSERT INTO issue_assignees (issue_id, project_id, user_id)
		VALUES ($1, $2, $3)
		ON CONFLICT (issue_id, user_id) DO NOTHING
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	tx, err := s.db.BeginTx(ctx, nil)

	if err != nil {
		return err
	}

	defer tx.Rollback()

	result, err := tx.ExecContext(ctx, query, issueID, projectID, userID)

	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code.Name() == "foreign_key_violation" {
			if pqErr.Constraint == "issue_assignees_member_fk" {
				return ErrNotProjectMember
			}
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

// AddLabel applies a label to an issue and records it. It reports false, and
// records nothing, when the label was already there. Like assignment it leaves
// the issue row and its version alone.
func (s *IssueStore) AddLabel(ctx context.Context, issueID, projectID, labelID int64, actorID string) (LabelSummary, bool, error) {
	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	tx, err := s.db.BeginTx(ctx, nil)

	if err != nil {
		return LabelSummary{}, false, err
	}

	defer tx.Rollback()

	label, added, err := addIssueLabel(ctx, tx, issueID, projectID, labelID, actorID)

	if err != nil {
		return LabelSummary{}, false, err
	}

	return label, added, tx.Commit()
}

// addIssueLabel is AddLabel inside a caller's transaction, so creating an issue
// can apply its labels atomically.
//
// project_id is carried on the row so a composite foreign key can hold the rule
// that the label comes from the issue's project; a label from anywhere else, or
// one that doesn't exist, fails it with ErrLabelNotInProject.
func addIssueLabel(ctx context.Context, tx *sql.Tx, issueID, projectID, labelID int64, actorID string) (LabelSummary, bool, error) {
	// The CTE and the outer SELECT read the same snapshot, so the label is
	// visible here even though the insert is not.
	query := `
		WITH ins AS (
			INSERT INTO issue_labels (issue_id, label_id, project_id)
			VALUES ($1, $2, $3)
			ON CONFLICT (issue_id, label_id) DO NOTHING
			RETURNING label_id
		)
		SELECT l.id, l.name, l.color, EXISTS (SELECT 1 FROM ins)
		FROM labels l
		WHERE l.id = $2
	`

	var (
		label LabelSummary
		added bool
	)

	err := tx.QueryRowContext(ctx, query, issueID, labelID, projectID).Scan(
		&label.ID,
		&label.Name,
		&label.Color,
		&added,
	)

	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code.Name() == "foreign_key_violation" {
			if pqErr.Constraint == "issue_labels_label_fk" {
				return LabelSummary{}, false, ErrLabelNotInProject
			}
			return LabelSummary{}, false, ErrNotFound
		}
		return LabelSummary{}, false, err
	}

	if !added {
		return label, false, nil
	}

	err = recordActivity(ctx, tx, issueID, actorID, change{
		Type:    ActivityLabelAdded,
		Payload: labelActivityPayload(label),
	})

	return label, true, err
}

func (s *IssueStore) RemoveLabel(ctx context.Context, issueID, labelID int64, actorID string) error {
	query := `
		WITH del AS (
			DELETE FROM issue_labels
			WHERE issue_id = $1 AND label_id = $2
			RETURNING label_id
		)
		SELECT l.id, l.name, l.color
		FROM del
		JOIN labels l ON l.id = del.label_id
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	tx, err := s.db.BeginTx(ctx, nil)

	if err != nil {
		return err
	}

	defer tx.Rollback()

	var label LabelSummary

	err = tx.QueryRowContext(ctx, query, issueID, labelID).Scan(&label.ID, &label.Name, &label.Color)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}

	err = recordActivity(ctx, tx, issueID, actorID, change{
		Type:    ActivityLabelRemoved,
		Payload: labelActivityPayload(label),
	})

	if err != nil {
		return err
	}

	return tx.Commit()
}

// labelActivityPayload snapshots the label, so the timeline still reads right
// after the label is renamed, recolored or deleted.
func labelActivityPayload(label LabelSummary) map[string]any {
	return map[string]any{
		"label_id": label.ID,
		"name":     label.Name,
		"color":    label.Color,
	}
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
