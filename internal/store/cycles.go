package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/lib/pq"
	"github.com/sudarshanpokhrell/trackforge/internal/validator"
)

const (
	CycleStatusUpcoming  = "upcoming"
	CycleStatusActive    = "active"
	CycleStatusOverdue   = "overdue"
	CycleStatusCompleted = "completed"
)

var CycleStatuses = []string{CycleStatusUpcoming, CycleStatusActive, CycleStatusOverdue, CycleStatusCompleted}

var (
	ErrCyclesDisabled     = errors.New("cycles are disabled for this project")
	ErrCycleOverlap       = errors.New("dates overlap another cycle")
	ErrCycleCompleted     = errors.New("cycle is completed")
	ErrCycleNotInProject  = errors.New("cycle does not belong to this project")
	ErrOpenCyclesExist    = errors.New("complete or delete this project's open cycles first")
	ErrInvalidCycleTarget = errors.New("open issues can only move to another uncompleted cycle in this project")
)

type Cycle struct {
	ID          int64      `json:"id"`
	ProjectID   int64      `json:"project_id"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	StartDate   time.Time  `json:"start_date"`
	EndDate     time.Time  `json:"end_date"`
	CompletedAt *time.Time `json:"completed_at"`
	CreatedBy   *string    `json:"created_by"`
	Version     int32      `json:"version"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	// Status depends on today's date, so it's worked out per request (see
	// SetStatus) rather than stored.
	Status string `json:"status"`
	// IssueCounts maps each issue status to how many of the cycle's issues have
	// it, for progress. Statuses with no issues are absent.
	IssueCounts map[string]int `json:"issue_counts"`
}

// CycleSummary is how a cycle appears in a cycle_changed activity: a snapshot,
// so the timeline still reads after the cycle is renamed or deleted.
type CycleSummary struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

func ValidateCycle(v *validator.Validator, c *Cycle) {
	v.Check(strings.TrimSpace(c.Name) != "", "name", "must be provided")
	v.Check(utf8.RuneCountInString(c.Name) <= 100, "name", "must not be more than 100 characters long")
	v.Check(len(c.Description) <= 2000, "description", "must not be more than 2000 bytes long")
	v.Check(!c.StartDate.IsZero(), "start_date", "must be provided")
	v.Check(!c.EndDate.IsZero(), "end_date", "must be provided")

	if !c.StartDate.IsZero() && !c.EndDate.IsZero() {
		v.Check(!c.EndDate.Before(c.StartDate), "end_date", "must not be before the start date")
	}
}

// SetStatus fills in Status for the given day. today is a date in the app's
// timezone; only its year, month and day are used.
func (c *Cycle) SetStatus(today time.Time) {
	day := time.Date(today.Year(), today.Month(), today.Day(), 0, 0, 0, 0, time.UTC)
	start := dateOnly(c.StartDate)
	end := dateOnly(c.EndDate)

	switch {
	case c.CompletedAt != nil:
		c.Status = CycleStatusCompleted
	case day.Before(start):
		c.Status = CycleStatusUpcoming
	case day.After(end):
		c.Status = CycleStatusOverdue
	default:
		c.Status = CycleStatusActive
	}
}

func dateOnly(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
}

type CycleStore struct {
	db *sql.DB
}

const cycleColumns = `
	c.id, c.project_id, c.name, COALESCE(c.description, ''), c.start_date, c.end_date,
	c.completed_at, c.created_by, c.version, c.created_at, c.updated_at,
	COALESCE((
		SELECT json_object_agg(counts.status, counts.n)
		FROM (
			SELECT i.status::text AS status, count(*) AS n
			FROM issues i
			WHERE i.cycle_id = c.id
			GROUP BY i.status
		) counts
	), '{}')
`

func scanCycle(row interface{ Scan(...any) error }) (*Cycle, error) {
	var (
		cycle  Cycle
		counts []byte
	)

	err := row.Scan(
		&cycle.ID,
		&cycle.ProjectID,
		&cycle.Name,
		&cycle.Description,
		&cycle.StartDate,
		&cycle.EndDate,
		&cycle.CompletedAt,
		&cycle.CreatedBy,
		&cycle.Version,
		&cycle.CreatedAt,
		&cycle.UpdatedAt,
		&counts,
	)

	if err != nil {
		return nil, err
	}

	if err := json.Unmarshal(counts, &cycle.IssueCounts); err != nil {
		return nil, err
	}

	return &cycle, nil
}

