package store

import (
	"context"
	"database/sql"
	"errors"

	"github.com/lib/pq"
	"github.com/sudarshanpokhrell/trackforge/internal/validator"
)

var ErrDuplicateMembership = errors.New("user is already a member of this project")

const (
	RoleViewer = "viewer"
	RoleEditor = "editor"
	RoleAdmin  = "admin"
)

var roleRanks = map[string]int{
	RoleViewer: 1,
	RoleEditor: 2,
	RoleAdmin:  3,
}

func RoleAtLeast(role, min string) bool {
	return roleRanks[role] != 0 && roleRanks[role] >= roleRanks[min]
}

func ValidateRole(v *validator.Validator, role string) {
	v.Check(v.In(role, RoleViewer, RoleEditor, RoleAdmin), "role", "must be one of viewer, editor or admin")
}

type Membership struct {
	ProjectID int64  `json:"project_id"`
	UserID    string `json:"user_id"`
	Role      string `json:"role"`
}

type MembershipStore struct {
	db *sql.DB
}

func (s *MembershipStore) Create(ctx context.Context, userId, role string, projectId int64) error {
	query := `
		INSERT INTO project_memberships (project_id, user_id, role)
		VALUES ($1, $2, $3)
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	_, err := s.db.ExecContext(ctx, query, projectId, userId, role)

	return translateMembershipError(err)
}

func (s *MembershipStore) GetRole(ctx context.Context, userId string, projectId int64) (string, error) {
	query := `
		SELECT role FROM project_memberships
		WHERE project_id = $1 AND user_id = $2
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	var role string

	err := s.db.QueryRowContext(ctx, query, projectId, userId).Scan(&role)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", ErrNotFound
		}
		return "", err
	}

	return role, nil
}

func (s *MembershipStore) UpdateRole(ctx context.Context, userId, role string, projectId int64) error {
	query := `
		UPDATE project_memberships
		SET role = $3
		WHERE project_id = $1 AND user_id = $2
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	result, err := s.db.ExecContext(ctx, query, projectId, userId, role)

	if err != nil {
		return translateMembershipError(err)
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

func (s *MembershipStore) Delete(ctx context.Context, userId string, projectId int64) error {
	query := `
		DELETE FROM project_memberships
		WHERE project_id = $1 AND user_id = $2
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	tx, err := s.db.BeginTx(ctx, nil)

	if err != nil {
		return err
	}

	defer tx.Rollback()

	result, err := tx.ExecContext(ctx, query, projectId, userId)

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

	_, err = tx.ExecContext(ctx, `
		UPDATE projects
		SET lead_id = NULL,
			version = version + 1
		WHERE id = $1 AND lead_id = $2
	`, projectId, userId)

	if err != nil {
		return err
	}

	return tx.Commit()
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
