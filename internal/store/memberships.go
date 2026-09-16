package store

import (
	"context"
	"database/sql"
	"errors"

	"github.com/lib/pq"
)

var ErrDuplicateMembership = errors.New("user is already a member of this project")

// Membership is a plain yes/no: the user is in the project or not. What they may
// do there comes from users.role, not from the project.
type Membership struct {
	ProjectID int64  `json:"project_id"`
	UserID    string `json:"user_id"`
}

type MembershipStore struct {
	db *sql.DB
}

func (s *MembershipStore) Create(ctx context.Context, userId string, projectId int64) error {
	query := `
		INSERT INTO project_memberships (project_id, user_id)
		VALUES ($1, $2)
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	_, err := s.db.ExecContext(ctx, query, projectId, userId)

	return translateMembershipError(err)
}

func (s *MembershipStore) IsMember(ctx context.Context, userId string, projectId int64) (bool, error) {
	query := `
		SELECT EXISTS (
			SELECT 1 FROM project_memberships
			WHERE project_id = $1 AND user_id = $2
		)
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	var member bool

	err := s.db.QueryRowContext(ctx, query, projectId, userId).Scan(&member)

	return member, err
}

// Delete removes the membership. The composite foreign key on issue_assignees
// cascades, so the user is unassigned from every issue in the project.
func (s *MembershipStore) Delete(ctx context.Context, userId string, projectId int64) error {
	query := `
		DELETE FROM project_memberships
		WHERE project_id = $1 AND user_id = $2
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	result, err := s.db.ExecContext(ctx, query, projectId, userId)

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

func translateMembershipError(err error) error {
	var pqErr *pq.Error

	if errors.As(err, &pqErr) {
		switch pqErr.Code.Name() {
		case "unique_violation":
			return ErrDuplicateMembership
		case "foreign_key_violation":
			return ErrNotFound
		}
	}

	return err
}
