package store

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

type ProjectCreator struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
}

type Project struct {
	ID          uint64         `json:"id"`
	Name        string         `json:"name"`
	Description string         `json:"description"`
	StartDAte   time.Time      `json:"start_date"`
	TargetDate  time.Time      `json:"target_date"`
	CreatedBy   ProjectCreator `json:"created_by"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

type ProjectMember struct {
	ID       string    `json:"id"`
	Email    string    `json:"email"`
	Name     string    `json:"name"`
	JoinDate time.Time `json:"join_date"`
	Role     string    `json:"role"`
}

type ProjectDetails struct {
	Project
	Members []ProjectMember `json:"members"`
}

type ProjectStore struct {
	db *sql.DB
}

func (s *ProjectStore) Create(ctx context.Context, p *Project) error {

	query := `
		INSERT INTO projects (
			name,
			description,
			start_date,
			target_date,
			created_by
		) VALUES (
			$1,
			$2,
			$3,
			$4,
			$5,
		)
		RETURNING id, name, description, start_date, target_date, created_by, created_at, updated_at
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	err := s.db.QueryRowContext(ctx, query, p.Name, p.Description, p.StartDAte, p.TargetDate, p.CreatedBy.ID).Scan(
		&p.ID,
		&p.Name,
		&p.Description,
		&p.StartDAte,
		&p.TargetDate,
		&p.CreatedAt,
		&p.UpdatedAt,
		&p.CreatedBy.ID,
	)

	if err != nil {
		return err
	}

	return nil
}

func (s *ProjectStore) GetProjectsByUserID(ctx context.Context, userID string) ([]*Project, error) {

	query := `
	SELECT p.id, p.name, p.description, p.start_date, p.target_date, u.id, u.name, u.email, p.created_at, p.updated_at
	FROM projects p
	JOIN project_members m ON p.id = m.project_id
	JOIN users u ON p.created_by = u.id
	WHERE m.user_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	rows, err := s.db.QueryContext(ctx, query, userID)

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
			&project.StartDAte,
			&project.TargetDate,
			&project.CreatedBy.ID,
			&project.CreatedBy.Name,
			&project.CreatedBy.Email,
			&project.CreatedAt,
			&project.UpdatedAt,
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
	SELECT 
		p.id, p.name, p.description, p.start_date, p.target_date, p.created_at, p.updated_at,
		creator.id, creator.name, creator.email,
		m_user.id, m_user.name, m_user.email, pm.created_at, pm.role
	FROM projects p
	JOIN users creator ON p.created_by = creator.id
	LEFT JOIN project_members pm ON p.id = pm.project_id
	LEFT JOIN users m_user ON pm.user_id = m_user.id
	WHERE p.id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	rows, err := s.db.QueryContext(ctx, query, projectID)

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	var details ProjectDetails
	details.Members = make([]ProjectMember, 0)

	projectLoaded := false

	for rows.Next() {
		var (
			memberID, memberName, memberEmail, memberRole sql.NullString
			memberJoinDate                                sql.NullTime
		)

		err := rows.Scan(
			&details.ID,
			&details.Name,
			&details.Description,
			&details.StartDAte,
			&details.TargetDate,
			&details.CreatedAt,
			&details.UpdatedAt,
			&details.CreatedBy.ID,
			&details.CreatedBy.Name,
			&details.CreatedBy.Email,
			&memberID,
			&memberName,
			&memberEmail,
			&memberJoinDate,
			&memberRole,
		)

		if err != nil {
			return nil, err
		}

		projectLoaded = true

		if memberID.Valid {
			details.Members = append(details.Members, ProjectMember{
				ID:       memberID.String,
				Name:     memberName.String,
				JoinDate: memberJoinDate.Time,
				Role:     memberRole.String,
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

func (s *ProjectStore) Update(ctx context.Context, projectID int64, input *Project) (*Project, error) {
	query := `
        UPDATE projects
        SET 
            name = $1,
            description = $2,
            start_date = $3,
            target_date = $4
        WHERE id = $5
        RETURNING id, name, description, start_date, target_date, created_by, created_at, updated_at
    `

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	err := s.db.QueryRowContext(ctx, query,
		input.Name,
		input.Description,
		input.StartDAte,
		input.TargetDate,
		projectID,
	).Scan(
		&input.ID,
		&input.Name,
		&input.Description,
		&input.StartDAte,
		&input.TargetDate,
		&input.CreatedBy.ID,
		&input.CreatedAt,
		&input.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return input, nil
}

func (s *ProjectStore) Delete(ctx context.Context, projectID int64) error {
	query := `
		DELETE from projects WHERE id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	rows, err := s.db.ExecContext(ctx, query, projectID)

	if err != nil {
		return err
	}

	rowsAffected, err := rows.RowsAffected()

	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return ErrNotFound
	}

	return err
}
