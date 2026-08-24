package store

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

var QueryTimeOutDuration = 3 * time.Second

var (
	ErrNotFound     = errors.New("resource not found")
	ErrEditConflict = errors.New("edit conflict, please retry")
)

type Storage struct {
	Users interface {
		Create(context.Context, *User) error
		GetById(context.Context, string) (*User, error)
		GetByEmail(context.Context, string) (*User, error)
	}

	Projects interface {
		Create(context.Context, *Project) error
		GetByID(ctx context.Context, projectID int64) (*Project, error)
		GetProjectDetails(ctx context.Context, projectID int64) (*ProjectDetails, error)
		GetProjectsByUserID(ctx context.Context, userID string) ([]*Project, error)
		Update(context.Context, *Project) error
		Delete(ctx context.Context, projectID int64) error
	}
}

func NewStorage(db *sql.DB) Storage {
	return Storage{
		Users:    &UserStore{db},
		Projects: &ProjectStore{db},
	}
}
