package store

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/sudarshanpokhrell/trackforge/internal/validator"
)

type Project struct {
	ID          int64      `json:"id"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	StartDate   *time.Time `json:"start_date"`
	TargetDate  *time.Time `json:"target_date"`
	CreatedBy   string     `json:"created_by"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	Version     int32      `json:"version"`
}

type ProjectMember struct {
	UserID   string    `json:"user_id"`
	Name     string    `json:"name"`
	Email    string    `json:"email"`
	IsActive bool      `json:"is_active"`
	JoinedAt time.Time `json:"joined_at"`
}

// ProjectAccess is what the caller may do with the project. It is per-request,
// so the handler fills it in from the middleware's decision.
type ProjectAccess struct {
	IsAdmin  bool `json:"is_admin"`
	IsMember bool `json:"is_member"`
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

	if p.StartDate != nil && p.TargetDate != nil {
		v.Check(!p.TargetDate.Before(*p.StartDate), "target_date", "must not be before the start date")
	}
}

type ProjectStore struct {
	db *sql.DB
}

// Create inserts the project and nothing else. The creator is an admin, who sees
// every project anyway, so adding them as a member would only get in the way of
// the member list meaning "who works on this".
func (s *ProjectStore) Create(ctx context.Context, p *Project) error {
	query := `
		INSERT INTO projects (name, description, start_date, target_date, created_by)
		VALUES ($1, $2, $3::date, $4::date, $5)
		RETURNING id, created_at, updated_at, version
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	return s.db.QueryRowContext(ctx, query,
		p.Name,
		p.Description,
		p.StartDate,
		p.TargetDate,
		p.CreatedBy,
	).Scan(
		&p.ID,
		&p.CreatedAt,
		&p.UpdatedAt,
		&p.Version,
	)
}

// ListVisibleTo returns the projects the user may see: every project for an
// admin or the superadmin, and only their own for a member. Keeping the rule
// here rather than in the handler means there is one place to change it.
func (s *ProjectStore) ListVisibleTo(ctx context.Context, userID string, all bool) ([]*Project, error) {
	query := `
		SELECT p.id, p.name, COALESCE(p.description, ''), p.start_date, p.target_date,
			p.created_by, p.created_at, p.updated_at, p.version
		FROM projects p
		WHERE $2
		   OR EXISTS (
			SELECT 1 FROM project_memberships pm
			WHERE pm.project_id = p.id AND pm.user_id = $1
		  )
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
			&project.StartDate,
			&project.TargetDate,
			&project.CreatedBy,
			&project.CreatedAt,
			&project.UpdatedAt,
			&project.Version,
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

func (s *ProjectStore) GetProjectDetails(ctx context.Context, projectID int64) (*ProjectDetails, error) {
	query := `
		SELECT p.id, p.name, COALESCE(p.description, ''), p.start_date, p.target_date,
			p.created_by, p.created_at, p.updated_at, p.version,
			m_user.id, m_user.name, m_user.email, m_user.is_active, pm.created_at
		FROM projects p
		LEFT JOIN project_memberships pm ON p.id = pm.project_id
		LEFT JOIN users m_user ON pm.user_id = m_user.id
		WHERE p.id = $1
		ORDER BY pm.created_at, pm.id
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
			memberIsActive                    sql.NullBool
			memberJoinedAt                    sql.NullTime
		)

		err := rows.Scan(
			&details.ID,
			&details.Name,
			&details.Description,
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

// Exists is what the access middleware needs for an admin, who reaches every
// project without a membership row to prove the project is real.
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
		SELECT p.id, p.name, COALESCE(p.description, ''), p.start_date, p.target_date,
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
			start_date = $3::date,
			target_date = $4::date,
			version = version + 1
		WHERE id = $5 AND version = $6
		RETURNING updated_at, version
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	err := s.db.QueryRowContext(ctx, query,
		p.Name,
		p.Description,
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
