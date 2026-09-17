package store

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/sudarshanpokhrell/trackforge/internal/validator"
)

type Project struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Emoji       string `json:"emoji"`
	// CyclesEnabled is changed only through SetCyclesEnabled, never Update.
	CyclesEnabled bool       `json:"cycles_enabled"`
	StartDate     *time.Time `json:"start_date"`
	TargetDate    *time.Time `json:"target_date"`
	CreatedBy     string     `json:"created_by"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	Version       int32      `json:"version"`
	MyRole        string     `json:"my_role,omitempty"`
}

type ProjectRef struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

type ProjectMember struct {
	UserID   string    `json:"user_id"`
	Name     string    `json:"name"`
	Email    string    `json:"email"`
	IsActive bool      `json:"is_active"`
	Role     string    `json:"role"`
	JoinedAt time.Time `json:"joined_at"`
}

// ProjectAccess is who the caller is in the project. It is per-request, so the
// handler fills it in from the middleware's decision.
type ProjectAccess struct {
	Role         string `json:"role,omitempty"`
	IsSuperadmin bool   `json:"is_superadmin"`
	CanManage    bool   `json:"can_manage"`
}

func NewProjectAccess(role string, isSuperadmin bool) ProjectAccess {
	return ProjectAccess{
		Role:         role,
		IsSuperadmin: isSuperadmin,
		CanManage:    isSuperadmin || role == ProjectRoleAdmin,
	}
}

type ProjectDetails struct {
	Project
	Members  []ProjectMember `json:"members"`
	MyAccess ProjectAccess   `json:"my_access"`
}

func ValidateProject(v *validator.Validator, p *Project) {
	v.Check(p.Name != "", "name", "must be provided")
	v.Check(len(p.Name) <= 255, "name", "must not be more than 255 bytes long")
	v.Check(len(p.Description) <= 2000, "description", "must not be more than 2000 bytes long")
	// Room for the longest ZWJ sequences with skin tones, not for free text.
	v.Check(len(p.Emoji) <= 64, "emoji", "must not be more than 64 bytes long")

	if p.StartDate != nil && p.TargetDate != nil {
		v.Check(!p.TargetDate.Before(*p.StartDate), "target_date", "must not be before the start date")
	}
}

type ProjectStore struct {
	db *sql.DB
}

// Create inserts the project and makes its creator the project's admin, in one
// transaction, so a project never exists without an admin.
func (s *ProjectStore) Create(ctx context.Context, p *Project) error {
	query := `
		INSERT INTO projects (name, description, emoji, start_date, target_date, created_by)
		VALUES ($1, $2, $3, $4::date, $5::date, $6)
		RETURNING id, created_at, updated_at, version
	`

	membershipQuery := `
		INSERT INTO project_memberships (project_id, user_id, role)
		VALUES ($1, $2, 'admin')
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	tx, err := s.db.BeginTx(ctx, nil)

	if err != nil {
		return err
	}

	defer tx.Rollback()

	err = tx.QueryRowContext(ctx, query,
		p.Name,
		p.Description,
		p.Emoji,
		p.StartDate,
		p.TargetDate,
		p.CreatedBy,
	).Scan(
		&p.ID,
		&p.CreatedAt,
		&p.UpdatedAt,
		&p.Version,
	)

	if err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, membershipQuery, p.ID, p.CreatedBy); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	p.MyRole = ProjectRoleAdmin

	return nil
}

// ListVisibleTo returns the projects the user may see, each with the user's role
// in it: every project when all is set (the superadmin), otherwise only the ones
// they're in. Keeping the rule here rather than in the handler means there is
// one place to change it.
func (s *ProjectStore) ListVisibleTo(ctx context.Context, userID string, all bool) ([]*Project, error) {
	query := `
		SELECT p.id, p.name, COALESCE(p.description, ''), p.emoji, p.cycles_enabled, p.start_date, p.target_date,
			p.created_by, p.created_at, p.updated_at, p.version, COALESCE(pm.role::text, '')
		FROM projects p
		LEFT JOIN project_memberships pm ON pm.project_id = p.id AND pm.user_id = $1
		WHERE $2 OR pm.user_id IS NOT NULL
		ORDER BY p.created_at DESC, p.id DESC
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	rows, err := s.db.QueryContext(ctx, query, userID, all)

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	projects := []*Project{}

	for rows.Next() {
		var project Project

		err := rows.Scan(
			&project.ID,
			&project.Name,
			&project.Description,
			&project.Emoji,
			&project.CyclesEnabled,
			&project.StartDate,
			&project.TargetDate,
			&project.CreatedBy,
			&project.CreatedAt,
			&project.UpdatedAt,
			&project.Version,
			&project.MyRole,
		)

		if err != nil {
			return nil, err
		}

		projects = append(projects, &project)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return projects, nil
}

// ListSoleActiveAdminOf returns the projects where the user is an admin and no
// other active user is. Deactivating that user leaves these with nobody but the
// superadmin to run them.
func (s *ProjectStore) ListSoleActiveAdminOf(ctx context.Context, userID string) ([]ProjectRef, error) {
	query := `
		SELECT p.id, p.name
		FROM projects p
		JOIN project_memberships pm
			ON pm.project_id = p.id AND pm.user_id = $1 AND pm.role = 'admin'
		WHERE NOT EXISTS (
			SELECT 1 FROM project_memberships other
			JOIN users u ON u.id = other.user_id
			WHERE other.project_id = p.id
			  AND other.role = 'admin'
			  AND other.user_id <> $1
			  AND u.is_active
		)
		ORDER BY p.name, p.id
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	rows, err := s.db.QueryContext(ctx, query, userID)

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	projects := []ProjectRef{}

	for rows.Next() {
		var project ProjectRef

		if err := rows.Scan(&project.ID, &project.Name); err != nil {
			return nil, err
		}

		projects = append(projects, project)
	}

	return projects, rows.Err()
}