func (s *CycleStore) Create(ctx context.Context, cycle *Cycle) error {
	query := `
		INSERT INTO cycles (project_id, name, description, start_date, end_date, created_by)
		VALUES ($1, $2, NULLIF($3, ''), $4::date, $5::date, $6)
		RETURNING id, version, created_at, updated_at
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	err := s.db.QueryRowContext(ctx, query,
		cycle.ProjectID,
		cycle.Name,
		cycle.Description,
		cycle.StartDate,
		cycle.EndDate,
		cycle.CreatedBy,
	).Scan(
		&cycle.ID,
		&cycle.Version,
		&cycle.CreatedAt,
		&cycle.UpdatedAt,
	)

	if err != nil {
		return translateCycleError(err)
	}

	cycle.IssueCounts = map[string]int{}

	return nil
}

func (s *CycleStore) GetByID(ctx context.Context, cycleID int64) (*Cycle, error) {
	query := `SELECT ` + cycleColumns + ` FROM cycles c WHERE c.id = $1`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	cycle, err := scanCycle(s.db.QueryRowContext(ctx, query, cycleID))

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return cycle, nil
}

// ListByProject returns a project's cycles, latest start first.
func (s *CycleStore) ListByProject(ctx context.Context, projectID int64) ([]*Cycle, error) {
	query := `
		SELECT ` + cycleColumns + `
		FROM cycles c
		WHERE c.project_id = $1
		ORDER BY c.start_date DESC, c.id DESC
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	rows, err := s.db.QueryContext(ctx, query, projectID)

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	cycles := []*Cycle{}

	for rows.Next() {
		cycle, err := scanCycle(rows)

		if err != nil {
			return nil, err
		}

		cycles = append(cycles, cycle)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return cycles, nil
}

// Update writes name, description and dates. A completed cycle is read-only,
// which the WHERE clause holds even against a cycle completed mid-request.
func (s *CycleStore) Update(ctx context.Context, cycle *Cycle) error {
	query := `
		UPDATE cycles
		SET name = $1,
			description = NULLIF($2, ''),
			start_date = $3::date,
			end_date = $4::date,
			version = version + 1
		WHERE id = $5 AND version = $6 AND completed_at IS NULL
		RETURNING version, updated_at
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	err := s.db.QueryRowContext(ctx, query,
		cycle.Name,
		cycle.Description,
		cycle.StartDate,
		cycle.EndDate,
		cycle.ID,
		cycle.Version,
	).Scan(
		&cycle.Version,
		&cycle.UpdatedAt,
	)

	if errors.Is(err, sql.ErrNoRows) {
		return ErrEditConflict
	}

	return translateCycleError(err)
}

// Delete removes the cycle. Its issues stay, with no cycle (the foreign key
// clears cycle_id).
func (s *CycleStore) Delete(ctx context.Context, cycleID int64) error {
	query := `DELETE FROM cycles WHERE id = $1`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	result, err := s.db.ExecContext(ctx, query, cycleID)

	if err != nil {
		return err
	}

	affected, err := result.RowsAffected()

	if err != nil {
		return err
	}

	if affected == 0 {
		return ErrNotFound
	}

	return nil
}

// Complete marks the cycle completed and moves its open issues (anything not
// done or cancelled) to moveTo, or to no cycle when moveTo is nil. It runs in
// one transaction, and each moved issue gets a cycle_changed activity. It
// returns how many issues moved.
func (s *CycleStore) Complete(ctx context.Context, cycle *Cycle, moveTo *int64, actorID string) (int, error) {
	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	tx, err := s.db.BeginTx(ctx, nil)

	if err != nil {
		return 0, err
	}

	defer tx.Rollback()

	err = tx.QueryRowContext(ctx, `
		UPDATE cycles
		SET completed_at = now(), version = version + 1
		WHERE id = $1 AND completed_at IS NULL
		RETURNING completed_at, version, updated_at
	`, cycle.ID).Scan(&cycle.CompletedAt, &cycle.Version, &cycle.UpdatedAt)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, ErrCycleCompleted
		}
		return 0, err
	}

	from := CycleSummary{ID: cycle.ID, Name: cycle.Name}

	var to *CycleSummary

	if moveTo != nil {
		target := CycleSummary{ID: *moveTo}

		// FOR SHARE keeps the target from being completed or deleted while
		// issues move into it.
		err := tx.QueryRowContext(ctx, `
			SELECT name FROM cycles
			WHERE id = $1 AND project_id = $2 AND completed_at IS NULL AND id <> $3
			FOR SHARE
		`, *moveTo, cycle.ProjectID, cycle.ID).Scan(&target.Name)

		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return 0, ErrInvalidCycleTarget
			}
			return 0, err
		}

		to = &target
	}

	rows, err := tx.QueryContext(ctx, `
		UPDATE issues
		SET cycle_id = $1, version = version + 1
		WHERE cycle_id = $2 AND status NOT IN ('done', 'cancelled')
		RETURNING id
	`, moveTo, cycle.ID)

	if err != nil {
		return 0, err
	}

	moved := []int64{}

	for rows.Next() {
		var id int64

		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return 0, err
		}

		moved = append(moved, id)
	}

	rows.Close()

	if err := rows.Err(); err != nil {
		return 0, err
	}

	for _, issueID := range moved {
		err := recordActivity(ctx, tx, issueID, actorID, change{
			Type:    ActivityCycleChanged,
			Payload: map[string]any{"from": from, "to": to},
		})

		if err != nil {
			return 0, err
		}
	}

	if err := tx.Commit(); err != nil {
		return 0, err
	}

	cycle.Status = CycleStatusCompleted

	return len(moved), nil
}

// cycleSummaryOf reads a cycle's id and name inside tx, for an activity snapshot.
// A nil id gives nil.
func cycleSummaryOf(ctx context.Context, tx *sql.Tx, cycleID *int64) (*CycleSummary, error) {
	if cycleID == nil {
		return nil, nil
	}

	summary := CycleSummary{ID: *cycleID}

	err := tx.QueryRowContext(ctx, `SELECT name FROM cycles WHERE id = $1`, *cycleID).Scan(&summary.Name)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return &summary, nil
}

func translateCycleError(err error) error {
	var pqErr *pq.Error

	if errors.As(err, &pqErr) {
		switch pqErr.Code.Name() {
		case "exclusion_violation":
			return ErrCycleOverlap
		case "foreign_key_violation":
			return ErrNotFound
		}
	}

	return err
}
