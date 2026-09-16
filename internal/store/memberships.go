package store

import (
	"context"
	"database/sql"
	"errors"

	"github.com/lib/pq"
	"github.com/sudarshanpokhrell/trackforge/internal/validator"
)

var (
	ErrDuplicateMembership = errors.New("user is already a member of this project")
	ErrLastProjectAdmin    = errors.New("a project needs at least one admin")
)

const (
	ProjectRoleAdmin       = "admin"
	ProjectRoleContributor = "contributor"
)

func ValidateProjectRole(v *validator.Validator, role string) {
	v.Check(v.In(role, ProjectRoleAdmin, ProjectRoleContributor), "role", "must be one of admin or contributor")
}

type Membership struct {
	ProjectID int64  `json:"project_id"`
	UserID    string `json:"user_id"`
	Role      string `json:"role"`
}

type MembershipStore struct {
	db *sql.DB
}

func (s *MembershipStore) Create(ctx context.Context, userId string, projectId int64, role string) error {
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

	if errors.Is(err, sql.ErrNoRows) {
		return "", nil
	}

	return role, err
}

// UpdateRole changes the user's role in the project. Demoting the last admin
// fails with ErrLastProjectAdmin.
func (s *MembershipStore) UpdateRole(ctx context.Context, userId string, projectId int64, role string) error {
	query := `
		UPDATE project_memberships SET role = $3
		WHERE project_id = $1 AND user_id = $2
	`

	return s.changeKeepingAnAdmin(ctx, userId, projectId, role != ProjectRoleAdmin, func(tx *sql.Tx) error {
		_, err := tx.ExecContext(ctx, query, projectId, userId, role)
		return err
	})
}

// Delete removes the membership. The composite foreign key on issue_assignees
// cascades, so the user is unassigned from every issue in the project. Removing
// the last admin fails with ErrLastProjectAdmin.
func (s *MembershipStore) Delete(ctx context.Context, userId string, projectId int64) error {
	query := `
		DELETE FROM project_memberships
		WHERE project_id = $1 AND user_id = $2
	`

	return s.changeKeepingAnAdmin(ctx, userId, projectId, true, func(tx *sql.Tx) error {
		_, err := tx.ExecContext(ctx, query, projectId, userId)
		return err
	})
}

// changeKeepingAnAdmin runs change on the user's membership inside a transaction
// that first locks every membership row of the project. dropsAdmin says whether
// the change takes the user out of the admin role; if they are the only admin,
// it is refused. The lock is what stops two admins demoting each other at once:
// the second transaction waits, then sees the first one's result.
func (s *MembershipStore) changeKeepingAnAdmin(ctx context.Context, userId string, projectId int64, dropsAdmin bool, change func(*sql.Tx) error) error {
	query := `
		SELECT user_id, role FROM project_memberships
		WHERE project_id = $1
		FOR UPDATE
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	tx, err := s.db.BeginTx(ctx, nil)

	if err != nil {
		return err
	}

	defer tx.Rollback()

	rows, err := tx.QueryContext(ctx, query, projectId)

	if err != nil {
		return err
	}

	var (
		targetRole string
		admins     int
	)

	for rows.Next() {
		var memberID, role string

		if err := rows.Scan(&memberID, &role); err != nil {
			rows.Close()
			return err
		}

		if role == ProjectRoleAdmin {
			admins++
		}

		if memberID == userId {
			targetRole = role
		}
	}

	rows.Close()

	if err := rows.Err(); err != nil {
		return err
	}

	if targetRole == "" {
		return ErrNotFound
	}

	if dropsAdmin && targetRole == ProjectRoleAdmin && admins == 1 {
		return ErrLastProjectAdmin
	}

	if err := change(tx); err != nil {
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