func (s *ProjectStore) GetProjectDetails(ctx context.Context, projectID int64) (*ProjectDetails, error) {
	query := `
		SELECT p.id, p.name, COALESCE(p.description, ''), p.emoji, p.cycles_enabled, p.start_date, p.target_date,
			p.created_by, p.created_at, p.updated_at, p.version,
			m_user.id, m_user.name, m_user.email, m_user.is_active, pm.role, pm.created_at
		FROM projects p
		LEFT JOIN project_memberships pm ON p.id = pm.project_id
		LEFT JOIN users m_user ON pm.user_id = m_user.id
		WHERE p.id = $1
		ORDER BY pm.role, pm.created_at, pm.id
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	rows, err := s.db.QueryContext(ctx, query, projectID)

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	var details ProjectDetails
	details.Members = []ProjectMember{}

	projectLoaded := false

	for rows.Next() {
		var (
			memberID, memberName, memberEmail sql.NullString
			memberRole                        sql.NullString
			memberIsActive                    sql.NullBool
			memberJoinedAt                    sql.NullTime
		)

		err := rows.Scan(
			&details.ID,
			&details.Name,
			&details.Description,
			&details.Emoji,
			&details.CyclesEnabled,
			&details.StartDate,
			&details.TargetDate,
			&details.CreatedBy,
			&details.CreatedAt,
			&details.UpdatedAt,
			&details.Version,
			&memberID,
			&memberName,
			&memberEmail,
			&memberIsActive,
			&memberRole,
			&memberJoinedAt,
		)

		if err != nil {
			return nil, err
		}

		projectLoaded = true

		if memberID.Valid {
			details.Members = append(details.Members, ProjectMember{
				UserID:   memberID.String,
				Name:     memberName.String,
				Email:    memberEmail.String,
				IsActive: memberIsActive.Bool,
				Role:     memberRole.String,
				JoinedAt: memberJoinedAt.Time,
			})
		}
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	if !projectLoaded {
		return nil, ErrNotFound
	}

	return &details, nil
}

// Exists is what the access middleware needs for the superadmin, who reaches
// every project without a membership row to prove the project is real.
func (s *ProjectStore) Exists(ctx context.Context, projectID int64) (bool, error) {
	query := `SELECT EXISTS (SELECT 1 FROM projects WHERE id = $1)`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	var exists bool

	err := s.db.QueryRowContext(ctx, query, projectID).Scan(&exists)

	return exists, err
}

func (s *ProjectStore) GetByID(ctx context.Context, projectID int64) (*Project, error) {
	query := `
		SELECT p.id, p.name, COALESCE(p.description, ''), p.emoji, p.cycles_enabled, p.start_date, p.target_date,
			p.created_by, p.created_at, p.updated_at, p.version
		FROM projects p
		WHERE p.id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	var project Project

	err := s.db.QueryRowContext(ctx, query, projectID).Scan(
		&project.ID,
		&project.Name,
		&project.Description,
		&project.Emoji,
		&project.CyclesEnabled,
		&project.StartDate,
		&project.TargetDate,
		&project.CreatedBy,
		&project.CreatedAt,
		&project.UpdatedAt,
		&project.Version,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return &project, nil
}

// Using version make the write atomic against the concurrent update.

func (s *ProjectStore) Update(ctx context.Context, p *Project) error {
	query := `
		UPDATE projects
		SET name = $1,
			description = $2,
			emoji = $3,
			start_date = $4::date,
			target_date = $5::date,
			version = version + 1
		WHERE id = $6 AND version = $7
		RETURNING updated_at, version
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	err := s.db.QueryRowContext(ctx, query,
		p.Name,
		p.Description,
		p.Emoji,
		p.StartDate,
		p.TargetDate,
		p.ID,
		p.Version,
	).Scan(
		&p.UpdatedAt,
		&p.Version,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrEditConflict
		}
		return err
	}

	return nil
}

// SetCyclesEnabled turns cycles on or off. Turning them off is refused while any
// cycle is still open, so disabling never silently changes data; the check and
// the write are one statement, so a cycle created meanwhile can't slip past.
func (s *ProjectStore) SetCyclesEnabled(ctx context.Context, projectID int64, enabled bool) error {
	query := `
		UPDATE projects
		SET cycles_enabled = $2
		WHERE id = $1
		  AND ($2 OR NOT EXISTS (
			SELECT 1 FROM cycles WHERE project_id = $1 AND completed_at IS NULL
		  ))
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	result, err := s.db.ExecContext(ctx, query, projectID, enabled)

	if err != nil {
		return err
	}

	affected, err := result.RowsAffected()

	if err != nil {
		return err
	}

	if affected == 0 {
		exists, err := s.Exists(ctx, projectID)
		if err != nil {
			return err
		}
		if !exists {
			return ErrNotFound
		}
		return ErrOpenCyclesExist
	}

	return nil
}

func (s *ProjectStore) Delete(ctx context.Context, projectID int64) error {
	query := `DELETE FROM projects WHERE id = $1`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	result, err := s.db.ExecContext(ctx, query, projectID)

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
