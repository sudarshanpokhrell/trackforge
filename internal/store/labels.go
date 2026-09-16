package store

import (
	"context"
	"database/sql"
	"errors"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/lib/pq"
	"github.com/sudarshanpokhrell/trackforge/internal/validator"
)

var (
	ErrDuplicateLabel    = errors.New("a label with this name already exists in this project")
	ErrLabelNotInProject = errors.New("label does not belong to this project")
)

var LabelColorRX = regexp.MustCompile(`^#[0-9a-fA-F]{6}$`)

type Label struct {
	ID        int64     `json:"id"`
	ProjectID int64     `json:"project_id"`
	Name      string    `json:"name"`
	Color     string    `json:"color"`
	CreatedBy *string   `json:"created_by"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// LabelSummary is how a label appears on an issue, and the snapshot a
// label_added / label_removed activity keeps.
type LabelSummary struct {
	ID    int64  `json:"id"`
	Name  string `json:"name"`
	Color string `json:"color"`
}

func ValidateLabel(v *validator.Validator, l *Label) {
	v.Check(strings.TrimSpace(l.Name) != "", "name", "must be provided")
	v.Check(utf8.RuneCountInString(l.Name) <= 50, "name", "must not be more than 50 characters long")
	v.Check(LabelColorRX.MatchString(l.Color), "color", "must be a hex color like #e11d48")
}

type LabelStore struct {
	db *sql.DB
}

func (s *LabelStore) Create(ctx context.Context, label *Label) error {
	query := `
		INSERT INTO labels (project_id, name, color, created_by)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at, updated_at
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	err := s.db.QueryRowContext(ctx, query,
		label.ProjectID,
		label.Name,
		label.Color,
		label.CreatedBy,
	).Scan(
		&label.ID,
		&label.CreatedAt,
		&label.UpdatedAt,
	)

	return translateLabelError(err)
}

func (s *LabelStore) GetByID(ctx context.Context, labelID int64) (*Label, error) {
	query := `
		SELECT id, project_id, name, color, created_by, created_at, updated_at
		FROM labels
		WHERE id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	var label Label

	err := s.db.QueryRowContext(ctx, query, labelID).Scan(
		&label.ID,
		&label.ProjectID,
		&label.Name,
		&label.Color,
		&label.CreatedBy,
		&label.CreatedAt,
		&label.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return &label, nil
}

func (s *LabelStore) ListByProject(ctx context.Context, projectID int64) ([]*Label, error) {
	query := `
		SELECT id, project_id, name, color, created_by, created_at, updated_at
		FROM labels
		WHERE project_id = $1
		ORDER BY name, id
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	rows, err := s.db.QueryContext(ctx, query, projectID)

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	labels := []*Label{}

	for rows.Next() {
		var label Label

		err := rows.Scan(
			&label.ID,
			&label.ProjectID,
			&label.Name,
			&label.Color,
			&label.CreatedBy,
			&label.CreatedAt,
			&label.UpdatedAt,
		)

		if err != nil {
			return nil, err
		}

		labels = append(labels, &label)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return labels, nil
}

// Update writes name and color. Past activities keep the snapshot
// they took, so renaming a label never rewrites an issue's timeline.
func (s *LabelStore) Update(ctx context.Context, label *Label) error {
	query := `
		UPDATE labels
		SET name = $1, color = $2
		WHERE id = $3
		RETURNING updated_at
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	err := s.db.QueryRowContext(ctx, query,
		label.Name,
		label.Color,
		label.ID,
	).Scan(&label.UpdatedAt)

	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}

	return translateLabelError(err)
}

// Delete removes the label, which cascades it off every issue, and reports how
// many issues had it. Both parts of the statement read the same snapshot, so the
// count is of the rows the cascade removes.
func (s *LabelStore) Delete(ctx context.Context, labelID int64) (int64, error) {
	query := `
		WITH used AS (
			SELECT count(*) AS n FROM issue_labels WHERE label_id = $1
		)
		DELETE FROM labels
		WHERE id = $1
		RETURNING (SELECT n FROM used)
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	var issueCount int64

	err := s.db.QueryRowContext(ctx, query, labelID).Scan(&issueCount)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, ErrNotFound
		}
		return 0, err
	}

	return issueCount, nil
}

func translateLabelError(err error) error {
	var pqErr *pq.Error

	if errors.As(err, &pqErr) {
		switch pqErr.Code.Name() {
		case "unique_violation":
			return ErrDuplicateLabel
		case "foreign_key_violation":
			return ErrNotFound
		}
	}

	return err
}
