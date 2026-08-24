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

type CommentStore struct {
	db *sql.DB
}

type UserSummary struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

type ProjectComment struct {
	ID        int64        `json:"id"`
	Content   string       `json:"content"`
	ProjectID int64        `json:"project_id"`
	CreatedBy string       `json:"created_by"`
	Creator   *UserSummary `json:"creator,omitempty"`
	CreatedAt time.Time    `json:"created_at"`
	UpdatedAt time.Time    `json:"updated_at"`
	Version   int32        `json:"version"`
}

func ValidateComment(v *validator.Validator, c *ProjectComment) {
	v.Check(strings.TrimSpace(c.Content) != "", "content", "must be provided")
	v.Check(len(c.Content) <= 2000, "content", "must not be more than 2000 bytes long")
}

func (s *CommentStore) Create(ctx context.Context, comment *ProjectComment) error {
	query := `
		INSERT INTO project_comments (content, project_id, created_by)
		VALUES ($1, $2, $3)
		RETURNING id, created_at, updated_at, version
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	err := s.db.QueryRowContext(ctx, query,
		comment.Content,
		comment.ProjectID,
		comment.CreatedBy,
	).Scan(
		&comment.ID,
		&comment.CreatedAt,
		&comment.UpdatedAt,
		&comment.Version,
	)
	var pqErr *pq.Error
	if errors.As(err, &pqErr) && pqErr.Code.Name() == "foreign_key_violation" {
		return ErrNotFound
	}

	return err
}

func (s *CommentStore) GetByProjectID(ctx context.Context, projectID int64) ([]*ProjectComment, error) {
	query := `
		SELECT pu.id, pu.content, pu.project_id, pu.created_by,
			pu.created_at, pu.updated_at, pu.version,
			u.id, u.name, u.email
		FROM project_comments pu
		INNER JOIN users u ON u.id = pu.created_by
		WHERE pu.project_id = $1
		ORDER BY pu.created_at DESC
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	rows, err := s.db.QueryContext(ctx, query, projectID)

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	comments := []*ProjectComment{}

	for rows.Next() {
		var (
			comment ProjectComment
			creator UserSummary
		)

		err := rows.Scan(
			&comment.ID,
			&comment.Content,
			&comment.ProjectID,
			&comment.CreatedBy,
			&comment.CreatedAt,
			&comment.UpdatedAt,
			&comment.Version,
			&creator.ID,
			&creator.Name,
			&creator.Email,
		)

		if err != nil {
			return nil, err
		}

		comment.Creator = &creator
		comments = append(comments, &comment)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return comments, nil
}

func (s *CommentStore) GetProjectCommentByID(ctx context.Context, commentID int64) (*ProjectComment, error) {
	query := `
		SELECT pu.id, pu.content, pu.project_id, pu.created_by,
			pu.created_at, pu.updated_at, pu.version,
			u.id, u.name, u.email
		FROM project_comments pu
		INNER JOIN users u ON u.id = pu.created_by
		WHERE pu.id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	var (
		comment ProjectComment
		creator UserSummary
	)

	err := s.db.QueryRowContext(ctx, query, commentID).Scan(
		&comment.ID,
		&comment.Content,
		&comment.ProjectID,
		&comment.CreatedBy,
		&comment.CreatedAt,
		&comment.UpdatedAt,
		&comment.Version,
		&creator.ID,
		&creator.Name,
		&creator.Email,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	comment.Creator = &creator

	return &comment, nil
}

func (s *CommentStore) Update(ctx context.Context, comment *ProjectComment) error {
	query := `
		UPDATE project_comments
		SET content = $1 , version = version + 1
		WHERE id = $2 AND version = $3
		RETURNING updated_at, version
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	err := s.db.QueryRowContext(ctx, query, comment.Content, comment.ID, comment.Version).Scan(
		&comment.UpdatedAt,
		&comment.Version,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrEditConflict
		}
		return err
	}

	return nil
}

func (s *CommentStore) Delete(ctx context.Context, commentId int64) error {
	query := `
		DELETE FROM project_comments
		WHERE id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	result, err := s.db.ExecContext(ctx, query, commentId)

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
