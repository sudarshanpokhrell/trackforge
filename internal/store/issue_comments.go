package store

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/lib/pq"
	"github.com/sudarshanpokhrell/trackforge/internal/validator"
)

type IssueCommentStore struct {
	db *sql.DB
}

type IssueComment struct {
	ID        int64        `json:"id"`
	IssueID   int64        `json:"issue_id"`
	AuthorID  string       `json:"author_id"`
	Author    *UserSummary `json:"author,omitempty"`
	Content   string       `json:"content"`
	Version   int32        `json:"version"`
	CreatedAt time.Time    `json:"created_at"`
	UpdatedAt time.Time    `json:"updated_at"`
}

func ValidateIssueComment(v *validator.Validator, c *IssueComment) {
	validateCommentContent(v, c.Content)
}

// Commenting writes nothing to the activity trail: issue_activity_type has no
// value for it, and the comment thread is the record.
func (s *IssueCommentStore) Create(ctx context.Context, comment *IssueComment) error {
	query := `
		INSERT INTO issue_comments (issue_id, author_id, content)
		VALUES ($1, $2, $3)
		RETURNING id, version, created_at, updated_at
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	err := s.db.QueryRowContext(ctx, query,
		comment.IssueID,
		comment.AuthorID,
		comment.Content,
	).Scan(
		&comment.ID,
		&comment.Version,
		&comment.CreatedAt,
		&comment.UpdatedAt,
	)

	var pqErr *pq.Error
	if errors.As(err, &pqErr) && pqErr.Code.Name() == "foreign_key_violation" {
		return ErrNotFound
	}

	return err
}

func (s *IssueCommentStore) GetByIssueID(ctx context.Context, issueID int64) ([]*IssueComment, error) {
	query := `
		SELECT c.id, c.issue_id, c.author_id, c.content, c.version, c.created_at, c.updated_at,
			u.id, u.name, u.email
		FROM issue_comments c
		INNER JOIN users u ON u.id = c.author_id
		WHERE c.issue_id = $1
		ORDER BY c.created_at DESC, c.id DESC
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	rows, err := s.db.QueryContext(ctx, query, issueID)

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	comments := []*IssueComment{}

	for rows.Next() {
		var (
			comment IssueComment
			author  UserSummary
		)

		err := rows.Scan(
			&comment.ID,
			&comment.IssueID,
			&comment.AuthorID,
			&comment.Content,
			&comment.Version,
			&comment.CreatedAt,
			&comment.UpdatedAt,
			&author.ID,
			&author.Name,
			&author.Email,
		)

		if err != nil {
			return nil, err
		}

		comment.Author = &author
		comments = append(comments, &comment)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return comments, nil
}

func (s *IssueCommentStore) GetByID(ctx context.Context, commentID int64) (*IssueComment, error) {
	query := `
		SELECT c.id, c.issue_id, c.author_id, c.content, c.version, c.created_at, c.updated_at,
			u.id, u.name, u.email
		FROM issue_comments c
		INNER JOIN users u ON u.id = c.author_id
		WHERE c.id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	var (
		comment IssueComment
		author  UserSummary
	)

	err := s.db.QueryRowContext(ctx, query, commentID).Scan(
		&comment.ID,
		&comment.IssueID,
		&comment.AuthorID,
		&comment.Content,
		&comment.Version,
		&comment.CreatedAt,
		&comment.UpdatedAt,
		&author.ID,
		&author.Name,
		&author.Email,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	comment.Author = &author

	return &comment, nil
}

func (s *IssueCommentStore) Update(ctx context.Context, comment *IssueComment) error {
	query := `
		UPDATE issue_comments
		SET content = $1, version = version + 1
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

func (s *IssueCommentStore) Delete(ctx context.Context, commentID int64) error {
	query := `DELETE FROM issue_comments WHERE id = $1`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	result, err := s.db.ExecContext(ctx, query, commentID)

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
